import * as vscode from "vscode";
import { KeybindingManager } from "../utils/keybinding-manager";
import { getKeybindingPanelHtml } from "./templates/keybinding-panel.template";

export class KeybindingPanel implements vscode.WebviewViewProvider {
  private static instance: KeybindingPanel | undefined;
  private view: vscode.WebviewView | undefined;
  private readonly keybindingManager: KeybindingManager;
  private disposables: vscode.Disposable[] = [];

  private constructor() {
    this.keybindingManager = KeybindingManager.getInstance();
  }

  public static getInstance(): KeybindingPanel {
    if (!KeybindingPanel.instance) {
      KeybindingPanel.instance = new KeybindingPanel();
    }
    return KeybindingPanel.instance;
  }

  public static get viewType(): string {
    return KeybindingManager.VIEW_TYPE;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView
  ): void | Thenable<void> {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };

    webviewView.webview.html = getKeybindingPanelHtml();

    webviewView.webview.onDidReceiveMessage(
      this.handleMessage.bind(this),
      null,
      this.disposables
    );

    webviewView.onDidDispose(() => this.dispose(), null, this.disposables);

    // Load keybindings automatically
    this.loadAndSendKeybindings();
  }

  private showNotification(
    type: "error" | "info" | "warning",
    message: string
  ): void {
    if (this.view) {
      this.view.webview.postMessage({
        command: "showNotification",
        type,
        message,
      });
    }
  }

  public static show(): void {
    vscode.commands.executeCommand("composer-web.settings.focus");
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

      if (this.view) {
        this.view.webview.postMessage({
          command: "updateKeybindings",
          keybindings: keybindings,
        });
      }
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
      if (this.view) {
        this.view.webview.postMessage({
          command: "updateKeybindings",
          keybindings: updatedKeybindings,
        });
      }

      this.showNotification("info", "Keybinding updated successfully");
    } catch (error) {
      console.error("Failed to update keybinding:", error);
      this.showNotification("error", "Failed to update keybinding");
    }
  }

  private async resetToDefault(): Promise<void> {
    try {
      const defaultKeybindings = await this.keybindingManager.resetToDefault();

      if (this.view) {
        this.view.webview.postMessage({
          command: "updateKeybindings",
          keybindings: defaultKeybindings,
        });
      }

      this.showNotification("info", "Keybindings reset to default");
    } catch (error) {
      this.showNotification("error", "Failed to reset keybindings");
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
