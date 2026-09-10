import type { JointType } from '../model/types';

export type SheetAction =
  | { type: 'joint'; jointType: JointType }
  | { type: 'drive'; enabled: boolean }
  | { type: 'delete' }
  | { type: 'close' };

export type SheetTarget =
  | { kind: 'joint'; id: string; label: string }
  | { kind: 'body'; id: string; label: string }
  | { kind: 'endpoint'; bodyId: string; pointIndex: number; label: string };

type SheetCallbacks = {
  onAction: (action: SheetAction) => void;
};

export class BottomSheet {
  private el: HTMLElement;
  private backdrop: HTMLElement;
  private target: SheetTarget | null = null;
  private cbs: SheetCallbacks;

  constructor(root: HTMLElement, cbs: SheetCallbacks) {
    this.cbs = cbs;
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'sheet-backdrop';
    this.backdrop.hidden = true;
    this.backdrop.addEventListener('click', () => this.close());

    this.el = document.createElement('div');
    this.el.className = 'bottom-sheet';
    this.el.hidden = true;
    this.el.setAttribute('role', 'dialog');

    root.appendChild(this.backdrop);
    root.appendChild(this.el);
  }

  open(target: SheetTarget, driveOn: boolean): void {
    this.target = target;
    this.el.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'sheet-title';
    title.textContent = target.label;
    this.el.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'sheet-grid';

    const items: { key: string; label: string; action: SheetAction }[] = [
      { key: 'revolute', label: 'Rotační', action: { type: 'joint', jointType: 'revolute' } },
      { key: 'prismatic', label: 'Posuvná', action: { type: 'joint', jointType: 'prismatic' } },
      { key: 'fixed', label: 'Zem / Pin', action: { type: 'joint', jointType: 'fixed' } },
      { key: 'weld', label: 'Svařeno', action: { type: 'joint', jointType: 'weld' } },
      {
        key: 'drive',
        label: driveOn ? 'Pohon VYP' : 'Pohon ZAP',
        action: { type: 'drive', enabled: !driveOn },
      },
      { key: 'delete', label: 'Smazat', action: { type: 'delete' } },
    ];

    for (const it of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `sheet-btn sheet-${it.key}`;
      btn.innerHTML = `<span class="sheet-ico">${icon(it.key)}</span><span>${it.label}</span>`;
      btn.addEventListener('click', () => {
        this.cbs.onAction(it.action);
        if (it.action.type !== 'drive') this.close();
        else this.open(target, it.action.enabled);
      });
      grid.appendChild(btn);
    }
    this.el.appendChild(grid);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'sheet-close';
    closeBtn.textContent = 'Zavřít';
    closeBtn.addEventListener('click', () => this.close());
    this.el.appendChild(closeBtn);

    this.backdrop.hidden = false;
    this.el.hidden = false;
  }

  close(): void {
    this.backdrop.hidden = true;
    this.el.hidden = true;
    this.target = null;
    this.cbs.onAction({ type: 'close' });
  }

  isOpen(): boolean {
    return !this.el.hidden;
  }

  getTarget(): SheetTarget | null {
    return this.target;
  }
}

function icon(key: string): string {
  switch (key) {
    case 'revolute':
      return '◎';
    case 'prismatic':
      return '▭';
    case 'fixed':
      return '⌖';
    case 'weld':
      return '⬢';
    case 'drive':
      return '⚡';
    case 'delete':
      return '⌫';
    default:
      return '•';
  }
}
