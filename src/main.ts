import './style.css';
import type { MechanismDocument, Vec2, PoseMap, Joint, JointType } from './model/types';
import {
  createEmptyDocument,
  cloneDocument,
  addBody,
  addJoint,
  addDrive,
  removeBody,
  removeJoint,
  findDriveForJoint,
  uid,
  dist,
} from './model/document';
import { HistoryStack } from './model/history';
import { Viewport } from './canvas/viewport';
import { straightenStroke, pathLength, isNearlyStraight } from './canvas/stroke';
import { hitTest, snapToEndpoints } from './canvas/hit';
import { renderScene } from './canvas/render';
import { solveAtTime } from './solver/analytic';
import { Toolbar } from './ui/toolbar';
import { BottomSheet } from './ui/sheet';
import { TemplatePicker } from './ui/templates';
import { Toast } from './ui/toast';
import { downloadJson, downloadPng, showExportMenu } from './ui/export';
import { createFourBar } from './fixtures/four-bar';
import { createSliderCrank } from './fixtures/slider-crank';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = '';
app.className = 'app-root';

const canvas = document.createElement('canvas');
canvas.className = 'main-canvas';
canvas.setAttribute('aria-label', 'Plátno kinematiky');
app.appendChild(canvas);

const scrub = document.createElement('div');
scrub.className = 'scrub-bar';
scrub.hidden = true;
const scrubInput = document.createElement('input');
scrubInput.type = 'range';
scrubInput.min = '0';
scrubInput.max = '1000';
scrubInput.value = '0';
scrubInput.className = 'scrub-input';
scrub.appendChild(scrubInput);
app.appendChild(scrub);

const ctx = canvas.getContext('2d')!;
const vp = new Viewport();
const history = new HistoryStack();

let doc: MechanismDocument = createEmptyDocument();
history.push(doc);

let poses: PoseMap | null = null;
let badJoints = new Set<string>();
let selectedId: string | null = null;
let ink: Vec2[] | null = null;

let playing = false;
let playStart = 0;
let playOffset = 0;
let animId = 0;

const toast = new Toast(app);
const toolbar = new Toolbar(app, onToolbar);
const sheet = new BottomSheet(app, { onAction: onSheetAction });
const templates = new TemplatePicker(app, onTemplate);

const LONG_PRESS_MS = 420;
const SNAP_PX = 18;
const MIN_STROKE = 12;

type PointerMode = 'none' | 'draw' | 'pan' | 'pinch' | 'longpress';
let mode: PointerMode = 'none';
let pointers = new Map<number, { x: number; y: number }>();
let panLast: Vec2 | null = null;
let pinchDist = 0;
let longPressTimer: number | null = null;
let longPressPos: Vec2 | null = null;
let drawMoved = false;

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  vp.resize(w, h);
  draw();
}

function draw(): void {
  renderScene(ctx, vp, doc, poses, ink, badJoints, selectedId);
}

function commit(next: MechanismDocument): void {
  doc = next;
  history.push(doc);
  poses = null;
  badJoints = new Set();
  draw();
}

function onToolbar(action: string): void {
  if (action === 'undo') {
    const prev = history.undo();
    if (prev) {
      doc = prev;
      poses = null;
      stopPlay();
      draw();
      toast.show('Zpět');
    }
    return;
  }
  if (action === 'templates') {
    stopPlay();
    templates.open();
    return;
  }
  if (action === 'play') {
    togglePlay();
    return;
  }
  if (action === 'export') {
    showExportMenu(
      app,
      () => {
        downloadPng(canvas, doc.meta.name);
        toast.show('PNG staženo');
      },
      () => {
        downloadJson(doc);
        toast.show('JSON stažen');
      },
    );
    return;
  }
  if (action === 'clear') {
    stopPlay();
    commit(createEmptyDocument());
    selectedId = null;
    toast.show('Vymazáno');
  }
}

function onTemplate(id: string): void {
  stopPlay();
  const next = id === 'four-bar' ? createFourBar() : createSliderCrank();
  if (next.viewport) vp.applyFromDoc(next.viewport.center, next.viewport.zoom);
  commit(next);
  toast.show(`Šablona: ${next.meta.name}`);
}

function onSheetAction(action: { type: string; jointType?: JointType; enabled?: boolean }): void {
  const target = sheet.getTarget();
  if (action.type === 'close') return;
  if (!target) return;

  if (action.type === 'delete') {
    const next = cloneDocument(doc);
    if (target.kind === 'body') removeBody(next, target.id);
    else if (target.kind === 'joint') removeJoint(next, target.id);
    else if (target.kind === 'endpoint') removeBody(next, target.bodyId);
    selectedId = null;
    commit(next);
    toast.show('Smazáno');
    return;
  }

  if (action.type === 'drive') {
    const next = cloneDocument(doc);
    let jointId: string | null = target.kind === 'joint' ? target.id : null;
    if (!jointId && target.kind === 'endpoint') {
      jointId = ensureJointAtEndpoint(next, target.bodyId, target.pointIndex, 'revolute');
    }
    if (!jointId) {
      toast.show('Vyberte kloub pro pohon');
      return;
    }
    const existing = findDriveForJoint(next, jointId);
    if (existing) {
      existing.enabled = !!action.enabled;
    } else if (action.enabled) {
      addDrive(next, {
        id: uid('d'),
        jointId,
        mode: 'angular',
        speed: 1.2,
        direction: 1,
        enabled: true,
      });
    }
    commit(next);
    toast.show(action.enabled ? 'Pohon zapnut' : 'Pohon vypnut');
    return;
  }

  if (action.type === 'joint' && action.jointType) {
    const next = cloneDocument(doc);
    const jt = action.jointType;
    if (target.kind === 'joint') {
      const j = next.joints.find((x) => x.id === target.id);
      if (j) {
        j.type = jt;
        if (jt === 'prismatic' && !j.axis) j.axis = { x: 1, y: 0 };
        if (jt === 'fixed') {
          j.bodyA = 'ground';
          if (!('x' in j.anchorA)) {
            const body = next.bodies.find((b) => b.id === j.bodyB);
            const p = body?.points[0] ?? { x: 0, y: 0 };
            j.anchorA = { x: p.x, y: p.y };
          }
        }
      }
    } else if (target.kind === 'endpoint') {
      ensureJointAtEndpoint(next, target.bodyId, target.pointIndex, jt);
    } else if (target.kind === 'body') {
      // pin body midpoint-ish to ground as fixed/revolute
      const body = next.bodies.find((b) => b.id === target.id);
      if (body) {
        const p = body.points[0];
        addJoint(next, {
          id: uid('j'),
          type: jt === 'weld' ? 'weld' : jt,
          bodyA: 'ground',
          bodyB: body.id,
          anchorA: { x: p.x, y: p.y },
          anchorB: { pointIndex: 0 },
          axis: jt === 'prismatic' ? { x: 1, y: 0 } : undefined,
        });
      }
    }
    commit(next);
    toast.show(`Vazba: ${labelJoint(jt)}`);
  }
}

function labelJoint(t: JointType): string {
  switch (t) {
    case 'revolute':
      return 'rotační';
    case 'prismatic':
      return 'posuvná';
    case 'fixed':
      return 'zem';
    case 'weld':
      return 'svařeno';
  }
}

function ensureJointAtEndpoint(
  next: MechanismDocument,
  bodyId: string,
  pointIndex: number,
  type: JointType,
): string {
  const body = next.bodies.find((b) => b.id === bodyId);
  if (!body) return '';
  const p = body.points[pointIndex];
  // Find nearby other body endpoint to connect, else ground
  let otherBody = 'ground';
  let otherAnchor: Joint['anchorB'] = { x: p.x, y: p.y };
  for (const b of next.bodies) {
    if (b.id === bodyId) continue;
    for (let i = 0; i < b.points.length; i++) {
      if (dist(b.points[i], p) < 8) {
        otherBody = b.id;
        otherAnchor = { pointIndex: i };
        break;
      }
    }
    if (otherBody !== 'ground') break;
  }
  const id = uid('j');
  addJoint(next, {
    id,
    type,
    bodyA: otherBody,
    bodyB: bodyId,
    anchorA: otherAnchor,
    anchorB: { pointIndex },
    axis: type === 'prismatic' ? { x: 1, y: 0 } : undefined,
  });
  return id;
}

function togglePlay(): void {
  if (playing) {
    stopPlay();
    return;
  }
  const dur = doc.playback?.durationSec ?? 4;
  // Probe solvability — abort before entering play if unsolvable
  const probe = solveAtTime(doc, 0);
  if (!probe.ok) {
    if (probe.message) toast.show(probe.message);
    if (probe.badJoints) badJoints = new Set(probe.badJoints);
    draw();
    return;
  }
  playing = true;
  playStart = performance.now();
  scrub.hidden = false;
  toolbar.setPlaying(true);
  const tick = (now: number) => {
    if (!playing) return;
    const elapsed = playOffset + (now - playStart) / 1000;
    const t = doc.playback?.loop ? elapsed % dur : Math.min(elapsed, dur);
    scrubInput.value = String(Math.floor((t / dur) * 1000));
    const result = solveAtTime(doc, t);
    poses = result.poses;
    badJoints = new Set(result.badJoints ?? []);
    if (!result.ok && result.message) {
      // soft — keep showing last ok-ish
    }
    draw();
    animId = requestAnimationFrame(tick);
  };
  animId = requestAnimationFrame(tick);
}

function stopPlay(): void {
  if (!playing) return;
  playing = false;
  cancelAnimationFrame(animId);
  const dur = doc.playback?.durationSec ?? 4;
  playOffset = (Number(scrubInput.value) / 1000) * dur;
  toolbar.setPlaying(false);
  scrub.hidden = true;
  poses = null;
  badJoints = new Set();
  draw();
}

scrubInput.addEventListener('input', () => {
  const dur = doc.playback?.durationSec ?? 4;
  const t = (Number(scrubInput.value) / 1000) * dur;
  playOffset = t;
  playStart = performance.now();
  const result = solveAtTime(doc, t);
  poses = result.poses;
  badJoints = new Set(result.badJoints ?? []);
  draw();
});

function screenPos(e: PointerEvent): Vec2 {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function clearLongPress(): void {
  if (longPressTimer != null) {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  longPressPos = null;
}

canvas.addEventListener('pointerdown', (e) => {
  if (sheet.isOpen()) return;
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, screenPos(e));

  if (pointers.size === 2) {
    clearLongPress();
    mode = 'pinch';
    ink = null;
    const pts = [...pointers.values()];
    pinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    panLast = {
      x: (pts[0].x + pts[1].x) / 2,
      y: (pts[0].y + pts[1].y) / 2,
    };
    return;
  }

  if (playing) return;

  const s = screenPos(e);
  const world = vp.screenToWorld(s);
  mode = 'draw';
  drawMoved = false;
  ink = [world];
  longPressPos = s;
  longPressTimer = window.setTimeout(() => {
    if (mode !== 'draw' || drawMoved) return;
    mode = 'longpress';
    ink = null;
    const hit = hitTest(doc, world, poses, vp.zoom);
    openSheetForHit(hit, world);
  }, LONG_PRESS_MS);
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  const s = screenPos(e);
  pointers.set(e.pointerId, s);

  if (mode === 'pinch' && pointers.size === 2) {
    const pts = [...pointers.values()];
    const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    if (panLast) {
      vp.panByScreen(mid.x - panLast.x, mid.y - panLast.y);
    }
    if (pinchDist > 0 && d > 0) {
      vp.zoomAt(mid, d / pinchDist);
      pinchDist = d;
    }
    panLast = mid;
    draw();
    return;
  }

  if (mode === 'draw' && ink) {
    if (longPressPos && dist(s, longPressPos) > 8) {
      drawMoved = true;
      clearLongPress();
    }
    ink.push(vp.screenToWorld(s));
    draw();
  }
});

canvas.addEventListener('pointerup', (e) => {
  pointers.delete(e.pointerId);
  clearLongPress();

  if (mode === 'pinch') {
    if (pointers.size < 2) {
      mode = 'none';
      panLast = null;
    }
    return;
  }

  if (mode === 'longpress') {
    mode = 'none';
    return;
  }

  if (mode === 'draw' && ink) {
    finishStroke(ink);
    ink = null;
    mode = 'none';
    draw();
    return;
  }

  mode = 'none';
});

canvas.addEventListener('pointercancel', (e) => {
  pointers.delete(e.pointerId);
  clearLongPress();
  ink = null;
  mode = 'none';
  draw();
});

// Prevent page scroll / pinch-zoom on mobile
canvas.addEventListener(
  'touchstart',
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);

function finishStroke(raw: Vec2[]): void {
  if (pathLength(raw) < MIN_STROKE / vp.zoom) return;
  const cleaned = straightenStroke(raw);
  const straight = isNearlyStraight(raw) || cleaned.length === 2;

  // Snap ends
  const thresh = SNAP_PX / vp.zoom;
  const a = snapToEndpoints(doc, cleaned[0], thresh) ?? cleaned[0];
  const b =
    snapToEndpoints(doc, cleaned[cleaned.length - 1], thresh) ?? cleaned[cleaned.length - 1];
  const points = straight
    ? [a, b]
    : cleaned.map((p, i) => (i === 0 ? a : i === cleaned.length - 1 ? b : p));

  const next = cloneDocument(doc);
  const bodyId = uid('b');
  addBody(next, {
    id: bodyId,
    kind: straight ? 'link' : 'curve',
    points,
    lockedLength: straight,
  });

  // Auto candidate joints at snapped ends
  maybeAutoJoint(next, bodyId, 0, a);
  maybeAutoJoint(next, bodyId, points.length - 1, b);

  commit(next);
  toast.show(straight ? 'Úsečka' : 'Křivka');
}

function maybeAutoJoint(next: MechanismDocument, bodyId: string, pointIndex: number, p: Vec2): void {
  for (const b of next.bodies) {
    if (b.id === bodyId) continue;
    for (let i = 0; i < b.points.length; i++) {
      if (dist(b.points[i], p) < 1e-3) {
        addJoint(next, {
          id: uid('j'),
          type: 'revolute',
          bodyA: b.id,
          bodyB: bodyId,
          anchorA: { pointIndex: i },
          anchorB: { pointIndex },
        });
        return;
      }
    }
  }
}

function openSheetForHit(
  hit: ReturnType<typeof hitTest>,
  world: Vec2,
): void {
  if (!hit) {
    // empty long-press: offer pin at point — create free joint candidate via tiny body? skip
    toast.show('Long-press na člen nebo kloub');
    return;
  }
  if (hit.kind === 'joint') {
    selectedId = hit.joint.id;
    const drive = findDriveForJoint(doc, hit.joint.id);
    sheet.open(
      { kind: 'joint', id: hit.joint.id, label: `Kloub · ${labelJoint(hit.joint.type)}` },
      !!drive?.enabled,
    );
  } else if (hit.kind === 'endpoint') {
    selectedId = hit.body.id;
    sheet.open(
      {
        kind: 'endpoint',
        bodyId: hit.body.id,
        pointIndex: hit.pointIndex,
        label: `Bod · člen`,
      },
      false,
    );
  } else if (hit.kind === 'body') {
    selectedId = hit.body.id;
    sheet.open(
      { kind: 'body', id: hit.body.id, label: `Člen · ${hit.body.kind}` },
      false,
    );
  }
  void world;
  draw();
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

// Ctrl+Z / meta Z
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
    e.preventDefault();
    onToolbar('undo');
  }
});

resize();
toast.show('Nakreslete člen nebo otevřete Šablony');
