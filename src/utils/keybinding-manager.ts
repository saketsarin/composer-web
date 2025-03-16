import * as vscode from "vscode";
import { ConfigManager } from "../config";

export interface KeybindConfig {
  command: string;
  key: string;
  mac: string;
}

export class KeybindingManager {
  private static instance: KeybindingManager;
  private configManager: ConfigManager;
  private currentKeybindings: KeybindConfig[] = [];
  private customKeybindings: KeybindConfig[] = [];

  public static readonly VIEW_TYPE = "composer-web.keybindSettings";

  private constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  public static getInstance(): KeybindingManager {
    if (!KeybindingManager.instance) {
      KeybindingManager.instance = new KeybindingManager();
    }
    return KeybindingManager.instance;
  }

  public async loadKeybindings(): Promise<KeybindConfig[]> {
    try {
      this.customKeybindings = await this.getCustomKeybindings();
      const defaultKeybindings = await this.getDefaultKeybindings();

      // Start with all default keybindings
      const mergedKeybindings = [...defaultKeybindings];

      // For each command that has a custom keybinding, replace the default
      this.customKeybindings.forEach((customKb) => {
        const index = mergedKeybindings.findIndex(
          (kb) => kb.command === customKb.command
        );
        if (index !== -1) {
          mergedKeybindings[index] = customKb;
        } else {
          mergedKeybindings.push(customKb);
        }
      });

      this.currentKeybindings = mergedKeybindings;
      return this.currentKeybindings;
    } catch (error) {
      console.error("Failed to load keybindings:", error);
      throw error;
    }
  }

  public async updateKeybinding(
    command: string,
    key: string,
    mac: string
  ): Promise<KeybindConfig[]> {
    try {
      // If we don't have keybindings loaded yet, load them first
      if (this.currentKeybindings.length === 0) {
        await this.loadKeybindings();
      }

      // Check if this command already has a custom keybinding
      const existingIndex = this.customKeybindings.findIndex(
        (kb) => kb.command === command
      );

      if (existingIndex !== -1) {
        // Update existing custom keybinding
        this.customKeybindings[existingIndex] = { command, key, mac };
      } else {
        // Add a new custom keybinding
        this.customKeybindings.push({ command, key, mac });
      }

      // Save the updated custom keybindings
      await this.configManager.update(
        "customKeybindings",
        this.customKeybindings
      );

      // Update the current keybindings in memory
      const commandIndex = this.currentKeybindings.findIndex(
        (kb) => kb.command === command
      );
      if (commandIndex !== -1) {
        this.currentKeybindings[commandIndex] = { command, key, mac };
      }

      // Apply all custom keybindings to VS Code to ensure consistency
      await this.applyKeybindingsToVSCode();

      return this.currentKeybindings;
    } catch (error) {
      console.error("Failed to update keybinding:", error);
      throw error;
    }
  }

  /**
   * Reset keybindings to default
   */
  public async resetToDefault(): Promise<KeybindConfig[]> {
    try {
      const defaultKeybindings = await this.getDefaultKeybindings();
      this.customKeybindings = [];
      await this.configManager.update("customKeybindings", []);
      this.currentKeybindings = defaultKeybindings;

      await this.applyKeybindingsToVSCode(true);

      return defaultKeybindings;
    } catch (error) {
      console.error("Failed to reset keybindings:", error);
      throw error;
    }
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
      return [];
    }
  }

  private async applyKeybindingsToVSCode(
    isReset: boolean = false
  ): Promise<void> {
    try {
      const defaultKeybindings = await this.getDefaultKeybindings();

      const customizedCommands = new Set(
        this.customKeybindings.map((kb) => kb.command)
      );

      const keybindingEntries: Array<{
        key: string;
        command: string;
        when?: string;
      }> = [];

      if (!isReset) {
        // Only add these entries if we're not resetting to defaults

        // 1. For each default keybinding command that has a custom override,
        //    add a negative keybinding entry to explicitly unset it
        defaultKeybindings.forEach((kb) => {
          if (customizedCommands.has(kb.command)) {
            // Disable default keybinding by adding a negative keybinding entry
            const defaultKey = process.platform === "darwin" ? kb.mac : kb.key;
            if (defaultKey) {
              // Only if there's a key for this platform
              keybindingEntries.push({
                key: defaultKey,
                command: `-${kb.command}`, // Negative command disables it
              });
            }
          }
        });

        // 2. Add all custom keybindings
        this.customKeybindings.forEach((kb) => {
          const customKey = process.platform === "darwin" ? kb.mac : kb.key;
          if (customKey) {
            keybindingEntries.push({
              key: customKey,
              command: kb.command,
              when: "editorTextFocus",
            });
          }
        });
      }

      // 3. Add default keybindings for commands that don't have custom overrides
      // If resetting, add ALL default keybindings
      defaultKeybindings.forEach((kb) => {
        if (isReset || !customizedCommands.has(kb.command)) {
          const defaultKey = process.platform === "darwin" ? kb.mac : kb.key;
          if (defaultKey) {
            keybindingEntries.push({
              key: defaultKey,
              command: kb.command,
              when: "editorTextFocus",
            });
          }
        }
      });

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

      // Remove any existing Composer Web keybindings and their negative counterparts
      const filteredKeybindings = existingKeybindings.filter(
        (kb) =>
          !kb.command?.startsWith("web-preview.") &&
          !kb.command?.startsWith("-web-preview.")
      );

      // Add our prepared keybinding entries
      const newKeybindings = [...filteredKeybindings, ...keybindingEntries];

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
