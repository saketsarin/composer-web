import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { ToastService } from "./toast";

interface VSCodeKeybinding {
  command: string;
  key: string;
  mac?: string;
}

export class SettingsService {
  private static instance: SettingsService;
  private toastService: ToastService;

  private constructor() {
    this.toastService = ToastService.getInstance();
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  private getConfiguration() {
    return vscode.workspace.getConfiguration("composerWeb");
  }

  public getKeybinding(command: string): string {
    const config = this.getConfiguration();
    return config.get(`keybindings.${command}`) as string;
  }

  public async updateKeybinding(
    command: string,
    newKeybinding: string
  ): Promise<void> {
    const config = this.getConfiguration();
    const fullCommand = `web-preview.${command}`;

    try {
      await this.updateVSCodeKeybindings(fullCommand, newKeybinding);

      await config.update(
        `keybindings.${command}`,
        newKeybinding,
        vscode.ConfigurationTarget.Global
      );

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
