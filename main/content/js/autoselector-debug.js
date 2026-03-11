(() => {
  const toastId = 'xero-auto-selector-click-toast';
  let hideTimer;

  function ensureToast() {
    let toast = document.getElementById(toastId);
    if (toast) {
      return toast;
    }

    toast = document.createElement('div');
    toast.id = toastId;
    toast.style.position = 'fixed';
    toast.style.top = '24px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.padding = '18px 28px';
    toast.style.background = '#ff4d1f';
    toast.style.color = '#ffffff';
    toast.style.border = '4px solid #111111';
    toast.style.borderRadius = '14px';
    toast.style.fontSize = '28px';
    toast.style.fontWeight = '900';
    toast.style.fontFamily = 'Arial, sans-serif';
    toast.style.boxShadow = '0 18px 40px rgba(0, 0, 0, 0.45)';
    toast.style.zIndex = '999999';
    toast.style.pointerEvents = 'none';
    toast.style.letterSpacing = '0.04em';
    toast.style.display = 'none';
    document.body.appendChild(toast);
    return toast;
  }

  function showToast(message) {
    const toast = ensureToast();
    toast.textContent = message;
    toast.style.display = 'block';

    if (hideTimer) {
      clearTimeout(hideTimer);
    }

    hideTimer = setTimeout(() => {
      toast.style.display = 'none';
      hideTimer = undefined;
    }, 2000);
  }

  function isAutoSelectorDialog(node) {
    if (!(node instanceof HTMLElement)) {
      return false;
    }

    if (node.classList.contains('xero-popup-form-edit-dialog')) {
      const topbar = node.querySelector('.xero-popup-form-edit-dialog-topbar');
      if (topbar && topbar.textContent && topbar.textContent.trim() === 'Auto Selector') {
        return true;
      }
    }

    const dialog = node.querySelector('.xero-popup-form-edit-dialog');
    if (dialog instanceof HTMLElement) {
      const topbar = dialog.querySelector('.xero-popup-form-edit-dialog-topbar');
      if (topbar && topbar.textContent && topbar.textContent.trim() === 'Auto Selector') {
        return true;
      }
    }

    return false;
  }

  function describeRect(rect) {
    const left = Math.round(rect.left);
    const top = Math.round(rect.top);
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    return `${width}x${height} @ ${left},${top}`;
  }

  function inspectDialog(dialog) {
    if (!(dialog instanceof HTMLElement)) {
      return;
    }

    const rect = dialog.getBoundingClientRect();
    const offscreen =
      rect.width <= 0 ||
      rect.height <= 0 ||
      rect.right < 0 ||
      rect.bottom < 0 ||
      rect.left > window.innerWidth ||
      rect.top > window.innerHeight;

    dialog.style.outline = '8px solid #32cd32';
    dialog.style.outlineOffset = '4px';
    dialog.style.zIndex = '1000000';

    if (offscreen) {
      dialog.style.position = 'fixed';
      dialog.style.left = '24px';
      dialog.style.top = '24px';
      dialog.style.maxWidth = 'calc(100vw - 48px)';
      dialog.style.maxHeight = 'calc(100vh - 48px)';
      dialog.style.overflow = 'auto';

      const forcedRect = dialog.getBoundingClientRect();
      window.dispatchEvent(
        new CustomEvent('xero:auto-selector-dialog-layout', {
          detail: {
            state: 'forced',
            originalRect: describeRect(rect),
            forcedRect: describeRect(forcedRect),
          },
        })
      );
      showToast(`AUTO SELECTOR FORCED ONSCREEN ${describeRect(forcedRect)}`);
      return;
    }

    window.dispatchEvent(
      new CustomEvent('xero:auto-selector-dialog-layout', {
        detail: {
          state: 'onscreen',
          rect: describeRect(rect),
        },
      })
    );
    showToast(`AUTO SELECTOR RECT ${describeRect(rect)}`);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!isAutoSelectorDialog(node)) {
          continue;
        }

        const dialog =
          node instanceof HTMLElement && node.classList.contains('xero-popup-form-edit-dialog')
            ? node
            : node instanceof HTMLElement
              ? node.querySelector('.xero-popup-form-edit-dialog')
              : null;

        window.dispatchEvent(new CustomEvent('xero:auto-selector-dialog-added'));
        setTimeout(() => inspectDialog(dialog), 150);
        return;
      }
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    }, { once: true });
  }
})();
