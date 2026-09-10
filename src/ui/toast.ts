export class Toast {
  private el: HTMLElement;
  private timer: number | null = null;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'toast';
    this.el.hidden = true;
    root.appendChild(this.el);
  }

  show(message: string, ms = 2400): void {
    this.el.textContent = message;
    this.el.hidden = false;
    if (this.timer != null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.el.hidden = true;
      this.timer = null;
    }, ms);
  }
}
