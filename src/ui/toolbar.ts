export type ToolbarAction =
  | 'undo'
  | 'templates'
  | 'play'
  | 'export'
  | 'clear';

export class Toolbar {
  el: HTMLElement;
  private playBtn: HTMLButtonElement;

  constructor(root: HTMLElement, onAction: (a: ToolbarAction) => void) {
    this.el = document.createElement('nav');
    this.el.className = 'toolbar';
    this.el.setAttribute('aria-label', 'Hlavní lišta');

    const mk = (action: ToolbarAction, label: string, cls = ''): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `tb-btn ${cls}`.trim();
      b.dataset.action = action;
      b.textContent = label;
      b.addEventListener('click', () => onAction(action));
      this.el.appendChild(b);
      return b;
    };

    mk('undo', 'Zpět');
    mk('templates', 'Šablony');
    this.playBtn = mk('play', '▶ Play', 'tb-play');
    mk('export', 'Export');
    mk('clear', 'Smazat vše', 'tb-danger');

    root.appendChild(this.el);
  }

  setPlaying(playing: boolean): void {
    this.playBtn.textContent = playing ? '⏸ Pauza' : '▶ Play';
  }
}
