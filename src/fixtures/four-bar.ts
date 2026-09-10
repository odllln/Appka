import type { MechanismDocument } from '../model/types';

/** Classic 4-bar: ground (fixed pivots) + crank + coupler + rocker */
export function createFourBar(): MechanismDocument {
  const t = new Date().toISOString();
  // Ground pivots A(0,0) and D(160,0)
  // Crank AB = 50, Coupler BC = 120, Rocker CD = 80
  const A = { x: 0, y: 0 };
  const B = { x: 40, y: 30 }; // initial crank tip
  const C = { x: 140, y: 50 };
  const D = { x: 160, y: 0 };

  return {
    schemaVersion: 1,
    meta: {
      name: 'Čtyřkloub (4-bar)',
      createdAt: t,
      updatedAt: t,
      locale: 'cs',
    },
    viewport: { center: { x: 80, y: 20 }, zoom: 1.4 },
    bodies: [
      {
        id: 'b_crank',
        kind: 'link',
        points: [A, B],
        lockedLength: true,
      },
      {
        id: 'b_coupler',
        kind: 'link',
        points: [B, C],
        lockedLength: true,
      },
      {
        id: 'b_rocker',
        kind: 'link',
        points: [C, D],
        lockedLength: true,
      },
    ],
    joints: [
      {
        id: 'j_A',
        type: 'revolute',
        bodyA: 'ground',
        bodyB: 'b_crank',
        anchorA: { x: A.x, y: A.y },
        anchorB: { pointIndex: 0 },
      },
      {
        id: 'j_B',
        type: 'revolute',
        bodyA: 'b_crank',
        bodyB: 'b_coupler',
        anchorA: { pointIndex: 1 },
        anchorB: { pointIndex: 0 },
      },
      {
        id: 'j_C',
        type: 'revolute',
        bodyA: 'b_coupler',
        bodyB: 'b_rocker',
        anchorA: { pointIndex: 1 },
        anchorB: { pointIndex: 0 },
      },
      {
        id: 'j_D',
        type: 'revolute',
        bodyA: 'ground',
        bodyB: 'b_rocker',
        anchorA: { x: D.x, y: D.y },
        anchorB: { pointIndex: 1 },
      },
    ],
    drives: [
      {
        id: 'd_motor',
        jointId: 'j_A',
        mode: 'angular',
        speed: 1.2,
        direction: 1,
        enabled: true,
      },
    ],
    playback: { durationSec: 4, loop: true },
  };
}
