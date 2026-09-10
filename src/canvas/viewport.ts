import type { Vec2 } from '../model/types';

/** World ↔ screen transform (pan + zoom). Y grows down in both spaces. */
export class Viewport {
  center: Vec2 = { x: 0, y: 0 };
  zoom = 1;
  width = 1;
  height = 1;

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
  }

  worldToScreen(p: Vec2): Vec2 {
    return {
      x: (p.x - this.center.x) * this.zoom + this.width / 2,
      y: (p.y - this.center.y) * this.zoom + this.height / 2,
    };
  }

  screenToWorld(p: Vec2): Vec2 {
    return {
      x: (p.x - this.width / 2) / this.zoom + this.center.x,
      y: (p.y - this.height / 2) / this.zoom + this.center.y,
    };
  }

  panByScreen(dx: number, dy: number): void {
    this.center.x -= dx / this.zoom;
    this.center.y -= dy / this.zoom;
  }

  zoomAt(screen: Vec2, factor: number): void {
    const before = this.screenToWorld(screen);
    this.zoom = Math.min(8, Math.max(0.25, this.zoom * factor));
    const after = this.screenToWorld(screen);
    this.center.x += before.x - after.x;
    this.center.y += before.y - after.y;
  }

  applyFromDoc(center?: Vec2, zoom?: number): void {
    if (center) this.center = { ...center };
    if (zoom != null) this.zoom = zoom;
  }
}
