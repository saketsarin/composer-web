import * as vscode from "vscode";
import { EventEmitter } from "events";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs/promises";
import * as os from "os";
import { iOSApp, iOSLog, iOSLogData, iOSSimulatorInfo } from "../shared/types";
import { ToastService } from "../shared/utils/toast";

const execAsync = promisify(exec);

// Constants
const MAX_LOG_ENTRIES = 1000; // Limit number of logs to prevent E2BIG
const LOG_CHUNK_SIZE = 200; // Send logs in chunks of this size

export class iOSSimulatorMonitor extends EventEmitter {
  private static instance: iOSSimulatorMonitor;
  private activeSimulator: iOSSimulatorInfo | null = null;
  private logs: iOSLog[] = [];
  private statusBarItem: vscode.StatusBarItem;
  private isConnected: boolean = false;
  private toastService: ToastService;
  private logProcess: ReturnType<typeof spawn> | null = null;
  private disconnectEmitter = new vscode.EventEmitter<void>();
  private activeAppName: string | null = null;

  private constructor() {
    super();
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99
    );
    this.statusBarItem.command = "web-preview.connectiOSSimulator";
    this.toastService = ToastService.getInstance();
    this.updateStatusBar();
  }

  public static getInstance(): iOSSimulatorMonitor {
    if (!iOSSimulatorMonitor.instance) {
      iOSSimulatorMonitor.instance = new iOSSimulatorMonitor();
    }
    return iOSSimulatorMonitor.instance;
  }

  private updateStatusBar() {
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

  public async connect(): Promise<void> {
    try {
      const simulators = await this.getAvailableSimulators();

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
          const apps = await this.getInstalledApps(this.activeSimulator!.udid);

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

          // Restart log collection with new app filter
          this.clearLogs();
          this.startLogCollection(this.activeSimulator!.udid);
          this.updateStatusBar();

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

  private async getInstalledApps(udid: string): Promise<iOSApp[]> {
    const apps: iOSApp[] = [];

    try {
      // Get list of installed apps from the simulator
      const { stdout } = await execAsync(`xcrun simctl listapps ${udid}`);

      console.log("Debug - Raw output:", stdout);

      // Split the output into app entries
      const appEntries = stdout.split(/(?=\s*"[^"]+"\s*=\s*{)/);

      for (const entry of appEntries) {
        if (!entry.trim()) continue;

        try {
          // Extract bundle ID from the first line
          const bundleIdMatch = entry.match(/"([^"]+)"\s*=/);
          if (!bundleIdMatch) continue;
          const bundleId = bundleIdMatch[1];

          // Check if this is a user app
          if (!entry.includes("ApplicationType = User")) continue;

          // Extract display name
          let name = "";
          const displayNameMatch = entry.match(
            /CFBundleDisplayName\s*=\s*([^;\n]+)/
          );
          const bundleNameMatch = entry.match(/CFBundleName\s*=\s*([^;\n]+)/);

          if (displayNameMatch) {
            name = displayNameMatch[1].trim();
          } else if (bundleNameMatch) {
            name = bundleNameMatch[1].trim();
          }

          // Clean up the name (remove quotes if present)
          name = name.replace(/^"|"$/g, "").trim();

          if (name && bundleId) {
            console.log(`Debug - Found user app: ${name} (${bundleId})`);
            apps.push({ name, bundleId });
          }
        } catch (parseError) {
          console.error("Error parsing app entry:", parseError);
          continue;
        }
      }

      console.log(`Debug - Found ${apps.length} user-installed apps`);

      if (apps.length === 0) {
        throw new Error("No user-installed apps found in simulator");
      }

      return apps;
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
    if (this.activeSimulator) {
      await this.stopMonitoring();
    }

    // Boot simulator if not running
    if (simulator.status !== "Booted") {
      this.toastService.showInfo(`Booting simulator ${simulator.name}...`);
      try {
        await execAsync(`xcrun simctl boot ${simulator.udid}`);
      } catch (error) {
        // If it fails, it might already be booting or have another issue
        console.error(`Error booting simulator: ${error}`);
      }
    }

    this.activeSimulator = simulator;
    this.isConnected = true;
    this.clearLogs();
    this.updateStatusBar();
  }

  private async showSuccessNotification() {
    const message = this.activeAppName
      ? `Connected to iOS simulator: ${this.activeSimulator?.name} (monitoring app: ${this.activeAppName})`
      : `Connected to iOS simulator: ${this.activeSimulator?.name} (monitoring all apps)`;

    this.toastService.showInfo(message);
  }

  private getLogPredicate(): string {
    if (this.activeAppName) {
      // Use simpler, more reliable predicate syntax
      return `subsystem contains '${this.activeAppName}' OR eventMessage contains 'print'`;
    } else {
      // Default predicate for all app logs with simpler syntax
      return "category == \"App\" OR eventMessage contains 'print'";
    }
  }

  private startLogCollection(udid: string) {
    // Stop any existing log process
    this.stopLogCollection();

    // Very simple approach to directly target SwiftUI lifecycle events and app console output
    this.logProcess = spawn("xcrun", [
      "simctl",
      "spawn",
      udid,
      "log",
      "stream",
      "--predicate",
      this.getLogPredicate(),
      "--style",
      "compact",
    ]);

    this.logProcess.stdout?.on("data", (data) => {
      const content = data.toString();
      const lines = content.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;

        // Format the log with a simple timestamp
        const timestamp = new Date().toLocaleTimeString();
        let formattedLog = `[${timestamp}] ${line.trim()}`;

        // Add to logs
        this.processSimpleLog(formattedLog);
      }
    });

    this.logProcess.stderr?.on("data", (data) => {
      console.error(`simctl log error: ${data}`);
    });

    this.logProcess.on("close", (code) => {
      if (code !== 0 && this.isConnected) {
        this.toastService.showWarning(
          `Log collection stopped with code ${code}`
        );
        this.disconnect();
      }
    });
  }

  private processSimpleLog(line: string): void {
    const timestamp = new Date().getTime();
    const log: iOSLog = {
      message: line,
      timestamp,
      level: "info",
      processId: undefined,
      processName: this.activeAppName || undefined,
    };

    this.logs.push(log);

    // Trim logs when they get too large to prevent E2BIG errors
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
    }
  }

  private stopLogCollection() {
    if (this.logProcess) {
      this.logProcess.kill();
      this.logProcess = null;
    }
  }

  private async stopMonitoring() {
    this.stopLogCollection();
    this.isConnected = false;
    this.activeSimulator = null;
    this.activeAppName = null;
    this.updateStatusBar();
  }

  public clearLogs(): void {
    this.logs = [];
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

  public getLogs(): iOSLogData {
    // If we don't have any logs yet, provide a helpful message
    if (this.logs.length === 0) {
      const timestamp = new Date().getTime();
      this.logs.push({
        message: `No console logs found for ${
          this.activeAppName || "any apps"
        }. If your app is not producing logs, try using console.log(), NSLog(), or print() statements in your code.`,
        timestamp,
        level: "info",
        processId: "0",
        processName: "Composer",
      });
    }

    return {
      logEntries: this.logs.slice(-LOG_CHUNK_SIZE), // Return only a limited number of logs
      device: this.activeSimulator!,
    };
  }

  public isSimulatorConnected(): boolean {
    return this.isConnected && this.activeSimulator !== null;
  }

  public dispose() {
    this.stopLogCollection();
    this.statusBarItem.dispose();
  }

  public async captureScreenshot(): Promise<Buffer> {
    if (!this.activeSimulator) {
      throw new Error("No simulator connected");
    }

    // Create a temporary file for the screenshot
    const tempDir = os.tmpdir();
    const screenshotPath = path.join(
      tempDir,
      `ios_screenshot_${Date.now()}.png`
    );

    try {
      // Capture screenshot using simctl
      await execAsync(
        `xcrun simctl io ${this.activeSimulator.udid} screenshot "${screenshotPath}"`
      );

      // Read the screenshot file
      const screenshotBuffer = await fs.readFile(screenshotPath);

      // Clean up
      await fs.unlink(screenshotPath);

      return screenshotBuffer;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to capture screenshot: ${errorMessage}`);
    }
  }

  private async getAvailableSimulators(): Promise<iOSSimulatorInfo[]> {
    try {
      const { stdout } = await execAsync("xcrun simctl list devices -j");
      const deviceList = JSON.parse(stdout);

      const simulators: iOSSimulatorInfo[] = [];

      // Process the device list JSON
      const runtimes = Object.keys(deviceList.devices);

      for (const runtime of runtimes) {
        const devices = deviceList.devices[runtime];
        for (const device of devices) {
          // Only include booted simulators
          if (!device.isDeleted && device.state === "Booted") {
            simulators.push({
              name: device.name,
              udid: device.udid,
              status: device.state,
              runtime: runtime.replace(
                "com.apple.CoreSimulator.SimRuntime.",
                ""
              ),
            });
          }
        }
      }

      if (simulators.length === 0) {
        throw new Error(
          "No booted iOS simulators found. Please start one from Xcode first."
        );
      }

      return simulators;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get available simulators: ${errorMessage}`);
    }
  }
}
