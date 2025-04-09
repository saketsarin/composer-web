import * as vscode from "vscode";
import { EventEmitter } from "events";
import { iOSSimulatorInfo } from "../shared/types";
import { ToastService } from "../shared/utils/toast";
import { ErrorHandler, SimulatorError } from "../shared/utils/error-handler";
import { iOSStatusBar } from "./services/status-bar";
import { SimulatorScanner } from "./services/simulator-scanner";

interface SimulatorQuickPickItem extends vscode.QuickPickItem {
  simulator: iOSSimulatorInfo;
}

export class iOSSimulatorMonitor extends EventEmitter {
  private static instance: iOSSimulatorMonitor;
  private activeSimulator: iOSSimulatorInfo | null = null;
  private isConnected: boolean = false;
  private toastService: ToastService;
  private errorHandler: ErrorHandler;
  private disconnectEmitter = new vscode.EventEmitter<void>();
  private activeAppName: string | null = null;

  // Modularized components
  private statusBar: iOSStatusBar;
  private simulatorScanner: SimulatorScanner;

  private constructor() {
    super();
    this.toastService = ToastService.getInstance();
    this.errorHandler = ErrorHandler.getInstance();

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
      if (this.isConnected) {
        await this.disconnect();
      }

      const simulators = await this.simulatorScanner.getAvailableSimulators();

      if (!simulators.length) {
        throw new SimulatorError(
          "No iOS simulators found. Please start a simulator first."
        );
      }

      const selection =
        await vscode.window.showQuickPick<SimulatorQuickPickItem>(
          simulators.map((sim: iOSSimulatorInfo) => ({
            label: sim.name,
            description: `(${sim.runtime})`,
            simulator: sim,
          })),
          { placeHolder: "Select iOS Simulator" }
        );

      if (!selection) {
        return;
      }

      await this.monitorSimulator(selection.simulator);
      await this.selectAppToMonitor();
    } catch (error) {
      this.errorHandler.handleSimulatorError(
        error,
        "Failed to connect to iOS simulator"
      );
      this.isConnected = false;
      throw error;
    }
  }

  private async selectAppToMonitor(): Promise<void> {
    if (!this.activeSimulator) {
      return;
    }

    try {
      // Show a loading indicator
      await this.toastService.showProgress(
        "Loading simulator apps...",
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

  public async disconnect(): Promise<void> {
    try {
      this.activeSimulator = null;
      this.activeAppName = null;
      this.isConnected = false;
      this.statusBar.setConnected(false);
      this.disconnectEmitter.fire();
    } catch (error) {
      this.errorHandler.handleSimulatorError(
        error,
        "Failed to disconnect from iOS simulator"
      );
      throw error;
    }
  }

  public getActiveSimulator(): iOSSimulatorInfo | null {
    return this.activeSimulator;
  }

  public isSimulatorConnected(): boolean {
    return this.isConnected && this.activeSimulator !== null;
  }

  public dispose() {
    this.disconnect();
    this.statusBar.dispose();
  }

  public async captureScreenshot(): Promise<Buffer> {
    try {
      if (!this.isSimulatorConnected()) {
        throw new SimulatorError("No iOS simulator connected");
      }

      if (!this.activeSimulator) {
        throw new SimulatorError("No active simulator");
      }

      return await this.simulatorScanner.captureScreenshot(
        this.activeSimulator.udid
      );
    } catch (error) {
      this.errorHandler.handleSimulatorError(
        error,
        "Failed to capture iOS screenshot"
      );
      throw error;
    }
  }

  public onDisconnect(listener: () => void): vscode.Disposable {
    return this.disconnectEmitter.event(listener);
  }
}
