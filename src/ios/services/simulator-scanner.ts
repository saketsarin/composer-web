import { exec } from "child_process";
import { promisify } from "util";
import { iOSSimulatorInfo, iOSApp } from "../../shared/types";

const execAsync = promisify(exec);

export class SimulatorScanner {
  constructor() {}

  public async getAvailableSimulators(): Promise<iOSSimulatorInfo[]> {
    try {
      // Get list of simulators
      const { stdout } = await execAsync("xcrun simctl list devices -j");

      const simulators: iOSSimulatorInfo[] = [];
      const simData = JSON.parse(stdout);

      // Process each runtime
      if (simData.devices) {
        for (const runtime in simData.devices) {
          const runtimeName = runtime.replace(
            "com.apple.CoreSimulator.SimRuntime.",
            ""
          );
          const devices = simData.devices[runtime];

          for (const device of devices) {
            if (device.isAvailable) {
              simulators.push({
                name: device.name,
                udid: device.udid,
                runtime: runtimeName,
                status: device.state,
              });
            }
          }
        }
      }

      return simulators;
    } catch (error) {
      console.error("Error getting simulators:", error);
      throw new Error(
        "Failed to get iOS simulators. Make sure Xcode is installed."
      );
    }
  }

  public async getInstalledApps(udid: string): Promise<iOSApp[]> {
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
      throw new Error("Failed to get installed apps from simulator");
    }
  }

  public async captureScreenshot(udid: string): Promise<Buffer> {
    try {
      // Get temp file path for screenshot
      const tempPath = `/tmp/ios-simulator-screenshot-${Date.now()}.png`;

      // Capture screenshot using simctl
      await execAsync(`xcrun simctl io ${udid} screenshot "${tempPath}"`);

      // Read the file
      const fs = require("fs/promises");
      const screenshot = await fs.readFile(tempPath);

      // Clean up temp file
      await fs.unlink(tempPath).catch(() => {});

      return screenshot;
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      throw new Error("Failed to capture iOS simulator screenshot");
    }
  }
}
