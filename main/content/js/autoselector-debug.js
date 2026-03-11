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

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!isAutoSelectorDialog(node)) {
          continue;
        }

        window.dispatchEvent(new CustomEvent('xero:auto-selector-dialog-added'));
        showToast('AUTO SELECTOR DIALOG ADDED TO DOM');
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
