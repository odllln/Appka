import type { MechanismDocument } from './types';
import { cloneDocument } from './document';

const MAX = 40;

export class HistoryStack {
  private stack: MechanismDocument[] = [];
  private index = -1;

  push(doc: MechanismDocument): void {
    // drop redo
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(cloneDocument(doc));
    if (this.stack.length > MAX) {
      this.stack.shift();
    } else {
      this.index += 1;
    }
    // after shift, index stays at end
    this.index = this.stack.length - 1;
  }

  canUndo(): boolean {
    return this.index > 0;
  }

  canRedo(): boolean {
    return this.index < this.stack.length - 1;
  }

  undo(): MechanismDocument | null {
    if (!this.canUndo()) return null;
    this.index -= 1;
    return cloneDocument(this.stack[this.index]);
  }

  redo(): MechanismDocument | null {
    if (!this.canRedo()) return null;
    this.index += 1;
    return cloneDocument(this.stack[this.index]);
  }

  clear(): void {
    this.stack = [];
    this.index = -1;
  }
}
