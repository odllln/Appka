import type { MechanismDocument, Vec2, Body, Joint, PoseMap } from '../model/types';
import { resolveAnchor, dist } from '../model/document';
import { transformPoint } from '../solver/pose';

const JOINT_R = 14;
const BODY_HIT = 10;

export type HitResult =
  | { kind: 'joint'; joint: Joint; world: Vec2 }
  | { kind: 'body'; body: Body; world: Vec2 }
  | { kind: 'endpoint'; body: Body; pointIndex: number; world: Vec2 }
  | null;

export function hitTest(
  doc: MechanismDocument,
  world: Vec2,
  poses: PoseMap | null,
  zoom: number,
): HitResult {
  const jointThresh = JOINT_R / zoom;
  const bodyThresh = BODY_HIT / zoom;

  for (const j of doc.joints) {
    const p = jointWorldPos(doc, j, poses);
    if (dist(p, world) <= jointThresh) {
      return { kind: 'joint', joint: j, world: p };
    }
  }

  for (const body of doc.bodies) {
    const pts = posedPoints(body, poses);
    for (let i = 0; i < pts.length; i++) {
      if (dist(pts[i], world) <= jointThresh) {
        return { kind: 'endpoint', body, pointIndex: i, world: pts[i] };
      }
    }
  }

  for (const body of doc.bodies) {
    const pts = posedPoints(body, poses);
    for (let i = 1; i < pts.length; i++) {
      if (segDist(world, pts[i - 1], pts[i]) <= bodyThresh) {
        return { kind: 'body', body, world };
      }
    }
  }

  return null;
}

export function jointWorldPos(
  doc: MechanismDocument,
  j: Joint,
  poses: PoseMap | null,
): Vec2 {
  const preferB = j.bodyB !== 'ground';
  const bodyId = preferB ? j.bodyB : j.bodyA;
  const anchor = preferB ? j.anchorB : j.anchorA;
  const rest = resolveAnchor(doc, bodyId, anchor);
  if (!poses || bodyId === 'ground' || !poses[bodyId]) return rest;
  const body = doc.bodies.find((b) => b.id === bodyId);
  if (!body) return rest;
  return transformPoint(rest, body, poses[bodyId]);
}

function posedPoints(body: Body, poses: PoseMap | null): Vec2[] {
  if (!poses || !poses[body.id]) return body.points;
  const pose = poses[body.id];
  return body.points.map((p) => transformPoint(p, body, pose));
}

function segDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function snapToEndpoints(
  doc: MechanismDocument,
  world: Vec2,
  threshold: number,
  excludeBodyId?: string,
): Vec2 | null {
  let best: Vec2 | null = null;
  let bestD = threshold;
  for (const body of doc.bodies) {
    if (body.id === excludeBodyId) continue;
    for (const p of body.points) {
      const d = dist(p, world);
      if (d < bestD) {
        bestD = d;
        best = { ...p };
      }
    }
  }
  return best;
}
