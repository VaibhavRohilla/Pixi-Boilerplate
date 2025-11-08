let overlayEl: HTMLDivElement | null = null;

function ensureOverlay(): HTMLDivElement {
  if (overlayEl) return overlayEl;
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.left = '0';
  el.style.top = '0';
  el.style.right = '0';
  el.style.background = 'rgba(180, 0, 0, 0.9)';
  el.style.color = '#fff';
  el.style.zIndex = '99999';
  el.style.fontFamily = 'monospace';
  el.style.fontSize = '12px';
  el.style.lineHeight = '1.5';
  el.style.padding = '10px 12px';
  el.style.display = 'none';
  el.style.whiteSpace = 'pre-wrap';
  document.body.appendChild(el);
  overlayEl = el;
  return el;
}

export function showErrorOverlay(message: string, details?: string) {
  const el = ensureOverlay();
  el.innerText = details ? `${message}\n${details}` : message;
  el.style.display = 'block';
}

export function clearErrorOverlay() {
  if (!overlayEl) return;
  overlayEl.style.display = 'none';
  overlayEl.innerText = '';
}

export function installGlobalErrorOverlay() {
  window.addEventListener('error', (e) => {
    const msg = e?.error?.message || e?.message || 'Unknown error';
    const stack = e?.error?.stack;
    showErrorOverlay(`Error: ${msg}`, stack);
  });
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const reason: any = e.reason;
    const msg = reason?.message || String(reason);
    const stack = reason?.stack;
    showErrorOverlay(`Unhandled rejection: ${msg}`, stack);
  });
}


