import type { MechanismDocument, Body, Joint, Drive, Vec2, Anchor } from './types';
import { GROUND_ID } from './types';

let _seq = 0;
export function uid(prefix: string): string {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createEmptyDocument(name = 'Nový koncept'): MechanismDocument {
  const t = nowIso();
  return {
    schemaVersion: 1,
    meta: { name, createdAt: t, updatedAt: t, locale: 'cs' },
    viewport: { center: { x: 0, y: 0 }, zoom: 1 },
    bodies: [],
    joints: [],
    drives: [],
    playback: { durationSec: 2, loop: true },
  };
}

export function cloneDocument(doc: MechanismDocument): MechanismDocument {
  return JSON.parse(JSON.stringify(doc)) as MechanismDocument;
}

export function serializeDocument(doc: MechanismDocument): string {
  const copy = cloneDocument(doc);
  copy.meta.updatedAt = nowIso();
  return JSON.stringify(copy, null, 2);
}

export function parseDocument(json: string): MechanismDocument {
  const raw = JSON.parse(json) as MechanismDocument;
  if (raw.schemaVersion !== 1) {
    throw new Error(`Nepodporovaná schemaVersion: ${String((raw as { schemaVersion?: number }).schemaVersion)}`);
  }
  if (!Array.isArray(raw.bodies) || !Array.isArray(raw.joints) || !Array.isArray(raw.drives)) {
    throw new Error('Neplatný dokument: chybí bodies/joints/drives');
  }
  return raw;
}

export function touchMeta(doc: MechanismDocument): void {
  doc.meta.updatedAt = nowIso();
}

/** Resolve anchor to world position in rest pose */
export function resolveAnchor(
  doc: MechanismDocument,
  bodyId: string,
  anchor: Anchor,
): Vec2 {
  if (bodyId === GROUND_ID) {
    if ('x' in anchor && 'y' in anchor) return { x: anchor.x, y: anchor.y };
    return { x: 0, y: 0 };
  }
  const body = doc.bodies.find((b) => b.id === bodyId);
  if (!body) return { x: 0, y: 0 };
  if ('pointIndex' in anchor) {
    const p = body.points[anchor.pointIndex];
    return p ? { ...p } : { ...body.points[0] };
  }
  return { x: anchor.x, y: anchor.y };
}

export function bodyLength(body: Body): number {
  if (body.points.length < 2) return 0;
  let len = 0;
  for (let i = 1; i < body.points.length; i++) {
    const a = body.points[i - 1];
    const b = body.points[i];
    len += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return len;
}

export function findBody(doc: MechanismDocument, id: string): Body | undefined {
  return doc.bodies.find((b) => b.id === id);
}

export function findJoint(doc: MechanismDocument, id: string): Joint | undefined {
  return doc.joints.find((j) => j.id === id);
}

export function findDriveForJoint(doc: MechanismDocument, jointId: string): Drive | undefined {
  return doc.drives.find((d) => d.jointId === jointId);
}

export function addBody(doc: MechanismDocument, body: Body): void {
  doc.bodies.push(body);
  touchMeta(doc);
}

export function addJoint(doc: MechanismDocument, joint: Joint): void {
  doc.joints.push(joint);
  touchMeta(doc);
}

export function addDrive(doc: MechanismDocument, drive: Drive): void {
  doc.drives.push(drive);
  touchMeta(doc);
}

export function removeBody(doc: MechanismDocument, id: string): void {
  doc.bodies = doc.bodies.filter((b) => b.id !== id);
  const goneJoints = new Set(
    doc.joints.filter((j) => j.bodyA === id || j.bodyB === id).map((j) => j.id),
  );
  doc.joints = doc.joints.filter((j) => !goneJoints.has(j.id));
  doc.drives = doc.drives.filter((d) => !goneJoints.has(d.jointId));
  touchMeta(doc);
}

export function removeJoint(doc: MechanismDocument, id: string): void {
  doc.joints = doc.joints.filter((j) => j.id !== id);
  doc.drives = doc.drives.filter((d) => d.jointId !== id);
  touchMeta(doc);
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function mid(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
