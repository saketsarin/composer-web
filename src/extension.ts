import * as vscode from "vscode";
import { ComposerIntegration } from "./shared/composer/integration";
import { BrowserMonitor } from "./browser/monitor";
import { CommandHandlers } from "./commands";
import { ToastService } from "./shared/utils/toast";
import { SettingsPanel } from "./views/settings-panel";
import { LogFilterManager } from "./shared/config/log-filters";
import { iOSSimulatorMonitor } from "./ios/simulator";

export function activate(context: vscode.ExtensionContext) {
  const composerIntegration = ComposerIntegration.getInstance(context);
  const browserMonitor = BrowserMonitor.getInstance();
  const iosMonitor = iOSSimulatorMonitor.getInstance();
  const commandHandlers = new CommandHandlers(
    browserMonitor,
    composerIntegration,
    iosMonitor
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
    // iOS simulator commands
    vscode.commands.registerCommand("web-preview.connectiOSSimulator", () =>
      commandHandlers.handleConnectiOSSimulator()
    ),
    vscode.commands.registerCommand("web-preview.cleariOSLogs", () =>
      commandHandlers.handleCleariOSLogs()
    ),
    vscode.commands.registerCommand("web-preview.sendiOSLogs", () =>
      commandHandlers.handleSendiOSLogs()
    ),
    vscode.commands.registerCommand("web-preview.sendiOSScreenshot", () =>
      commandHandlers.handleSendiOSScreenshot()
    ),
    vscode.commands.registerCommand("web-preview.captureiOS", () =>
      commandHandlers.handleCaptureiOS()
    ),
    vscode.window.registerWebviewViewProvider(
      SettingsPanel.viewType,
      settingsPanel
    )
  );

  browserMonitor.onDisconnect(() => {
    toastService.showBrowserDisconnected();
  });

  iosMonitor.onDisconnect(() => {
    toastService.showiOSSimulatorDisconnected();
  });
}

export function deactivate() {}
