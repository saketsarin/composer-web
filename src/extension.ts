import * as vscode from "vscode";
import { ComposerIntegration } from "./composer/integration";
import { BrowserMonitor } from "./browser/monitor";
import { CommandHandlers } from "./commands";
import { ToastService } from "./utils/toast";
import { SettingsPanel } from "./views/settings-panel";
import { LogFilterManager } from "./config/log-filters";

export function activate(context: vscode.ExtensionContext) {
  const composerIntegration = ComposerIntegration.getInstance(context);
  const browserMonitor = BrowserMonitor.getInstance();
  const commandHandlers = new CommandHandlers(
    browserMonitor,
    composerIntegration
  );
  const toastService = ToastService.getInstance();
  const settingsPanel = SettingsPanel.getInstance();
  const logFilterManager = LogFilterManager.getInstance();

  // Initialize managers
  logFilterManager.initialize(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("web-preview.smartCapture", () =>
      commandHandlers.handleSmartCapture()
    ),
    vscode.commands.registerCommand("web-preview.clearLogs", () =>
      commandHandlers.handleClearLogs()
    ),
    vscode.commands.registerCommand("web-preview.sendLogs", () =>
      commandHandlers.handleSendLogs()
    ),
    vscode.commands.registerCommand("web-preview.sendScreenshot", () =>
      commandHandlers.handleSendScreenshot()
    ),
    vscode.commands.registerCommand("web-preview.openSettings", () =>
      SettingsPanel.show()
    ),
    vscode.window.registerWebviewViewProvider(
      SettingsPanel.viewType,
      settingsPanel
    )
  );

  browserMonitor.onDisconnect(() => {
    toastService.showBrowserDisconnected();
  });
}

export function deactivate() {}
