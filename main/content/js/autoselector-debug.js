(() => {
  const guardKey = '__xeroAutoSelectorFixInstalled';
  if (window[guardKey]) {
    return;
  }
  window[guardKey] = true;

  function enableDebugPanelInteraction() {
    const panel = document.getElementById('xero-auto-selector-debug-log');
    if (!(panel instanceof HTMLElement)) {
      return;
    }

    panel.style.pointerEvents = 'auto';
    panel.style.userSelect = 'text';
    panel.style.webkitUserSelect = 'text';
    panel.style.overflow = 'hidden';

    const list = document.getElementById('xero-auto-selector-debug-log-list');
    if (list instanceof HTMLElement) {
      list.style.pointerEvents = 'auto';
      list.style.userSelect = 'text';
      list.style.webkitUserSelect = 'text';
      list.style.cursor = 'text';
      list.tabIndex = 0;
      list.setAttribute('role', 'log');
      list.setAttribute('aria-label', 'Auto selector debug log');
    }
  }

  function getDialogTitle(element) {
    if (!(element instanceof Element)) {
      return '';
    }

    const topbar = element.querySelector('.xero-popup-form-edit-dialog-topbar');
    return topbar && topbar.textContent ? topbar.textContent.trim() : '';
  }

  function isAutoSelectorDialog(element) {
    return element instanceof Element &&
      element.classList.contains('xero-popup-form-edit-dialog') &&
      getDialogTitle(element) === 'Auto Selector';
  }

  function preserveDialogsForRelayout(container) {
    if (!(container instanceof Element)) {
      return [];
    }

    const dialogs = Array.from(container.children).filter((child) => isAutoSelectorDialog(child));
    for (const dialog of dialogs) {
      dialog.setAttribute('data-xero-preserved-dialog', 'true');
    }
    return dialogs;
  }

  function restoreDialogsAfterRelayout(container, dialogs) {
    if (!(container instanceof Element) || dialogs.length === 0) {
      return;
    }

    for (const dialog of dialogs) {
      container.appendChild(dialog);
      dialog.removeAttribute('data-xero-preserved-dialog');
    }
  }

  const innerHtmlDescriptor =
    Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML') ||
    Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHTML');

  if (!innerHtmlDescriptor || !innerHtmlDescriptor.get || !innerHtmlDescriptor.set) {
    return;
  }

  Object.defineProperty(Element.prototype, 'innerHTML', {
    configurable: innerHtmlDescriptor.configurable,
    enumerable: innerHtmlDescriptor.enumerable,
    get: innerHtmlDescriptor.get,
    set(value) {
      const shouldPreserve =
        this instanceof Element &&
        this.classList.contains('xero-form-section-scout-page-form') &&
        typeof value === 'string' &&
        value.length === 0;

      const dialogs = shouldPreserve ? preserveDialogsForRelayout(this) : [];
      innerHtmlDescriptor.set.call(this, value);
      restoreDialogsAfterRelayout(this, dialogs);
    },
  });

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', enableDebugPanelInteraction, { once: true });
  } else {
    enableDebugPanelInteraction();
  }
})();
