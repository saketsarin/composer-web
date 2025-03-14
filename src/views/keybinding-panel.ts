import * as vscode from "vscode";
import { KeybindConfig, KeybindingManager } from "../utils/keybinding-manager";
import { ToastService } from "../utils/toast";

export class KeybindingPanel {
  public static readonly viewType = "composer-web.keybindSettings";

  private static instance: KeybindingPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly keybindingManager: KeybindingManager;
  private readonly toastService: ToastService;
  private disposables: vscode.Disposable[] = [];
  private currentKeybindings: KeybindConfig[] = [];

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;
    this.keybindingManager = KeybindingManager.getInstance();
    this.toastService = ToastService.getInstance();
    this.panel.webview.html = this.getWebviewContent();

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "getKeybindings":
            await this.loadKeybindings();
            break;
          case "updateKeybinding":
            await this.updateKeybinding(
              message.data.command,
              message.data.key,
              message.data.mac
            );
            break;
          case "resetToDefault":
            await this.resetToDefault();
            break;
        }
      },
      null,
      this.disposables
    );

    // Reset when the panel is closed
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public static createOrShow(): KeybindingPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (KeybindingPanel.instance) {
      KeybindingPanel.instance.panel.reveal(column);
      return KeybindingPanel.instance;
    }

    const panel = vscode.window.createWebviewPanel(
      KeybindingPanel.viewType,
      "Keybinding Settings",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    KeybindingPanel.instance = new KeybindingPanel(panel);
    return KeybindingPanel.instance;
  }

  /**
   * Load keybindings and send to webview
   */
  private async loadKeybindings(): Promise<void> {
    try {
      const customKeybindings =
        await this.keybindingManager.getCustomKeybindings();

      if (customKeybindings.length > 0) {
        this.currentKeybindings = customKeybindings;
      } else {
        this.currentKeybindings =
          await this.keybindingManager.getDefaultKeybindings();
      }

      this.panel.webview.postMessage({
        command: "updateKeybindings",
        keybindings: this.currentKeybindings,
      });
    } catch (error) {
      console.error("Failed to load keybindings:", error);
      this.toastService.showError("Failed to load keybindings");
    }
  }

  /**
   * Update a keybinding
   */
  private async updateKeybinding(
    command: string,
    key: string,
    mac: string
  ): Promise<void> {
    try {
      const updatedKeybindings = this.currentKeybindings.map((kb) => {
        if (kb.command === command) {
          return { ...kb, key, mac };
        }
        return kb;
      });

      await this.keybindingManager.saveCustomKeybindings(updatedKeybindings);
      this.currentKeybindings = updatedKeybindings;

      this.panel.webview.postMessage({
        command: "updateKeybindings",
        keybindings: this.currentKeybindings,
      });

      this.toastService.showInfo("Keybinding updated successfully");
    } catch (error) {
      console.error("Failed to update keybinding:", error);
      this.toastService.showError("Failed to update keybinding");
    }
  }

  /**
   * Reset keybindings to default
   */
  private async resetToDefault(): Promise<void> {
    try {
      this.currentKeybindings =
        await this.keybindingManager.getDefaultKeybindings();

      await this.keybindingManager.saveCustomKeybindings(
        this.currentKeybindings
      );

      this.panel.webview.postMessage({
        command: "updateKeybindings",
        keybindings: this.currentKeybindings,
      });

      this.toastService.showInfo("Keybindings reset to default");
    } catch (error) {
      console.error("Failed to reset keybindings:", error);
      this.toastService.showError("Failed to reset keybindings");
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    KeybindingPanel.instance = undefined;

    this.panel.dispose();
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  /**
   * Generate the HTML content for the webview
   */
  private getWebviewContent(): string {
    const isMac = process.platform === "darwin";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Keybinding Settings</title>
    <style>
        :root {
            --container-padding: 20px;
            --input-padding-vertical: 6px;
            --input-padding-horizontal: 4px;
            --input-margin-vertical: 4px;
            --input-margin-horizontal: 0;
        }

        body {
            padding: 0 var(--container-padding);
            color: var(--vscode-foreground);
            font-size: var(--vscode-font-size);
            font-weight: var(--vscode-font-weight);
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
        }

        h1 {
            margin-bottom: 1rem;
            font-weight: 400;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 0.5rem;
        }

        ol, ul {
            padding-left: var(--container-padding);
        }

        button {
            border: none;
            padding: var(--input-padding-vertical) var(--input-padding-horizontal);
            text-align: center;
            outline: 1px solid transparent;
            outline-offset: 2px !important;
            color: var(--vscode-button-foreground);
            background: var(--vscode-button-background);
            cursor: pointer;
            border-radius: 4px;
            margin: 0.5rem 0;
        }

        button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        button:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }

        button.secondary {
            color: var(--vscode-button-secondaryForeground);
            background: var(--vscode-button-secondaryBackground);
        }

        button.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        input:not([type='checkbox']), textarea {
            display: block;
            width: 100%;
            border: none;
            font-family: var(--vscode-font-family);
            padding: var(--input-padding-vertical) var(--input-padding-horizontal);
            color: var(--vscode-input-foreground);
            outline-color: var(--vscode-input-border);
            background-color: var(--vscode-input-background);
        }

        input:focus, textarea:focus {
            outline-color: var(--vscode-focusBorder);
        }

        .row {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }

        .command-name {
            flex: 0 0 250px;
            font-weight: 500;
            padding-right: 10px;
        }

        .keybind-input {
            flex: 1;
            position: relative;
        }

        .keybind-display {
            padding: 6px 10px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            min-height: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
        }

        .keybind-display:hover {
            border-color: var(--vscode-focusBorder);
        }

        .keybind-display.active {
            border-color: var(--vscode-focusBorder);
            outline: 1px solid var(--vscode-focusBorder);
        }

        .keybind-display kbd {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 3px;
            box-shadow: 0 1px 0 rgba(0,0,0,0.2);
            color: var(--vscode-foreground);
            display: inline-block;
            font-size: 0.9em;
            font-family: var(--vscode-editor-font-family, monospace);
            line-height: 1;
            padding: 3px 5px;
            margin: 0 2px;
        }

        .keybind-placeholder {
            color: var(--vscode-descriptionForeground);
        }

        .section {
            margin-top: 1.5rem;
        }

        .kbd-info {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 1rem;
        }

        .footer {
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: flex-end;
        }

        .accessibility-info {
            background-color: var(--vscode-editorInfo-background);
            border-left: 4px solid var(--vscode-infoTextForeground, #75beff);
            padding: 10px;
            margin: 1rem 0;
        }

        .command-description {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <h1>Keybinding Settings</h1>
    
    <div class="accessibility-info">
        <p>Press Tab to navigate between keybinding fields. When focused on a keybinding field, press Enter to activate it and then press your desired key combination.</p>
        <p>Press Escape to cancel capturing a keybinding.</p>
    </div>

    <div class="kbd-info">
        <p>You can use the following modifiers: ${
          isMac ? "Command (⌘), Control, Option, Shift" : "Ctrl, Alt, Shift"
        }. Example combinations include ${
      isMac ? "⌘+S, ⌘+Shift+F" : "Ctrl+S, Alt+Shift+F"
    }, etc.</p>
    </div>

    <div id="keybindings-container">
        <div class="loading">Loading keybindings...</div>
    </div>

    <div class="footer">
        <button id="reset-btn" class="secondary">Reset to Default</button>
    </div>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            const isMac = ${isMac};
            
            // Request keybindings on load
            vscode.postMessage({ command: 'getKeybindings' });
            
            // Map from VSCode keybinding format to display format
            const keyDisplayMap = {
                'ctrl': 'Ctrl',
                'shift': 'Shift',
                'alt': isMac ? 'Option' : 'Alt',
                'cmd': '⌘',
                'meta': '⌘',
                'escape': 'Esc',
                'enter': 'Enter',
                'arrowup': '↑',
                'arrowdown': '↓',
                'arrowleft': '←',
                'arrowright': '→',
                'backspace': 'Backspace',
                'delete': 'Delete',
                'tab': 'Tab',
                'capslock': 'CapsLock',
                'space': 'Space',
                ';': ';',
                "'": "'"
            };
            
            // Command descriptions
            const commandDescriptions = {
                'web-preview.smartCapture': 'Connect to a browser tab or capture content from the currently connected tab.',
                'web-preview.clearLogs': 'Clear all collected browser logs.',
                'web-preview.sendLogs': 'Send collected browser logs to Composer.',
                'web-preview.sendScreenshot': 'Capture a screenshot of the connected tab and send it to Composer.'
            };
            
            let currentlyCapturing = null;
            let keybindings = [];
            
            document.getElementById('reset-btn').addEventListener('click', () => {
                vscode.postMessage({ command: 'resetToDefault' });
            });
            
            // Handle messages from the extension
            window.addEventListener('message', event => {
                const message = event.data;
                
                switch (message.command) {
                    case 'updateKeybindings':
                        keybindings = message.keybindings;
                        renderKeybindings();
                        break;
                }
            });
            
            function renderKeybindings() {
                const container = document.getElementById('keybindings-container');
                container.innerHTML = '';
                
                keybindings.forEach(keybind => {
                    const commandId = keybind.command;
                    const keybindValue = isMac ? keybind.mac : keybind.key;
                    
                    // Create command section
                    const section = document.createElement('div');
                    section.className = 'section';
                    
                    // Command name
                    const commandTitle = commandId.split('.').pop();
                    const formattedTitle = commandTitle
                        .replace(/([A-Z])/g, ' $1')
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    
                    // Command description
                    if (commandDescriptions[commandId]) {
                        const descriptionEl = document.createElement('div');
                        descriptionEl.className = 'command-description';
                        descriptionEl.textContent = commandDescriptions[commandId];
                        section.appendChild(descriptionEl);
                    }
                    
                    // Create keybinding row
                    const row = createKeybindRow(formattedTitle, commandId, keybindValue);
                    section.appendChild(row);
                    
                    container.appendChild(section);
                });
                
                // Add event listeners for keybind displays
                document.querySelectorAll('.keybind-display').forEach(el => {
                    el.addEventListener('click', activateKeybindCapture);
                    el.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            activateKeybindCapture.call(this, e);
                        }
                    });
                });
            }
            
            function createKeybindRow(label, commandId, keybind) {
                const row = document.createElement('div');
                row.className = 'row';
                
                // Command name
                const nameEl = document.createElement('div');
                nameEl.className = 'command-name';
                nameEl.textContent = label;
                row.appendChild(nameEl);
                
                // Keybind input
                const keybindContainer = document.createElement('div');
                keybindContainer.className = 'keybind-input';
                
                const keybindDisplay = document.createElement('div');
                keybindDisplay.className = 'keybind-display';
                keybindDisplay.tabIndex = 0;
                keybindDisplay.dataset.command = commandId;
                
                if (keybind) {
                    keybindDisplay.innerHTML = formatKeybindDisplay(keybind);
                } else {
                    keybindDisplay.innerHTML = '<span class="keybind-placeholder">Click to set keybinding</span>';
                }
                
                keybindContainer.appendChild(keybindDisplay);
                row.appendChild(keybindContainer);
                
                return row;
            }
            
            function formatKeybindDisplay(keybind) {
                if (!keybind) return '<span class="keybind-placeholder">Click to set keybinding</span>';
                
                return keybind.split('+')
                    .map(key => key.trim().toLowerCase())
                    .map(key => {
                        const display = keyDisplayMap[key] || key.toUpperCase();
                        return \`<kbd>\${display}</kbd>\`;
                    })
                    .join(' + ');
            }
            
            function activateKeybindCapture(e) {
                // Deactivate any active keybind capture
                if (currentlyCapturing) {
                    currentlyCapturing.classList.remove('active');
                }
                
                const el = this;
                el.classList.add('active');
                el.innerHTML = '<span class="keybind-placeholder">Press keybinding...</span>';
                currentlyCapturing = el;
                
                // Focus handling to ensure we can capture key events
                el.focus();
                
                function captureKey(e) {
                    if (e.key === 'Escape') {
                        // Cancel keybind capture
                        finishCapture();
                        return;
                    }
                    
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Don't allow single modifier keys as keybindings
                    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
                        return;
                    }
                    
                    let keys = [];
                    if (e.ctrlKey) keys.push('ctrl');
                    if (e.altKey) keys.push('alt');
                    if (e.shiftKey) keys.push('shift');
                    if (e.metaKey) keys.push(isMac ? 'cmd' : 'meta');
                    
                    // Add the main key
                    let mainKey = e.key.toLowerCase();
                    
                    // Handle special keys
                    if (mainKey === ' ') mainKey = 'space';
                    if (mainKey === 'arrowup') mainKey = 'up';
                    if (mainKey === 'arrowdown') mainKey = 'down';
                    if (mainKey === 'arrowleft') mainKey = 'left';
                    if (mainKey === 'arrowright') mainKey = 'right';
                    
                    // Don't add the key if it's a modifier we already captured
                    if (!['control', 'alt', 'shift', 'meta'].includes(mainKey)) {
                        keys.push(mainKey);
                    }
                    
                    if (keys.length === 0) return;
                    
                    const keybind = keys.join('+');
                    el.innerHTML = formatKeybindDisplay(keybind);
                    
                    const commandId = el.dataset.command;
                    
                    // Update keybinding
                    updateKeybinding(commandId, keybind);
                    
                    finishCapture();
                }
                
                function finishCapture() {
                    el.classList.remove('active');
                    window.removeEventListener('keydown', captureKey);
                    currentlyCapturing = null;
                }
                
                window.addEventListener('keydown', captureKey);
            }
            
            function updateKeybinding(commandId, keybind) {
                // Get the other platform's keybinding to preserve it
                const existingKeybind = keybindings.find(k => k.command === commandId);
                const otherPlatformKeybind = isMac ? existingKeybind?.key : existingKeybind?.mac;
                
                vscode.postMessage({
                    command: 'updateKeybinding',
                    data: {
                        command: commandId,
                        key: isMac ? otherPlatformKeybind : keybind,
                        mac: isMac ? keybind : otherPlatformKeybind
                    }
                });
            }
        }());
    </script>
</body>
</html>`;
  }
}
