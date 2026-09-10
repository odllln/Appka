export type TemplateId = 'four-bar' | 'slider-crank';

export class TemplatePicker {
  private el: HTMLElement;
  private backdrop: HTMLElement;

  constructor(root: HTMLElement, onPick: (id: TemplateId) => void) {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'sheet-backdrop';
    this.backdrop.hidden = true;
    this.backdrop.addEventListener('click', () => this.close());

    this.el = document.createElement('div');
    this.el.className = 'template-sheet';
    this.el.hidden = true;

    const title = document.createElement('div');
    title.className = 'sheet-title';
    title.textContent = 'Šablony';
    this.el.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'tpl-grid';

    const items: { id: TemplateId; name: string; desc: string }[] = [
      { id: 'four-bar', name: 'Čtyřkloub', desc: '4-bar + pohon' },
      { id: 'slider-crank', name: 'Slider-crank', desc: 'Klikový mechanismus' },
    ];

    for (const it of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tpl-card';
      btn.innerHTML = `<strong>${it.name}</strong><span>${it.desc}</span>`;
      btn.addEventListener('click', () => {
        onPick(it.id);
        this.close();
      });
      grid.appendChild(btn);
    }
    this.el.appendChild(grid);

    root.appendChild(this.backdrop);
    root.appendChild(this.el);
  }

  open(): void {
    this.backdrop.hidden = false;
    this.el.hidden = false;
  }

  close(): void {
    this.backdrop.hidden = true;
    this.el.hidden = true;
  }
}
