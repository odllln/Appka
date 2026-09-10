import type { MechanismDocument } from '../model/types';
import { serializeDocument } from '../model/document';

export function downloadJson(doc: MechanismDocument): void {
  const json = serializeDocument(doc);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${safeName(doc.meta.name)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function downloadPng(canvas: HTMLCanvasElement, name: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${safeName(name)}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}

function safeName(n: string): string {
  return n.replace(/[^\w\-]+/gi, '_').slice(0, 40) || 'koncept';
}

export function showExportMenu(
  root: HTMLElement,
  onPng: () => void,
  onJson: () => void,
): void {
  const existing = root.querySelector('.export-menu');
  if (existing) existing.remove();
  root.querySelectorAll('.bottom-sheet.export-sheet').forEach((e) => e.remove());

  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop export-menu';
  const sheet = document.createElement('div');
  sheet.className = 'bottom-sheet export-sheet';
  const title = document.createElement('div');
  title.className = 'sheet-title';
  title.textContent = 'Export';
  sheet.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'sheet-grid';

  const png = document.createElement('button');
  png.type = 'button';
  png.className = 'sheet-btn';
  png.textContent = 'PNG obrázek';
  png.addEventListener('click', () => {
    cleanup();
    onPng();
  });

  const json = document.createElement('button');
  json.type = 'button';
  json.className = 'sheet-btn';
  json.textContent = 'JSON model';
  json.addEventListener('click', () => {
    cleanup();
    onJson();
  });

  grid.appendChild(png);
  grid.appendChild(json);
  sheet.appendChild(grid);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'sheet-close';
  close.textContent = 'Zavřít';
  close.addEventListener('click', cleanup);
  sheet.appendChild(close);

  function cleanup() {
    backdrop.remove();
    sheet.remove();
  }

  backdrop.addEventListener('click', cleanup);
  root.appendChild(backdrop);
  root.appendChild(sheet);
}
