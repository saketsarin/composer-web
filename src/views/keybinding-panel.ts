import * as vscode from "vscode";
import { KeybindingManager } from "../utils/keybinding-manager";
import { WebviewManager } from "./webview-manager";
import { getKeybindingPanelHtml } from "./templates/keybinding-panel.template";

export class KeybindingPanel {
  private static instance: KeybindingPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly keybindingManager: KeybindingManager;
  private readonly webviewManager: WebviewManager;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;
    this.keybindingManager = KeybindingManager.getInstance();
    this.webviewManager = WebviewManager.getInstance();

    this.panel.webview.html = getKeybindingPanelHtml();

    this.webviewManager.registerMessageHandler(
      this.panel,
      this.handleMessage.bind(this),
      this.disposables
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  private showNotification(
    type: "error" | "info" | "warning",
    message: string
  ): void {
    this.panel.webview.postMessage({
      command: "showNotification",
      type,
      message,
    });
  }

  public static createOrShow(): KeybindingPanel {
    const webviewManager = WebviewManager.getInstance();

    const panel = webviewManager.createOrShow(
      KeybindingManager.VIEW_TYPE,
      "Keybinding Settings",
      {},
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    if (!KeybindingPanel.instance) {
      KeybindingPanel.instance = new KeybindingPanel(panel);
    }

    return KeybindingPanel.instance;
  }

  private async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case "getKeybindings":
        await this.loadAndSendKeybindings();
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
  }

  private async loadAndSendKeybindings(): Promise<void> {
    try {
      const keybindings = await this.keybindingManager.loadKeybindings();

      this.panel.webview.postMessage({
        command: "updateKeybindings",
        keybindings: keybindings,
      });
    } catch (error) {
      this.showNotification("error", "Failed to load keybindings");
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
            `This keybinding is already assigned to '${conflictingCommand.command}'. Please choose a different keybinding.`
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
            `This Mac keybinding is already assigned to '${conflictingCommand.command}'. Please choose a different keybinding.`
          );
          return;
        }
      }

      const updatedKeybindings = await this.keybindingManager.updateKeybinding(
        command,
        key,
        mac
      );

      // Send updated keybindings back to webview
      this.panel.webview.postMessage({
        command: "updateKeybindings",
        keybindings: updatedKeybindings,
      });

      this.showNotification("info", "Keybinding updated successfully");
    } catch (error) {
      console.error("Failed to update keybinding:", error);
      this.showNotification("error", "Failed to update keybinding");
    }
  }

  private async resetToDefault(): Promise<void> {
    try {
      const defaultKeybindings = await this.keybindingManager.resetToDefault();

      this.panel.webview.postMessage({
        command: "updateKeybindings",
        keybindings: defaultKeybindings,
      });

      this.showNotification("info", "Keybindings reset to default");
    } catch (error) {
      this.showNotification("error", "Failed to reset keybindings");
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
}
