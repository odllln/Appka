import type { Body, BodyPose, PoseMap, Vec2, MechanismDocument } from '../model/types';

export function restOrigin(body: Body): Vec2 {
  return { ...body.points[0] };
}

export function restAngle(body: Body): number {
  if (body.points.length < 2) return 0;
  const a = body.points[0];
  const b = body.points[1];
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function identityPoses(doc: MechanismDocument): PoseMap {
  const poses: PoseMap = {};
  for (const body of doc.bodies) {
    poses[body.id] = {
      origin: restOrigin(body),
      angle: restAngle(body),
    };
  }
  return poses;
}

export function transformPoint(restWorld: Vec2, body: Body, pose: BodyPose): Vec2 {
  const o0 = restOrigin(body);
  const a0 = restAngle(body);
  const dx = restWorld.x - o0.x;
  const dy = restWorld.y - o0.y;
  const c0 = Math.cos(-a0);
  const s0 = Math.sin(-a0);
  const lx = dx * c0 - dy * s0;
  const ly = dx * s0 + dy * c0;
  const c = Math.cos(pose.angle);
  const s = Math.sin(pose.angle);
  return {
    x: pose.origin.x + lx * c - ly * s,
    y: pose.origin.y + lx * s + ly * c,
  };
}

export function setPoseFromEndpoints(_body: Body, p0: Vec2, p1: Vec2): BodyPose {
  return {
    origin: { ...p0 },
    angle: Math.atan2(p1.y - p0.y, p1.x - p0.x),
  };
}
