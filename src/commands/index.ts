import { BrowserMonitor } from "../browser/monitor";
import { ComposerIntegration } from "../composer/integration";
import { ToastService } from "../utils/toast";
import { iOSSimulatorMonitor } from "../ios/simulator";

export class CommandHandlers {
  private browserMonitor: BrowserMonitor;
  private composerIntegration: ComposerIntegration;
  private toastService: ToastService;
  private iOSSimulatorMonitor: iOSSimulatorMonitor;

  constructor(
    browserMonitor: BrowserMonitor,
    composerIntegration: ComposerIntegration,
    iOSSimulatorMonitor: iOSSimulatorMonitor
  ) {
    this.browserMonitor = browserMonitor;
    this.composerIntegration = composerIntegration;
    this.toastService = ToastService.getInstance();
    this.iOSSimulatorMonitor = iOSSimulatorMonitor;
  }

  public async handleSmartCapture(): Promise<void> {
    if (this.browserMonitor.isPageConnected()) {
      await this.handleCapture();
    } else {
      await this.handleConnect();
    }
  }

  public async handleClearLogs(): Promise<void> {
    if (!this.browserMonitor.isPageConnected()) {
      this.toastService.showNoTabConnected();
      return;
    }

    const confirmed = await this.toastService.showConfirmation(
      "Are you sure you want to clear all browser logs?"
    );

    if (confirmed) {
      this.browserMonitor.clearLogs();
      this.toastService.showLogsClearedSuccess();
    }
  }

  public async handleSendLogs(): Promise<void> {
    if (!this.browserMonitor.isPageConnected()) {
      this.toastService.showNoTabConnected();
      return;
    }

    try {
      await this.toastService.showProgress("Sending Logs", async () => {
        await this.composerIntegration.sendToComposer(
          undefined,
          this.browserMonitor.getLogs()
        );
      });
      this.toastService.showLogsSentSuccess();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.toastService.showError(`Failed to send logs: ${msg}`);
    }
  }

  public async handleSendScreenshot(): Promise<void> {
    if (!this.browserMonitor.isPageConnected()) {
      this.toastService.showNoTabConnected();
      return;
    }

    try {
      await this.toastService.showProgress("Capturing Screenshot", async () => {
        const page = await this.browserMonitor.getPageForScreenshot();
        if (!page) {
          throw new Error("Page not accessible");
        }

        const screenshot = await page.screenshot({
          type: "png",
          fullPage: true,
          encoding: "binary",
        });

        await this.composerIntegration.sendToComposer(
          Buffer.from(screenshot),
          undefined
        );
      });
      this.toastService.showScreenshotSentSuccess();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("Target closed") || msg.includes("Target crashed")) {
        this.toastService.showPageClosedOrCrashed();
        await this.browserMonitor.disconnect();
      } else {
        this.toastService.showError(`Screenshot capture failed: ${msg}`);
      }
    }
  }

  private async handleConnect(): Promise<void> {
    try {
      await this.browserMonitor.connect();
      this.toastService.showConnectionSuccess();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.toastService.showError(`Failed to connect: ${msg}`);
    }
  }

  private async handleCapture(): Promise<void> {
    try {
      if (!this.browserMonitor.isPageConnected()) {
        this.toastService.showNoTabConnected();
        return;
      }

      await this.toastService.showProgress("Capturing Tab Info", async () => {
        const activePage = this.browserMonitor.getActivePage();
        if (!activePage) {
          throw new Error("No active page found");
        }

        const page = await this.browserMonitor.getPageForScreenshot();
        if (!page) {
          throw new Error("Page not accessible");
        }

        const screenshot = await page.screenshot({
          type: "png",
          fullPage: true,
          encoding: "binary",
        });

        await this.composerIntegration.sendToComposer(
          Buffer.from(screenshot),
          this.browserMonitor.getLogs()
        );
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("Target closed") || msg.includes("Target crashed")) {
        this.toastService.showPageClosedOrCrashed();
        await this.browserMonitor.disconnect();
      } else {
        this.toastService.showError(`Capture failed: ${msg}`);
      }
    }
  }

  // iOS Simulator commands
  public async handleConnectiOSSimulator(): Promise<void> {
    try {
      await this.iOSSimulatorMonitor.connect();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.toastService.showError(`Failed to connect to iOS simulator: ${msg}`);
    }
  }

  public async handleCleariOSLogs(): Promise<void> {
    if (!this.iOSSimulatorMonitor.isSimulatorConnected()) {
      this.toastService.showError("No iOS simulator connected");
      return;
    }

    const confirmed = await this.toastService.showConfirmation(
      "Are you sure you want to clear all iOS simulator logs?"
    );

    if (confirmed) {
      this.iOSSimulatorMonitor.clearLogs();
      this.toastService.showInfo("iOS simulator logs cleared");
    }
  }

  public async handleSendiOSLogs(): Promise<void> {
    if (!this.iOSSimulatorMonitor.isSimulatorConnected()) {
      this.toastService.showError("No iOS simulator connected");
      return;
    }

    try {
      await this.toastService.showProgress("Sending iOS Logs", async () => {
        await this.composerIntegration.sendiOSToComposer(
          undefined,
          this.iOSSimulatorMonitor.getLogs()
        );
      });
      this.toastService.showInfo("iOS logs sent successfully");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.toastService.showError(`Failed to send iOS logs: ${msg}`);
    }
  }

  public async handleSendiOSScreenshot(): Promise<void> {
    if (!this.iOSSimulatorMonitor.isSimulatorConnected()) {
      this.toastService.showError("No iOS simulator connected");
      return;
    }

    try {
      await this.toastService.showProgress(
        "Capturing iOS Screenshot",
        async () => {
          const screenshot = await this.iOSSimulatorMonitor.captureScreenshot();
          await this.composerIntegration.sendiOSToComposer(
            screenshot,
            undefined
          );
        }
      );
      this.toastService.showInfo("iOS screenshot sent successfully");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.toastService.showError(`iOS screenshot capture failed: ${msg}`);
    }
  }

  public async handleCaptureiOS(): Promise<void> {
    if (!this.iOSSimulatorMonitor.isSimulatorConnected()) {
      this.toastService.showError("No iOS simulator connected");
      return;
    }

    try {
      await this.toastService.showProgress("Capturing iOS Info", async () => {
        const screenshot = await this.iOSSimulatorMonitor.captureScreenshot();
        await this.composerIntegration.sendiOSToComposer(
          screenshot,
          this.iOSSimulatorMonitor.getLogs()
        );
      });
      this.toastService.showInfo("iOS simulator data captured successfully");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.toastService.showError(`iOS capture failed: ${msg}`);
    }
  }
}
