import type { MechanismDocument, PoseMap, Vec2, Body } from '../model/types';
import { Viewport } from './viewport';
import { transformPoint } from '../solver/pose';
import { jointWorldPos } from './hit';

const COLORS = {
  bg: '#0f1419',
  grid: '#1a2332',
  ground: '#3d5a40',
  groundHatch: '#2a3d2c',
  link: '#e8eef7',
  curve: '#9bb0c9',
  joint: '#5b9cff',
  jointFixed: '#7dcea0',
  jointPrismatic: '#f0c14a',
  jointWeld: '#c39bd3',
  drive: '#ff6b6b',
  ink: '#7ec8ff',
  highlight: '#ff8c42',
  groundPin: '#a8d5a2',
};

export function renderScene(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  doc: MechanismDocument,
  poses: PoseMap | null,
  ink: Vec2[] | null,
  badJoints: Set<string>,
  selectedId: string | null,
): void {
  const w = vp.width;
  const h = vp.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, w, h);

  drawGrid(ctx, vp);
  drawGround(ctx, vp);

  for (const body of doc.bodies) {
    const pts = posedPoints(body, poses);
    const screen = pts.map((p) => vp.worldToScreen(p));
    const isSel = selectedId === body.id;
    ctx.beginPath();
    ctx.strokeStyle = body.kind === 'curve' ? COLORS.curve : COLORS.link;
    ctx.lineWidth = isSel ? 4 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (screen.length) {
      ctx.moveTo(screen[0].x, screen[0].y);
      for (let i = 1; i < screen.length; i++) ctx.lineTo(screen[i].x, screen[i].y);
      ctx.stroke();
    }
    for (const s of screen) {
      ctx.beginPath();
      ctx.fillStyle = COLORS.link;
      ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const j of doc.joints) {
    const p = jointWorldPos(doc, j, poses);
    const s = vp.worldToScreen(p);
    const bad = badJoints.has(j.id);
    const isSel = selectedId === j.id;
    let fill = COLORS.joint;
    if (j.type === 'fixed') fill = COLORS.jointFixed;
    if (j.type === 'prismatic') fill = COLORS.jointPrismatic;
    if (j.type === 'weld') fill = COLORS.jointWeld;
    if (bad) fill = COLORS.highlight;

    const drive = doc.drives.find((d) => d.jointId === j.id && d.enabled);
    const r = isSel ? 9 : 7;

    ctx.beginPath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = bad ? COLORS.highlight : '#0a0e14';
    ctx.lineWidth = 2;
    if (j.type === 'prismatic') {
      ctx.fillRect(s.x - r, s.y - r * 0.6, r * 2, r * 1.2);
      ctx.strokeRect(s.x - r, s.y - r * 0.6, r * 2, r * 1.2);
    } else {
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (drive) {
      ctx.beginPath();
      ctx.strokeStyle = COLORS.drive;
      ctx.lineWidth = 2.5;
      ctx.arc(s.x, s.y, r + 5, 0, Math.PI * 1.5);
      ctx.stroke();
    }

    if (j.bodyA === 'ground' || j.bodyB === 'ground') {
      ctx.beginPath();
      ctx.strokeStyle = COLORS.groundPin;
      ctx.lineWidth = 1.5;
      ctx.moveTo(s.x - 10, s.y + 10);
      ctx.lineTo(s.x, s.y + 2);
      ctx.lineTo(s.x + 10, s.y + 10);
      ctx.stroke();
    }
  }

  if (ink && ink.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    const s0 = vp.worldToScreen(ink[0]);
    ctx.moveTo(s0.x, s0.y);
    for (let i = 1; i < ink.length; i++) {
      const s = vp.worldToScreen(ink[i]);
      ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
  }
}

function posedPoints(body: Body, poses: PoseMap | null): Vec2[] {
  if (!poses || !poses[body.id]) return body.points;
  return body.points.map((p) => transformPoint(p, body, poses[body.id]));
}

function drawGrid(ctx: CanvasRenderingContext2D, vp: Viewport): void {
  const worldStep = 40;
  const tl = vp.screenToWorld({ x: 0, y: 0 });
  const br = vp.screenToWorld({ x: vp.width, y: vp.height });
  const x0 = Math.floor(tl.x / worldStep) * worldStep;
  const y0 = Math.floor(tl.y / worldStep) * worldStep;
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = x0; x <= br.x; x += worldStep) {
    const s = vp.worldToScreen({ x, y: 0 });
    ctx.moveTo(s.x, 0);
    ctx.lineTo(s.x, vp.height);
  }
  for (let y = y0; y <= br.y; y += worldStep) {
    const s = vp.worldToScreen({ x: 0, y });
    ctx.moveTo(0, s.y);
    ctx.lineTo(vp.width, s.y);
  }
  ctx.stroke();
}

function drawGround(ctx: CanvasRenderingContext2D, vp: Viewport): void {
  const o = vp.worldToScreen({ x: 0, y: 0 });
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.strokeStyle = COLORS.ground;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-28, 18);
  ctx.lineTo(28, 18);
  ctx.stroke();
  for (let i = -24; i < 28; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 18);
    ctx.lineTo(i - 8, 30);
    ctx.stroke();
  }
  ctx.restore();
}
