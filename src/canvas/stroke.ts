import type { Vec2 } from '../model/types';

const STRAIGHT_ANGLE_DEG = 14; // ~12–15°
const STRAIGHT_CHORD_RATIO = 0.04; // max mid deviation / chord length

export function isNearlyStraight(points: Vec2[]): boolean {
  if (points.length < 2) return true;
  const a = points[0];
  const b = points[points.length - 1];
  const chord = Math.hypot(b.x - a.x, b.y - a.y);
  if (chord < 1e-6) return true;

  // Max distance from chord
  let maxDist = 0;
  for (let i = 1; i < points.length - 1; i++) {
    maxDist = Math.max(maxDist, pointToSegDist(points[i], a, b));
  }
  if (maxDist / chord > STRAIGHT_CHORD_RATIO && maxDist > 6) return false;

  // Cumulative turning angle
  let turn = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const ang1 = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
    const ang2 = Math.atan2(points[i + 1].y - points[i].y, points[i + 1].x - points[i].x);
    let d = ang2 - ang1;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    turn += Math.abs(d);
  }
  const turnDeg = (turn * 180) / Math.PI;
  return turnDeg < STRAIGHT_ANGLE_DEG;
}

export function straightenStroke(points: Vec2[]): Vec2[] {
  if (points.length < 2) return points.map((p) => ({ ...p }));
  if (isNearlyStraight(points)) {
    return [
      { x: points[0].x, y: points[0].y },
      { x: points[points.length - 1].x, y: points[points.length - 1].y },
    ];
  }
  return smoothPolyline(points, 0.35);
}

function pointToSegDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Simple Chaikin-ish / moving average smooth for curves */
export function smoothPolyline(points: Vec2[], amount = 0.3): Vec2[] {
  if (points.length < 3) return points.map((p) => ({ ...p }));
  // resample lightly then average
  const out: Vec2[] = [{ ...points[0] }];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    out.push({
      x: cur.x * (1 - amount) + ((prev.x + next.x) / 2) * amount,
      y: cur.y * (1 - amount) + ((prev.y + next.y) / 2) * amount,
    });
  }
  out.push({ ...points[points.length - 1] });
  // decimate if too dense
  return decimate(out, 4);
}

function decimate(pts: Vec2[], minDist: number): Vec2[] {
  if (pts.length < 3) return pts;
  const res: Vec2[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const last = res[res.length - 1];
    if (Math.hypot(pts[i].x - last.x, pts[i].y - last.y) >= minDist) {
      res.push(pts[i]);
    }
  }
  res.push(pts[pts.length - 1]);
  return res;
}

export function pathLength(points: Vec2[]): number {
  let L = 0;
  for (let i = 1; i < points.length; i++) {
    L += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return L;
}
