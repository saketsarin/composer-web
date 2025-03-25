import * as vscode from "vscode";
import { getSettingsPanelHtml } from "./templates/settings-panel.template";
import { KeybindingManager } from "../shared/utils/keybinding-manager";
import { LogFilterManager, LogFilters } from "../shared/config/log-filters";
import {
  FeatureToggleManager,
  FeatureToggles,
} from "../shared/config/feature-toggles";

export class SettingsPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = "composer-web.settings";
  private static instance: SettingsPanel | undefined;
  private view: vscode.WebviewView | undefined;
  private disposables: vscode.Disposable[] = [];
  private keybindingManager: KeybindingManager;
  private logFilterManager: LogFilterManager;
  private featureToggleManager: FeatureToggleManager;

  private constructor() {
    this.keybindingManager = KeybindingManager.getInstance();
    this.logFilterManager = LogFilterManager.getInstance();
    this.featureToggleManager = FeatureToggleManager.getInstance();
  }

  public static getInstance(): SettingsPanel {
    if (!SettingsPanel.instance) {
      SettingsPanel.instance = new SettingsPanel();
    }
    return SettingsPanel.instance;
  }

  public static show(): void {
    vscode.commands.executeCommand("workbench.view.extension.composer-web");
  }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };

    webviewView.webview.html = getSettingsPanelHtml();

    this.disposables.push(
      webviewView.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
          case "getKeybindings":
            const keybindings = await this.keybindingManager.loadKeybindings();
            webviewView.webview.postMessage({
              command: "updateKeybindings",
              keybindings,
            });
            break;

          case "getLogFilters":
            const filters = this.logFilterManager.getFilters();
            webviewView.webview.postMessage({
              command: "updateLogFilters",
              filters,
            });
            break;

          case "getFeatureToggles":
            const toggles = this.featureToggleManager.getToggles();
            webviewView.webview.postMessage({
              command: "updateFeatureToggles",
              toggles,
            });
            break;

          case "updateKeybinding":
            await this.updateKeybinding(
              message.data.command,
              message.data.key,
              message.data.mac
            );
            break;

          case "updateLogFilters":
            await this.updateLogFilters(message.filters);
            break;

          case "updateFeatureToggles":
            await this.updateFeatureToggles(message.toggles);
            break;

          case "resetToDefault":
            await this.resetToDefault();
            break;
        }
      })
    );
  }

  private async updateKeybinding(
    command: string,
    key: string,
    mac: string
  ): Promise<void> {
    try {
      console.log("Updating keybinding:", { command, key, mac }); // Debug log

      // Check if this keybinding is already assigned to a different command
      const keybindings = await this.keybindingManager.loadKeybindings();

      // Check for conflicts with the Windows/Linux keybinding
      if (key) {
        const conflictingCommand = keybindings.find(
          (k) => k.command !== command && k.key === key
        );

        if (conflictingCommand) {
          this.showNotification(
            "warning",
            `This keybinding is already assigned to "${conflictingCommand.command}"`
          );
          return;
        }
      }

      // Check for conflicts with the Mac keybinding
      if (mac) {
        const conflictingCommand = keybindings.find(
          (k) => k.command !== command && k.mac === mac
        );

        if (conflictingCommand) {
          this.showNotification(
            "warning",
            `This keybinding is already assigned to "${conflictingCommand.command}"`
          );
          return;
        }
      }

      await this.keybindingManager.updateKeybinding(command, key, mac);
      this.showNotification("info", "Keybinding updated successfully");
    } catch (error) {
      console.error("Error updating keybinding:", error);
      this.showNotification(
        "error",
        "Failed to update keybinding. Please try again."
      );
    }
  }

  private async updateLogFilters(filters: LogFilters): Promise<void> {
    try {
      await this.logFilterManager.updateFilters(filters);
      this.showNotification("info", "Log filters updated successfully");
    } catch (error) {
      console.error("Error updating log filters:", error);
      this.showNotification(
        "error",
        "Failed to update log filters. Please try again."
      );
    }
  }

  private async updateFeatureToggles(toggles: FeatureToggles): Promise<void> {
    try {
      await this.featureToggleManager.updateToggles(toggles);
      this.showNotification("info", "Feature toggles updated successfully");
    } catch (error) {
      console.error("Error updating feature toggles:", error);
      this.showNotification(
        "error",
        "Failed to update feature toggles. Please try again."
      );
    }
  }

  private async resetToDefault(): Promise<void> {
    try {
      await this.keybindingManager.resetToDefault();
      await this.logFilterManager.updateFilters(
        this.logFilterManager.getDefaultFilters()
      );
      await this.featureToggleManager.updateToggles(
        this.featureToggleManager.getDefaultToggles()
      );

      const keybindings = await this.keybindingManager.loadKeybindings();
      const filters = this.logFilterManager.getFilters();
      const toggles = this.featureToggleManager.getToggles();

      if (this.view) {
        this.view.webview.postMessage({
          command: "updateKeybindings",
          keybindings,
        });
        this.view.webview.postMessage({
          command: "updateLogFilters",
          filters,
        });
        this.view.webview.postMessage({
          command: "updateFeatureToggles",
          toggles,
        });
      }

      this.showNotification("info", "Settings reset to default");
    } catch (error) {
      console.error("Error resetting to default:", error);
      this.showNotification(
        "error",
        "Failed to reset settings. Please try again."
      );
    }
  }

  private showNotification(type: string, message: string): void {
    if (this.view) {
      this.view.webview.postMessage({
        command: "showNotification",
        type,
        message,
      });
    }
  }

  public dispose() {
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
