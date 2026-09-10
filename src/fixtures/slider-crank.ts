import type { MechanismDocument } from '../model/types';

export function createSliderCrank(): MechanismDocument {
  const t = new Date().toISOString();
  return {
    schemaVersion: 1,
    meta: {
      name: 'Slider-crank',
      createdAt: t,
      updatedAt: t,
      locale: 'cs',
    },
    viewport: { center: { x: 120, y: 20 }, zoom: 1.2 },
    bodies: [
      {
        id: 'b_crank',
        kind: 'link',
        points: [
          { x: 0, y: 0 },
          { x: 80, y: 0 },
        ],
        lockedLength: true,
      },
      {
        id: 'b_rod',
        kind: 'link',
        points: [
          { x: 80, y: 0 },
          { x: 200, y: 40 },
        ],
        lockedLength: true,
      },
      {
        id: 'b_slider',
        kind: 'link',
        points: [
          { x: 200, y: 40 },
          { x: 240, y: 40 },
        ],
        lockedLength: false,
      },
    ],
    joints: [
      {
        id: 'j_pivot',
        type: 'revolute',
        bodyA: 'ground',
        bodyB: 'b_crank',
        anchorA: { x: 0, y: 0 },
        anchorB: { pointIndex: 0 },
      },
      {
        id: 'j_crank_rod',
        type: 'revolute',
        bodyA: 'b_crank',
        bodyB: 'b_rod',
        anchorA: { pointIndex: 1 },
        anchorB: { pointIndex: 0 },
      },
      {
        id: 'j_rod_slider',
        type: 'revolute',
        bodyA: 'b_rod',
        bodyB: 'b_slider',
        anchorA: { pointIndex: 1 },
        anchorB: { pointIndex: 0 },
      },
      {
        id: 'j_slide',
        type: 'prismatic',
        bodyA: 'ground',
        bodyB: 'b_slider',
        anchorA: { x: 0, y: 40 },
        anchorB: { pointIndex: 0 },
        axis: { x: 1, y: 0 },
      },
    ],
    drives: [
      {
        id: 'd_motor',
        jointId: 'j_pivot',
        mode: 'angular',
        speed: 1.5,
        direction: 1,
        enabled: true,
      },
    ],
    playback: { durationSec: 4, loop: true },
  };
}
