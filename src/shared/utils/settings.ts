import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { ToastService } from "./toast";
import { ConfigManager } from "../config";
import { ErrorHandler, ConfigurationError } from "./error-handler";

interface VSCodeKeybinding {
  command: string;
  key: string;
  mac?: string;
}

export class SettingsService {
  private static instance: SettingsService;
  private toastService: ToastService;
  private configManager: ConfigManager;
  private errorHandler: ErrorHandler;

  private constructor() {
    this.toastService = ToastService.getInstance();
    this.configManager = ConfigManager.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
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
    const binding = customKeybindings.find(
      (kb: VSCodeKeybinding) => kb.command === command
    );
    return binding?.key || "";
  }

  public async updateKeybinding(
    command: string,
    newKeybinding: string
  ): Promise<void> {
    try {
      await this.updateVSCodeKeybindings(command, newKeybinding);
      await vscode.commands.executeCommand(
        "workbench.action.openGlobalKeybindings"
      );
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );

      this.toastService.showInfo("Keybinding updated successfully");
    } catch (error) {
      this.errorHandler.handleConfigError(
        error,
        "Failed to update keybindings"
      );
      throw new ConfigurationError(
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
      } catch (error) {
        this.errorHandler.handleError(
          error,
          "Failed to parse keybindings.json",
          true
        );
        keybindings = [];
      }

      keybindings = keybindings.filter(
        (kb: VSCodeKeybinding) => kb.command !== command
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
      this.errorHandler.handleConfigError(
        error,
        "Failed to update keybindings.json"
      );
      throw error;
    }
  }

  private getKeybindingsPath(): string {
    const isWindows = process.platform === "win32";
    const isMac = process.platform === "darwin";
    const homeDir = process.env.HOME || process.env.USERPROFILE;

    if (!homeDir) {
      throw new ConfigurationError("Unable to determine user home directory");
    }

    if (isWindows) {
      return path.join(
        process.env.APPDATA || "",
        "Code",
        "User",
        "keybindings.json"
      );
    } else if (isMac) {
      return path.join(
        homeDir,
        "Library",
        "Application Support",
        "Code",
        "User",
        "keybindings.json"
      );
    } else {
      return path.join(homeDir, ".config", "Code", "User", "keybindings.json");
    }
  }
}
