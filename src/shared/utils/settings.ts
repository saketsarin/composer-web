import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { ToastService } from "./toast";
import { ConfigManager } from "../config";
import { KeybindConfig } from "../types";

interface VSCodeKeybinding {
  command: string;
  key: string;
  mac?: string;
}

export class SettingsService {
  private static instance: SettingsService;
  private toastService: ToastService;
  private configManager: ConfigManager;

  private constructor() {
    this.toastService = ToastService.getInstance();
    this.configManager = ConfigManager.getInstance();
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  public getKeybinding(command: string): string {
    const customKeybindings =
      this.configManager.get<KeybindConfig[]>("customKeybindings") || [];
    const binding = customKeybindings.find((kb) => kb.command === command);
    return binding?.key || "";
  }

  public async updateKeybinding(
    command: string,
    newKeybinding: string
  ): Promise<void> {
    const fullCommand = `web-preview.${command}`;

    try {
      await this.updateVSCodeKeybindings(fullCommand, newKeybinding);

      // Get current keybindings
      const customKeybindings =
        this.configManager.get<KeybindConfig[]>("customKeybindings") || [];

      // Remove existing binding for this command if it exists
      const existingIndex = customKeybindings.findIndex(
        (kb) => kb.command === command
      );
      if (existingIndex !== -1) {
        customKeybindings.splice(existingIndex, 1);
      }

      // Add new binding
      const isMac = process.platform === "darwin";
      customKeybindings.push({
        command,
        key: isMac ? newKeybinding : newKeybinding.replace(/cmd/g, "ctrl"),
        mac: isMac ? newKeybinding : newKeybinding.replace(/ctrl/g, "cmd"),
      });

      // Update the entire customKeybindings array
      await this.configManager.update("customKeybindings", customKeybindings);

      await vscode.commands.executeCommand(
        "workbench.action.openGlobalKeybindings"
      );
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );

      this.toastService.showInfo("Keybinding updated successfully");
    } catch (error) {
      console.error("Failed to update keybindings:", error);
      this.toastService.showError(
        `Failed to update keybindings: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw new Error(
        `Failed to update keybindings: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async updateVSCodeKeybindings(
    command: string,
    newKeybinding: string
  ): Promise<void> {
    const keybindingsPath = this.getKeybindingsPath();

    try {
      if (!fs.existsSync(keybindingsPath)) {
        fs.writeFileSync(keybindingsPath, "[]", "utf8");
      }

      let keybindings: VSCodeKeybinding[] = [];
      try {
        const content = fs.readFileSync(keybindingsPath, "utf8");
        keybindings = JSON.parse(content);
      } catch (e) {
        keybindings = [];
      }

      keybindings = keybindings.filter(
        (k: VSCodeKeybinding) => k.command !== command
      );

      const isMac = process.platform === "darwin";
      const newBinding: VSCodeKeybinding = {
        command: command,
        key: isMac ? newKeybinding : newKeybinding.replace(/cmd/g, "ctrl"),
      };

      if (isMac) {
        newBinding.mac = newKeybinding;
      }

      keybindings.push(newBinding);

      fs.writeFileSync(
        keybindingsPath,
        JSON.stringify(keybindings, null, 4),
        "utf8"
      );
    } catch (error) {
      console.error("Failed to update keybindings.json:", error);
      // Don't show toast here since this error is caught by updateKeybinding
      // which will show a toast with more context
      throw error;
    }
  }

  private getKeybindingsPath(): string {
    const isWindows = process.platform === "win32";
    const isMac = process.platform === "darwin";
    const homeDir = process.env.HOME || process.env.USERPROFILE;

    if (isWindows) {
      return path.join(
        process.env.APPDATA || "",
        "Code",
        "User",
        "keybindings.json"
      );
    } else if (isMac) {
      return path.join(
        homeDir || "",
        "Library",
        "Application Support",
        "Code",
        "User",
        "keybindings.json"
      );
    } else {
      return path.join(
        homeDir || "",
        ".config",
        "Code",
        "User",
        "keybindings.json"
      );
    }
  }
}
