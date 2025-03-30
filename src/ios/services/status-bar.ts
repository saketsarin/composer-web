import * as vscode from "vscode";
import { iOSSimulatorInfo } from "../../shared/types";

export class iOSStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private isConnected: boolean = false;
  private activeSimulator: iOSSimulatorInfo | null = null;
  private activeAppName: string | null = null;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99
    );
    this.statusBarItem.command = "web-preview.connectiOSSimulator";
    this.update();
  }

  public setConnected(connected: boolean): void {
    this.isConnected = connected;
    this.update();
  }

  public setActiveSimulator(simulator: iOSSimulatorInfo | null): void {
    this.activeSimulator = simulator;
    this.update();
  }

  public setActiveApp(appName: string | null): void {
    this.activeAppName = appName;
    this.update();
  }

  public update(): void {
    // Get feature toggle manager
    const featureToggleManager =
      require("../../shared/config/feature-toggles").FeatureToggleManager.getInstance();

    // Only show the status bar if iOS features are enabled
    if (!featureToggleManager.isiOSFeaturesEnabled()) {
      this.statusBarItem.hide();
      return;
    }

    if (!this.isConnected) {
      this.statusBarItem.text = "$(device-mobile) Connect iOS Simulator";
    } else {
      this.statusBarItem.text = `$(device-mobile) ${
        this.activeSimulator?.name || "iOS Simulator"
      }${this.activeAppName ? ` (${this.activeAppName})` : ""}`;
    }
    this.statusBarItem.tooltip = this.isConnected
      ? `Connected to: ${this.activeSimulator?.name} (${
          this.activeSimulator?.runtime
        })${
          this.activeAppName ? `\nMonitoring app: ${this.activeAppName}` : ""
        }`
      : "Click to connect to an iOS Simulator";
    this.statusBarItem.show();

    // Update context flag for menu visibility
    vscode.commands.executeCommand(
      "setContext",
      "web-preview:iOSConnected",
      this.isConnected
    );
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
