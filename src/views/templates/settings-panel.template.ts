export function getSettingsPanelHtml(): string {
  const isMac = process.platform === "darwin";

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settings</title>
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
            background-color: var(--vscode-panel-background);
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

        /* Reset button styling */
        #reset-btn {
            padding: 10px 18px;
            font-weight: 600;
            border-radius: 6px;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 150px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-right: 10px;
            position: relative;
            overflow: hidden;
            border: none;
        }
        
        #reset-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
            filter: brightness(1.1);
        }
        
        #reset-btn:active {
            transform: translateY(1px);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        
        #reset-btn::before {
            content: "↺";
            margin-right: 8px;
            font-size: 16px;
            font-weight: bold;
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
            flex-direction: column;
            margin-bottom: 20px;
            width: 100%;
        }

        @media (min-width: 400px) {
            .row {
                flex-direction: row;
                align-items: center;
                margin-bottom: 10px;
            }
        }

        .command-name {
            font-weight: 500;
            padding-right: 10px;
            margin-bottom: 8px;
            word-break: break-word;
        }

        @media (min-width: 400px) {
            .command-name {
                flex: 0 0 250px;
                margin-bottom: 0;
            }
        }

        .keybind-input {
            width: 100%;
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
            display: inline-flex;
            align-items: center;
            white-space: nowrap;
            overflow-x: auto;
            max-width: 100%;
            scrollbar-width: thin;
        }

        .keybind-display:hover {
            border-color: var(--vscode-focusBorder);
        }

        .keybind-display.active {
            border-color: var(--vscode-focusBorder);
            outline: 1px solid var(--vscode-focusBorder);
        }

        .keybind-display::-webkit-scrollbar {
            height: 4px;
        }

        .keybind-display::-webkit-scrollbar-track {
            background: transparent;
        }

        .keybind-display::-webkit-scrollbar-thumb {
            background-color: var(--vscode-scrollbarSlider-background);
            border-radius: 2px;
        }

        .keybind-display::-webkit-scrollbar-thumb:hover {
            background-color: var(--vscode-scrollbarSlider-hoverBackground);
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
            white-space: nowrap;
        }

        .keybind-display kbd:first-child {
            margin-left: 0;
        }

        .keybind-display kbd:last-child {
            margin-right: 0;
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
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: center;
        }

        .accessibility-info {
            background-color: var(--vscode-editorInfo-background);
            border-left: 4px solid var(--vscode-infoTextForeground, #75beff);
            padding: 10px;
            margin: 1rem 0;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .command-description {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 10px;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        /* Notification styles */
        .notification {
            padding: 10px 15px;
            margin: 10px 0;
            border-left: 4px solid;
            animation: fadeIn 0.3s ease-in-out;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .notification.error {
            background-color: var(--vscode-errorBackground, rgba(255, 0, 0, 0.1));
            border-left-color: var(--vscode-errorBorder, #f14c4c);
            color: var(--vscode-errorForeground, #f14c4c);
        }

        .notification.info {
            background-color: var(--vscode-infoBackground, rgba(100, 150, 255, 0.1));
            border-left-color: var(--vscode-infoBorder, #75beff);
            color: var(--vscode-infoForeground, #75beff);
        }

        .notification.warning {
            background-color: var(--vscode-warningBackground, rgba(255, 200, 0, 0.1));
            border-left-color: var(--vscode-warningBorder, #cca700);
            color: var(--vscode-warningForeground, #cca700);
        }

        .notification .close-btn {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            padding: 0 5px;
            margin: 0;
            font-size: 1.2em;
            line-height: 1;
        }

        .notification .close-btn:hover {
            opacity: 0.8;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        #notifications-container {
            position: sticky;
            top: 0;
            z-index: 100;
        }

        #reset-btn {
            width: 100%;
            max-width: 200px;
            margin: 0 auto;
        }

        /* Log Filter Styles */
        .log-filters {
            margin: 2rem 0;
            padding: 1rem;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }

        .log-filters h2 {
            margin-top: 0;
            margin-bottom: 1rem;
            font-size: 1.1em;
            font-weight: 500;
        }

        .filter-group {
            margin-bottom: 1.5rem;
        }

        .filter-group:last-child {
            margin-bottom: 0;
        }

        .filter-group h3 {
            margin: 0 0 0.5rem 0;
            font-size: 1em;
            font-weight: 400;
            color: var(--vscode-foreground);
        }

        .filter-options {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
        }

        .filter-option {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .filter-option input[type="checkbox"] {
            margin: 0;
        }

        .filter-option label {
            user-select: none;
            cursor: pointer;
        }

        .filter-description {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            margin-top: 0.25rem;
            margin-bottom: 0.75rem;
        }
    </style>
</head>
<body>
    <h1>Settings</h1>
    
    <div id="notifications-container"></div>

    <div class="log-filters">
        <h2>Log Filtering</h2>
        
        <div class="filter-group">
            <h3>Console Logs</h3>
            <div class="filter-description">Select which console log types to collect and send</div>
            <div class="filter-options">
                <div class="filter-option">
                    <input type="checkbox" id="log-info" checked>
                    <label for="log-info">Info</label>
                </div>
                <div class="filter-option">
                    <input type="checkbox" id="log-warn" checked>
                    <label for="log-warn">Warning</label>
                </div>
                <div class="filter-option">
                    <input type="checkbox" id="log-error" checked>
                    <label for="log-error">Error</label>
                </div>
                <div class="filter-option">
                    <input type="checkbox" id="log-debug" checked>
                    <label for="log-debug">Debug</label>
                </div>
                <div class="filter-option">
                    <input type="checkbox" id="log-log" checked>
                    <label for="log-log">Log</label>
                </div>
            </div>
        </div>

        <div class="filter-group">
            <h3>Network Requests</h3>
            <div class="filter-description">Configure network request logging</div>
            <div class="filter-options">
                <div class="filter-option">
                    <input type="checkbox" id="network-enabled" checked>
                    <label for="network-enabled">Enable Network Logging</label>
                </div>
                <div class="filter-option">
                    <input type="checkbox" id="network-errors-only">
                    <label for="network-errors-only">Only Log Errors (4xx/5xx)</label>
                </div>
            </div>
        </div>
    </div>
    
    <div class="accessibility-info">
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
            
            // Request keybindings and settings on load
            vscode.postMessage({ command: 'getKeybindings' });
            vscode.postMessage({ command: 'getLogFilters' });
            
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
            
            // Handle log filter changes
            document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    const filters = {
                        console: {
                            info: document.getElementById('log-info').checked,
                            warn: document.getElementById('log-warn').checked,
                            error: document.getElementById('log-error').checked,
                            debug: document.getElementById('log-debug').checked,
                            log: document.getElementById('log-log').checked
                        },
                        network: {
                            enabled: document.getElementById('network-enabled').checked,
                            errorsOnly: document.getElementById('network-errors-only').checked
                        }
                    };
                    
                    vscode.postMessage({
                        command: 'updateLogFilters',
                        filters: filters
                    });
                });
            });

            // Handle messages from the extension
            window.addEventListener('message', event => {
                const message = event.data;
                
                switch (message.command) {
                    case 'updateKeybindings':
                        keybindings = message.keybindings;
                        renderKeybindings();
                        break;
                    case 'updateLogFilters':
                        const filters = message.filters;
                        document.getElementById('log-info').checked = filters.console.info;
                        document.getElementById('log-warn').checked = filters.console.warn;
                        document.getElementById('log-error').checked = filters.console.error;
                        document.getElementById('log-debug').checked = filters.console.debug;
                        document.getElementById('log-log').checked = filters.console.log;
                        document.getElementById('network-enabled').checked = filters.network.enabled;
                        document.getElementById('network-errors-only').checked = filters.network.errorsOnly;
                        break;
                    case 'showNotification':
                        showNotification(message.type, message.message);
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
                // If we're already capturing on another element, finish that capture first
                if (currentlyCapturing && currentlyCapturing !== this) {
                    // Save current element to apply capture to after finishing previous one
                    const nextElement = this;
                    
                    // Get data for current capture
                    const prevCommandId = currentlyCapturing.dataset.command;
                    const prevElement = currentlyCapturing;
                    
                    // First cancel existing capture
                    const existingKeybind = keybindings.find(kb => kb.command === prevCommandId);
                    const keybindValue = isMac ? existingKeybind?.mac : existingKeybind?.key;
                    
                    // Reset UI for previous element
                    prevElement.classList.remove('active');
                    if (keybindValue) {
                        prevElement.innerHTML = formatKeybindDisplay(keybindValue);
                    } else {
                        prevElement.innerHTML = '<span class="keybind-placeholder">Click to set keybinding</span>';
                    }
                    
                    // Clean up previous event listeners
                    window.removeEventListener('keydown', currentlyCapturing._captureKey, true);
                    window.removeEventListener('keyup', currentlyCapturing._preventEvent, true);
                    window.removeEventListener('keypress', currentlyCapturing._preventEvent, true);
                    window.removeEventListener('click', currentlyCapturing._handleOutsideClick);
                    
                    // Reset state
                    currentlyCapturing = null;
                    
                    // Now continue with new element
                    setTimeout(() => {
                        activateKeybindCapture.call(nextElement, e);
                    }, 0);
                    return;
                }
                
                // Proceed with normal activation
                const el = this;
                const commandId = el.dataset.command;
                el.classList.add('active');
                el.innerHTML = '<span class="keybind-placeholder">Press keybinding...</span>';
                currentlyCapturing = el;
                
                // Focus handling to ensure we can capture key events
                el.focus();

                function preventEvent(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
                
                function captureKey(e) {
                    // Always prevent default and stop propagation first
                    preventEvent(e);

                    if (e.key === 'Escape') {
                        // Cancel keybind capture and restore original content
                        finishCapture(true);
                        return;
                    }
                    
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
                    
                    // Update display immediately
                    el.innerHTML = formatKeybindDisplay(keybind);
                    
                    // Send update to backend
                    updateKeybinding(commandId, keybind);
                    
                    // Finish capture
                    finishCapture(false);
                }
                
                // Handle clicks outside the keybinding input
                function handleOutsideClick(e) {
                    // If the click is outside the current capturing element
                    if (currentlyCapturing && !currentlyCapturing.contains(e.target)) {
                        finishCapture(true); // Cancel the capture
                    }
                }
                
                // Store references to the event handlers on the element for later removal
                el._preventEvent = preventEvent;
                el._captureKey = captureKey;
                el._handleOutsideClick = handleOutsideClick;
                
                function finishCapture(canceled = false) {
                    el.classList.remove('active');
                    
                    // If canceled, restore the previous keybinding
                    if (canceled) {
                        const existingKeybind = keybindings.find(kb => kb.command === commandId);
                        const keybindValue = isMac ? existingKeybind?.mac : existingKeybind?.key;
                        
                        if (keybindValue) {
                            el.innerHTML = formatKeybindDisplay(keybindValue);
                        } else {
                            el.innerHTML = '<span class="keybind-placeholder">Click to set keybinding</span>';
                        }
                    }
                    
                    // Remove all event listeners
                    window.removeEventListener('keydown', captureKey, true);
                    window.removeEventListener('keyup', preventEvent, true);
                    window.removeEventListener('keypress', preventEvent, true);
                    window.removeEventListener('click', handleOutsideClick);
                    
                    // Remove focus
                    el.blur();
                    
                    // Reset currentlyCapturing
                    currentlyCapturing = null;
                }
                
                // Add event listeners in capture phase (true parameter)
                window.addEventListener('keydown', captureKey, true);
                window.addEventListener('keyup', preventEvent, true);
                window.addEventListener('keypress', preventEvent, true);
                
                // Add click listener to handle clicks outside the element
                // Use setTimeout to ensure this click event finishes first
                setTimeout(() => {
                    window.addEventListener('click', handleOutsideClick);
                }, 0);
            }
            
            function updateKeybinding(commandId, keybind) {
                // Get the other platform's keybinding to preserve it
                const existingKeybind = keybindings.find(k => k.command === commandId);
                const otherPlatformKeybind = isMac ? existingKeybind?.key : existingKeybind?.mac;
                
                // For debugging: log the data being sent
                console.log('Sending keybinding update:', {
                    command: commandId,
                    key: isMac ? otherPlatformKeybind : keybind,
                    mac: isMac ? keybind : otherPlatformKeybind
                });
                
                vscode.postMessage({
                    command: 'updateKeybinding',
                    data: {
                        command: commandId,
                        key: isMac ? otherPlatformKeybind : keybind,
                        mac: isMac ? keybind : otherPlatformKeybind
                    }
                });
            }

            // Show notification in the panel
            function showNotification(type, message) {
                const container = document.getElementById('notifications-container');
                
                // Create notification element
                const notification = document.createElement('div');
                notification.className = \`notification \${type}\`;
                
                // Message content
                const messageSpan = document.createElement('span');
                messageSpan.textContent = message;
                notification.appendChild(messageSpan);
                
                // Close button
                const closeBtn = document.createElement('button');
                closeBtn.className = 'close-btn';
                closeBtn.innerHTML = '&times;';
                closeBtn.addEventListener('click', () => {
                    container.removeChild(notification);
                });
                notification.appendChild(closeBtn);
                
                // Add to container
                container.appendChild(notification);
                
                // Auto-remove after 5 seconds
                setTimeout(() => {
                    if (container.contains(notification)) {
                        container.removeChild(notification);
                    }
                }, 5000);
            }
        }());
    </script>
</body>
</html>`;
}
