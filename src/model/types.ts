/** Data model schemaVersion 1 — mirrors DATA-MODEL.md */

export type Vec2 = { x: number; y: number };

export type BodyKind = 'link' | 'curve';

export type JointType = 'revolute' | 'prismatic' | 'fixed' | 'weld';

export type DriveMode = 'angular' | 'linear';

export type Anchor =
  | { pointIndex: number }
  | { x: number; y: number };

export interface Body {
  id: string;
  kind: BodyKind;
  points: Vec2[];
  lockedLength?: boolean;
}

export interface Joint {
  id: string;
  type: JointType;
  bodyA: string;
  bodyB: string;
  anchorA: Anchor;
  anchorB: Anchor;
  axis?: Vec2;
}

export interface Drive {
  id: string;
  jointId: string;
  mode: DriveMode;
  speed: number;
  direction: 1 | -1;
  enabled: boolean;
}

export interface Meta {
  name: string;
  createdAt: string;
  updatedAt: string;
  locale: string;
}

export interface ViewportState {
  center: Vec2;
  zoom: number;
}

export interface Playback {
  durationSec: number;
  loop: boolean;
}

export interface MechanismDocument {
  schemaVersion: 1;
  meta: Meta;
  viewport?: ViewportState;
  bodies: Body[];
  joints: Joint[];
  drives: Drive[];
  playback?: Playback;
}

/** Runtime pose — not persisted; separate from rest-pose points */
export interface BodyPose {
  origin: Vec2;
  angle: number;
}

export type PoseMap = Record<string, BodyPose>;

export const GROUND_ID = 'ground';

export function isGround(id: string): boolean {
  return id === GROUND_ID;
}
