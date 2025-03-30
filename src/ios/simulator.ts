import * as vscode from "vscode";
import { EventEmitter } from "events";
import { iOSSimulatorInfo } from "../shared/types";
import { ToastService } from "../shared/utils/toast";

import { iOSStatusBar } from "./services/status-bar";
import { SimulatorScanner } from "./services/simulator-scanner";

export class iOSSimulatorMonitor extends EventEmitter {
  private static instance: iOSSimulatorMonitor;
  private activeSimulator: iOSSimulatorInfo | null = null;
  private isConnected: boolean = false;
  private toastService: ToastService;
  private disconnectEmitter = new vscode.EventEmitter<void>();
  private activeAppName: string | null = null;

  // Modularized components
  private statusBar: iOSStatusBar;
  private simulatorScanner: SimulatorScanner;

  private constructor() {
    super();
    this.toastService = ToastService.getInstance();

    // Initialize components
    this.statusBar = new iOSStatusBar();
    this.simulatorScanner = new SimulatorScanner();
  }

  public static getInstance(): iOSSimulatorMonitor {
    if (!iOSSimulatorMonitor.instance) {
      iOSSimulatorMonitor.instance = new iOSSimulatorMonitor();
    }
    return iOSSimulatorMonitor.instance;
  }

  public updateStatusBar() {
    // Delegate to status bar service
    this.statusBar.update();
  }

  public async connect(): Promise<void> {
    try {
      const simulators = await this.simulatorScanner.getAvailableSimulators();

      if (!simulators.length) {
        throw new Error(
          "No iOS simulators found. Please start one from Xcode first."
        );
      }

      let selectedSimulator: iOSSimulatorInfo;

      // Auto-select if only one simulator is available
      if (simulators.length === 1) {
        selectedSimulator = simulators[0];
        this.toastService.showInfo(
          `Auto-selected simulator: ${selectedSimulator.name}`
        );
      } else {
        // Otherwise show picker for user to choose
        const picks = simulators.map((simulator) => ({
          label: simulator.name,
          description: `${simulator.runtime} (${simulator.status})`,
          simulator,
        }));

        const selection = await vscode.window.showQuickPick(picks, {
          placeHolder: "Select an iOS simulator to monitor",
        });

        if (!selection) {
          return;
        }

        selectedSimulator = selection.simulator;
      }

      // Connect to the selected simulator first
      await this.monitorSimulator(selectedSimulator);

      // Now get the list of apps and let user choose
      await this.selectAppToMonitor();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.toastService.showError(
        `Failed to connect to iOS simulator: ${errorMessage}`
      );
      this.disconnect();
    }
  }

  private async selectAppToMonitor(): Promise<void> {
    if (!this.activeSimulator) {
      return;
    }

    try {
      // Show a loading indicator
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Loading simulator apps...",
          cancellable: false,
        },
        async () => {
          const apps = await this.simulatorScanner.getInstalledApps(
            this.activeSimulator!.udid
          );

          if (apps.length === 0) {
            this.toastService.showError("No apps found on simulator");
            this.disconnect();
            return;
          }

          // Create quick pick items for each app
          const appPicks = apps.map((app) => ({
            label: app.name,
            description: app.bundleId,
            app,
          }));

          const selection = await vscode.window.showQuickPick(appPicks, {
            placeHolder: "Select an app to monitor logs",
          });

          if (!selection) {
            // If user cancels, disconnect
            this.disconnect();
            return;
          }

          // Specific app selected
          this.activeAppName = selection.app.name;
          this.statusBar.setActiveApp(this.activeAppName);

          // Show success notification
          await this.showSuccessNotification();
        }
      );
    } catch (error) {
      console.error("Error getting installed apps:", error);

      // Show error to user if listapps command failed
      if (this.toastService) {
        this.toastService.showError(
          "Failed to detect installed apps. Please try again or check if the simulator is running properly."
        );
      }

      // Throw error to be handled by caller
      throw new Error("Failed to get installed apps");
    }
  }

  private async monitorSimulator(simulator: iOSSimulatorInfo) {
    try {
      // Store the active simulator
      this.activeSimulator = simulator;
      this.isConnected = true;

      // Update status bar
      this.statusBar.setConnected(true);
      this.statusBar.setActiveSimulator(simulator);
    } catch (error) {
      console.error("Error monitoring simulator:", error);
      this.toastService.showError("Failed to initialize simulator connection");
      await this.disconnect();
    }
  }

  private async showSuccessNotification() {
    if (this.activeSimulator && this.activeAppName) {
      this.toastService.showInfo(
        `Connected to iOS Simulator: ${this.activeSimulator.name}\nApp: ${this.activeAppName}`
      );
    }
  }

  private async stopMonitoring() {
    // Reset state
    this.activeAppName = null;
    this.activeSimulator = null;
    this.isConnected = false;

    // Update status
    this.statusBar.setConnected(false);
    this.statusBar.setActiveSimulator(null);
    this.statusBar.setActiveApp(null);
  }

  public onDisconnect(listener: () => void): vscode.Disposable {
    return this.disconnectEmitter.event(listener);
  }

  public async disconnect() {
    await this.stopMonitoring();
    this.disconnectEmitter.fire();
  }

  public getActiveSimulator(): iOSSimulatorInfo | null {
    return this.activeSimulator;
  }

  public isSimulatorConnected(): boolean {
    return this.isConnected;
  }

  public dispose() {
    this.disconnect();
    this.statusBar.dispose();
  }

  public async captureScreenshot(): Promise<Buffer> {
    if (!this.activeSimulator) {
      throw new Error("No active simulator to capture screenshot from");
    }

    try {
      return await this.simulatorScanner.captureScreenshot(
        this.activeSimulator.udid
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to capture iOS screenshot: ${errorMessage}`);
    }
  }
}
