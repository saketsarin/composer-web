import * as vscode from "vscode";
import { ConfigManager } from "../config";
import { ToastService } from "./toast";

export interface KeybindConfig {
  command: string;
  key: string;
  mac: string;
}

export class KeybindingManager {
  private static instance: KeybindingManager;
  private configManager: ConfigManager;
  private toastService: ToastService;

  private constructor() {
    this.configManager = ConfigManager.getInstance();
    this.toastService = ToastService.getInstance();
  }

  public static getInstance(): KeybindingManager {
    if (!KeybindingManager.instance) {
      KeybindingManager.instance = new KeybindingManager();
    }
    return KeybindingManager.instance;
  }

  /**
   * Get the current keybindings from the package.json
   */
  public async getDefaultKeybindings(): Promise<KeybindConfig[]> {
    const packageJson = await this.getPackageJson();
    return packageJson.contributes.keybindings;
  }

  /**
   * Get custom keybindings from user settings
   */
  public async getCustomKeybindings(): Promise<KeybindConfig[]> {
    try {
      const customKeybindings = this.configManager.get<
        KeybindConfig[] | undefined
      >("customKeybindings");
      return customKeybindings || [];
    } catch (error) {
      console.error("Failed to get custom keybindings:", error);
      this.toastService.showError("Failed to get custom keybindings");
      return [];
    }
  }

  /**
   * Save custom keybindings to settings
   */
  public async saveCustomKeybindings(
    keybindings: KeybindConfig[]
  ): Promise<void> {
    try {
      await this.configManager.update("customKeybindings", keybindings);
      await this.applyKeybindingsToVSCode(keybindings);
    } catch (error) {
      console.error("Failed to save custom keybindings:", error);
      this.toastService.showError("Failed to save custom keybindings");
      throw error;
    }
  }

  /**
   * Apply custom keybindings to VS Code
   */
  private async applyKeybindingsToVSCode(
    keybindings: KeybindConfig[]
  ): Promise<void> {
    try {
      const keybindingsConfig = keybindings.map((kb) => ({
        key: process.platform === "darwin" ? kb.mac : kb.key,
        command: kb.command,
        when: "editorTextFocus",
      }));

      await vscode.commands.executeCommand(
        "workbench.action.openGlobalKeybindingsFile"
      );
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const document = editor.document;
      const text = document.getText();
      let existingKeybindings: any[] = [];
      try {
        existingKeybindings = JSON.parse(text);
      } catch (e) {
        existingKeybindings = [];
      }

      const filteredKeybindings = existingKeybindings.filter(
        (kb) => !kb.command.startsWith("web-preview.")
      );

      const newKeybindings = [...filteredKeybindings, ...keybindingsConfig];

      await editor.edit((editBuilder) => {
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(text.length)
        );
        editBuilder.replace(fullRange, JSON.stringify(newKeybindings, null, 4));
      });

      await document.save();
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
    } catch (error) {
      console.error("Failed to apply keybindings:", error);
      // Don't show toast here since this error is caught by saveCustomKeybindings
      // which will show a toast
      throw error;
    }
  }

  /**
   * Get package.json content
   */
  private async getPackageJson(): Promise<any> {
    const packageJsonUri = vscode.Uri.joinPath(
      vscode.extensions.getExtension("saketsarin.composer-web")!.extensionUri,
      "package.json"
    );

    const packageJsonBuffer = await vscode.workspace.fs.readFile(
      packageJsonUri
    );
    const packageJsonContent = packageJsonBuffer.toString();
    return JSON.parse(packageJsonContent);
  }
}
