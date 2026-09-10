import type { MechanismDocument, PoseMap, Vec2 } from '../model/types';
import { bodyLength, resolveAnchor } from '../model/document';
import { identityPoses, setPoseFromEndpoints, restAngle } from './pose';

export type SolveResult = {
  poses: PoseMap;
  ok: boolean;
  message?: string;
  badJoints?: string[];
};

/**
 * Detect template kind from joint/body structure and solve analytically.
 * Falls back to identity if unknown.
 */
export function solveAtTime(doc: MechanismDocument, tSec: number): SolveResult {
  if (isSliderCrank(doc)) return solveSliderCrank(doc, tSec);
  if (isFourBar(doc)) return solveFourBar(doc, tSec);
  return {
    poses: identityPoses(doc),
    ok: false,
    message: 'Simulace jen pro šablony (4-bar / slider-crank)',
  };
}

function isSliderCrank(doc: MechanismDocument): boolean {
  const ids = new Set(doc.bodies.map((b) => b.id));
  return ids.has('b_crank') && ids.has('b_rod') && ids.has('b_slider');
}

function isFourBar(doc: MechanismDocument): boolean {
  const ids = new Set(doc.bodies.map((b) => b.id));
  return ids.has('b_crank') && ids.has('b_coupler') && ids.has('b_rocker');
}

function drivenAngle(doc: MechanismDocument, jointId: string, tSec: number, phi0: number): number {
  const drive = doc.drives.find((d) => d.jointId === jointId && d.enabled);
  if (!drive) return phi0;
  return phi0 + drive.direction * drive.speed * tSec;
}

/** Slider-crank: crank rotates about ground; slider on horizontal axis y=slideY */
function solveSliderCrank(doc: MechanismDocument, tSec: number): SolveResult {
  const crank = doc.bodies.find((b) => b.id === 'b_crank')!;
  const rod = doc.bodies.find((b) => b.id === 'b_rod')!;
  const slider = doc.bodies.find((b) => b.id === 'b_slider')!;

  const pivotJ = doc.joints.find((j) => j.id === 'j_pivot')!;
  const pivot = resolveAnchor(doc, 'ground', pivotJ.anchorA);
  const L1 = bodyLength(crank);
  const L2 = bodyLength(rod);

  const slideJ = doc.joints.find((j) => j.id === 'j_slide');
  const slideY = slideJ && 'y' in slideJ.anchorA ? slideJ.anchorA.y : 40;

  const phi0 = restAngle(crank);
  const phi = drivenAngle(doc, 'j_pivot', tSec, phi0);

  const B: Vec2 = {
    x: pivot.x + L1 * Math.cos(phi),
    y: pivot.y + L1 * Math.sin(phi),
  };

  // Slider point C on line y = slideY: (x - Bx)^2 + (slideY - By)^2 = L2^2
  const dy = slideY - B.y;
  const disc = L2 * L2 - dy * dy;
  if (disc < 0) {
    return {
      poses: identityPoses(doc),
      ok: false,
      message: 'Vazby kolidují (slider mimo dosah)',
      badJoints: ['j_rod_slider', 'j_slide'],
    };
  }
  // Prefer the assembly branch with larger x (open)
  const xC = B.x + Math.sqrt(disc);
  const C: Vec2 = { x: xC, y: slideY };

  const sliderLen = bodyLength(slider);
  const C2: Vec2 = { x: C.x + sliderLen, y: C.y };

  const poses: PoseMap = {
    b_crank: setPoseFromEndpoints(crank, pivot, B),
    b_rod: setPoseFromEndpoints(rod, B, C),
    b_slider: setPoseFromEndpoints(slider, C, C2),
  };
  return { poses, ok: true };
}

/** 4-bar: circle-circle intersection for coupler point C */
function solveFourBar(doc: MechanismDocument, tSec: number): SolveResult {
  const crank = doc.bodies.find((b) => b.id === 'b_crank')!;
  const coupler = doc.bodies.find((b) => b.id === 'b_coupler')!;
  const rocker = doc.bodies.find((b) => b.id === 'b_rocker')!;

  const jA = doc.joints.find((j) => j.id === 'j_A')!;
  const jD = doc.joints.find((j) => j.id === 'j_D')!;
  const A = resolveAnchor(doc, 'ground', jA.anchorA);
  const D = resolveAnchor(doc, 'ground', jD.anchorA);

  const L1 = bodyLength(crank);
  const L2 = bodyLength(coupler);
  const L3 = bodyLength(rocker);

  const phi0 = restAngle(crank);
  const phi = drivenAngle(doc, 'j_A', tSec, phi0);

  const B: Vec2 = {
    x: A.x + L1 * Math.cos(phi),
    y: A.y + L1 * Math.sin(phi),
  };

  const intersections = circleCircle(B, L2, D, L3);
  if (!intersections) {
    return {
      poses: identityPoses(doc),
      ok: false,
      message: 'Vazby kolidují (4-bar bez průsečíku)',
      badJoints: ['j_B', 'j_C'],
    };
  }

  // Pick branch closest to rest coupler tip
  const restC = coupler.points[1];
  const C =
    dist2(intersections[0], restC) <= dist2(intersections[1], restC)
      ? intersections[0]
      : intersections[1];

  const poses: PoseMap = {
    b_crank: setPoseFromEndpoints(crank, A, B),
    b_coupler: setPoseFromEndpoints(coupler, B, C),
    b_rocker: setPoseFromEndpoints(rocker, C, D),
  };
  return { poses, ok: true };
}

function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function circleCircle(
  c0: Vec2,
  r0: number,
  c1: Vec2,
  r1: number,
): [Vec2, Vec2] | null {
  const dx = c1.x - c0.x;
  const dy = c1.y - c0.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-9 || d > r0 + r1 || d < Math.abs(r0 - r1)) return null;
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h2 = r0 * r0 - a * a;
  if (h2 < 0) return null;
  const h = Math.sqrt(h2);
  const xm = c0.x + (a * dx) / d;
  const ym = c0.y + (a * dy) / d;
  const rx = (-dy * h) / d;
  const ry = (dx * h) / d;
  return [
    { x: xm + rx, y: ym + ry },
    { x: xm - rx, y: ym - ry },
  ];
}
