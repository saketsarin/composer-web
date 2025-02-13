import * as vscode from "vscode";
import { ExtensionConfig } from "../types";

export class ConfigManager {
  private static instance: ConfigManager;
  private config: vscode.WorkspaceConfiguration;

  private constructor() {
    this.config = vscode.workspace.getConfiguration("composerWeb");
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public get<T>(key: keyof ExtensionConfig): T {
    return this.config.get(key) as T;
  }

  public async update<T>(key: keyof ExtensionConfig, value: T): Promise<void> {
    await this.config.update(key, value, vscode.ConfigurationTarget.Global);
  }
}
