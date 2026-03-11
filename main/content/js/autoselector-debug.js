(() => {
  const panelId = 'xero-auto-selector-debug-log';
  const listId = 'xero-auto-selector-debug-log-list';
  const maxEntries = 200;
  let seq = 0;

  function timestamp() {
    const now = new Date();
    const pad = (value, width = 2) => value.toString().padStart(width, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
  }

  function ensurePanel() {
    let panel = document.getElementById(panelId);
    if (panel) {
      return panel;
    }

    panel = document.createElement('div');
    panel.id = panelId;
    panel.style.position = 'fixed';
    panel.style.right = '10px';
    panel.style.bottom = '10px';
    panel.style.width = 'min(760px, calc(100vw - 20px))';
    panel.style.maxHeight = '55vh';
    panel.style.background = 'rgba(7, 11, 18, 0.96)';
    panel.style.color = '#d7e3ff';
    panel.style.border = '2px solid #4e6aa3';
    panel.style.borderRadius = '10px';
    panel.style.boxShadow = '0 18px 40px rgba(0, 0, 0, 0.45)';
    panel.style.zIndex = '999999';
    panel.style.fontFamily = 'Consolas, Menlo, Monaco, monospace';
    panel.style.fontSize = '12px';
    panel.style.lineHeight = '1.35';
    panel.style.pointerEvents = 'none';

    const header = document.createElement('div');
    header.textContent = 'Auto Selector Debug Log';
    header.style.padding = '8px 10px';
    header.style.fontWeight = '700';
    header.style.borderBottom = '1px solid rgba(120, 150, 220, 0.35)';
    header.style.background = 'rgba(25, 40, 74, 0.92)';
    panel.appendChild(header);

    const list = document.createElement('div');
    list.id = listId;
    list.style.padding = '8px 10px';
    list.style.overflowY = 'auto';
    list.style.maxHeight = 'calc(55vh - 40px)';
    list.style.whiteSpace = 'pre-wrap';
    list.style.wordBreak = 'break-word';
    panel.appendChild(list);

    document.body.appendChild(panel);
    return panel;
  }

  function logEvent(message) {
    ensurePanel();
    const list = document.getElementById(listId);
    if (!list) {
      return;
    }

    seq += 1;
    const entry = document.createElement('div');
    entry.textContent = `${String(seq).padStart(4, '0')} ${timestamp()}  ${message}`;
    entry.style.paddingBottom = '2px';
    list.appendChild(entry);

    while (list.childElementCount > maxEntries) {
      list.removeChild(list.firstElementChild);
    }

    list.scrollTop = list.scrollHeight;
  }

  function describeRect(rect) {
    return `${Math.round(rect.width)}x${Math.round(rect.height)} @ ${Math.round(rect.left)},${Math.round(rect.top)}`;
  }

  function truncate(text, max = 80) {
    if (typeof text !== 'string') {
      return '';
    }
    const one = text.replace(/\s+/g, ' ').trim();
    return one.length > max ? `${one.slice(0, max - 3)}...` : one;
  }

  function describeNode(node) {
    if (!(node instanceof Element)) {
      return String(node);
    }

    let part = node.tagName.toLowerCase();
    if (node.id) {
      part += `#${node.id}`;
    }
    if (node.className && typeof node.className === 'string') {
      const classes = node.className.trim().split(/\s+/).filter(Boolean).slice(0, 3);
      if (classes.length > 0) {
        part += `.${classes.join('.')}`;
      }
    }

    const text = truncate(node.textContent || '', 40);
    if (text.length > 0) {
      part += ` text="${text}"`;
    }

    return part;
  }

  function describePath(element, maxDepth = 6) {
    if (!(element instanceof Element)) {
      return 'none';
    }

    const parts = [];
    let current = element;
    let depth = 0;

    while (current && depth < maxDepth) {
      parts.push(describeNode(current));
      current = current.parentElement;
      depth += 1;
    }

    return parts.join(' <- ');
  }

  function dialogTitleFor(element) {
    if (!(element instanceof Element)) {
      return '';
    }

    const dialog = element.matches('.xero-popup-form-edit-dialog')
      ? element
      : element.querySelector('.xero-popup-form-edit-dialog');
    if (!(dialog instanceof Element)) {
      return '';
    }

    const topbar = dialog.querySelector('.xero-popup-form-edit-dialog-topbar');
    return topbar && topbar.textContent ? topbar.textContent.trim() : '';
  }

  function isAutoSelectorButton(node) {
    return node instanceof Element && node.matches('.xero-autoselector-button');
  }

  function isAutoSelectorDialog(node) {
    return node instanceof Element &&
      (node.matches('.xero-popup-form-edit-dialog') || !!node.querySelector('.xero-popup-form-edit-dialog')) &&
      dialogTitleFor(node) === 'Auto Selector';
  }

  function getAutoSelectorDialog(node) {
    if (!(node instanceof Element)) {
      return null;
    }

    if (node.matches('.xero-popup-form-edit-dialog') && dialogTitleFor(node) === 'Auto Selector') {
      return node;
    }

    const found = node.querySelector('.xero-popup-form-edit-dialog');
    if (found instanceof Element && dialogTitleFor(found) === 'Auto Selector') {
      return found;
    }

    return null;
  }

  function logDialogState(dialog, label) {
    if (!(dialog instanceof HTMLElement)) {
      logEvent(`${label}: dialog=none`);
      return;
    }

    const rect = dialog.getBoundingClientRect();
    const style = window.getComputedStyle(dialog);
    const parentPath = describePath(dialog.parentElement);
    logEvent(
      `${label}: connected=${dialog.isConnected} rect=${describeRect(rect)} display=${style.display} visibility=${style.visibility} opacity=${style.opacity} parent=${parentPath}`
    );
  }

  function scheduleDialogProbes(dialog) {
    const delays = [0, 16, 50, 150, 500, 1000];
    for (const delay of delays) {
      window.setTimeout(() => {
        logDialogState(dialog, `dialog-probe+${delay}ms`);
      }, delay);
    }
  }

  function logButtonState(button, label) {
    if (!(button instanceof HTMLElement)) {
      logEvent(`${label}: button=none`);
      return;
    }

    const rect = button.getBoundingClientRect();
    const style = window.getComputedStyle(button);
    logEvent(
      `${label}: rect=${describeRect(rect)} display=${style.display} visibility=${style.visibility} pointerEvents=${style.pointerEvents} text="${truncate(button.textContent || '', 60)}" path=${describePath(button)}`
    );
  }

  function installEventLogging() {
    const eventTypes = ['pointerdown', 'pointerup', 'click'];
    for (const type of eventTypes) {
      document.addEventListener(
        type,
        (event) => {
          const target = event.target;
          if (!(target instanceof Element)) {
            return;
          }

          const button = target.closest('.xero-autoselector-button');
          if (!button) {
            return;
          }

          logButtonState(button, `${type}`);
        },
        true
      );
    }
  }

  function installMutationLogging() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (isAutoSelectorButton(node)) {
            logButtonState(node, 'button-added');
          }

          if (isAutoSelectorDialog(node)) {
            const dialog = getAutoSelectorDialog(node);
            logEvent(`dialog-added target=${describePath(mutation.target)}`);
            logDialogState(dialog, 'dialog-added-state');
            scheduleDialogProbes(dialog);
            continue;
          }

          if (node instanceof Element) {
            const nestedButton = node.querySelector('.xero-autoselector-button');
            if (nestedButton) {
              logButtonState(nestedButton, 'button-added-nested');
            }

            const nestedDialog = getAutoSelectorDialog(node);
            if (nestedDialog) {
              logEvent(`dialog-added-nested target=${describePath(mutation.target)}`);
              logDialogState(nestedDialog, 'dialog-added-nested-state');
              scheduleDialogProbes(nestedDialog);
            }
          }
        }

        for (const node of mutation.removedNodes) {
          if (isAutoSelectorButton(node)) {
            logEvent(`button-removed target=${describePath(mutation.target)} node=${describeNode(node)}`);
          }

          if (isAutoSelectorDialog(node)) {
            logEvent(`dialog-removed target=${describePath(mutation.target)} node=${describeNode(node)}`);
            continue;
          }

          if (node instanceof Element) {
            const nestedButton = node.querySelector('.xero-autoselector-button');
            if (nestedButton) {
              logEvent(`button-removed-nested target=${describePath(mutation.target)} node=${describeNode(nestedButton)}`);
            }

            const nestedDialog = getAutoSelectorDialog(node);
            if (nestedDialog) {
              logEvent(`dialog-removed-nested target=${describePath(mutation.target)} node=${describeNode(nestedDialog)}`);
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    logEvent('mutation-observer-started');
  }

  function installDomMethodLogging() {
    const appendChildOriginal = Node.prototype.appendChild;
    Node.prototype.appendChild = function patchedAppendChild(child) {
      if (isAutoSelectorDialog(child) || isAutoSelectorButton(child)) {
        logEvent(`appendChild parent=${describePath(this)} child=${describeNode(child)}`);
      } else if (child instanceof Element) {
        const nestedDialog = getAutoSelectorDialog(child);
        const nestedButton = child.querySelector('.xero-autoselector-button');
        if (nestedDialog) {
          logEvent(`appendChild-nested-dialog parent=${describePath(this)} child=${describeNode(nestedDialog)}`);
        }
        if (nestedButton) {
          logEvent(`appendChild-nested-button parent=${describePath(this)} child=${describeNode(nestedButton)}`);
        }
      }
      return appendChildOriginal.call(this, child);
    };

    const removeChildOriginal = Node.prototype.removeChild;
    Node.prototype.removeChild = function patchedRemoveChild(child) {
      if (isAutoSelectorDialog(child) || isAutoSelectorButton(child)) {
        logEvent(`removeChild parent=${describePath(this)} child=${describeNode(child)}`);
      } else if (child instanceof Element) {
        const nestedDialog = getAutoSelectorDialog(child);
        const nestedButton = child.querySelector('.xero-autoselector-button');
        if (nestedDialog) {
          logEvent(`removeChild-nested-dialog parent=${describePath(this)} child=${describeNode(nestedDialog)}`);
        }
        if (nestedButton) {
          logEvent(`removeChild-nested-button parent=${describePath(this)} child=${describeNode(nestedButton)}`);
        }
      }
      return removeChildOriginal.call(this, child);
    };

    const removeOriginal = Element.prototype.remove;
    Element.prototype.remove = function patchedRemove() {
      if (isAutoSelectorDialog(this) || isAutoSelectorButton(this)) {
        logEvent(`element.remove path=${describePath(this)}`);
      }
      return removeOriginal.call(this);
    };

    logEvent('dom-method-hooks-installed');
  }

  function installErrorLogging() {
    window.addEventListener('error', (event) => {
      logEvent(`window-error message="${event.message}" file=${event.filename || 'unknown'} line=${event.lineno || 0}:${event.colno || 0}`);
    });

    window.addEventListener('unhandledrejection', (event) => {
      let reason = '';
      if (event.reason instanceof Error) {
        reason = `${event.reason.name}: ${event.reason.message}`;
      } else {
        reason = truncate(String(event.reason), 140);
      }
      logEvent(`unhandledrejection reason="${reason}"`);
    });

    const consoleError = console.error.bind(console);
    console.error = (...args) => {
      logEvent(`console.error ${truncate(args.map((arg) => String(arg)).join(' | '), 180)}`);
      consoleError(...args);
    };

    const consoleWarn = console.warn.bind(console);
    console.warn = (...args) => {
      logEvent(`console.warn ${truncate(args.map((arg) => String(arg)).join(' | '), 180)}`);
      consoleWarn(...args);
    };

    logEvent('error-hooks-installed');
  }

  function scanExistingNodes() {
    const buttons = document.querySelectorAll('.xero-autoselector-button');
    logEvent(`initial-scan buttons=${buttons.length}`);
    buttons.forEach((button, index) => {
      logButtonState(button, `initial-button[${index}]`);
    });

    const dialogs = document.querySelectorAll('.xero-popup-form-edit-dialog');
    let autoSelectorDialogs = 0;
    dialogs.forEach((dialog) => {
      if (dialogTitleFor(dialog) === 'Auto Selector') {
        autoSelectorDialogs += 1;
        logDialogState(dialog, `initial-dialog[${autoSelectorDialogs - 1}]`);
      }
    });
    logEvent(`initial-scan autoSelectorDialogs=${autoSelectorDialogs}`);
  }

  function start() {
    ensurePanel();
    logEvent('debug-script-started');
    installErrorLogging();
    installDomMethodLogging();
    installEventLogging();
    installMutationLogging();
    scanExistingNodes();
  }

  if (document.body) {
    start();
  } else {
    window.addEventListener('DOMContentLoaded', start, { once: true });
  }
})();
