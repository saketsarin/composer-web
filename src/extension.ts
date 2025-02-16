import * as vscode from "vscode";
import { ComposerIntegration } from "./composer/integration";
import { BrowserMonitor } from "./browser/monitor";
import { CommandHandlers } from "./commands";

export function activate(context: vscode.ExtensionContext) {
  const composerIntegration = ComposerIntegration.getInstance(context);
  const browserMonitor = BrowserMonitor.getInstance();
  const commandHandlers = new CommandHandlers(
    browserMonitor,
    composerIntegration
  );

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
    browserMonitor
  );

  browserMonitor.onDisconnect(() => {
    vscode.window.showWarningMessage("Browser tab disconnected");
  });
}

export function deactivate() {}
