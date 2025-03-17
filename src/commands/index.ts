import { BrowserMonitor } from "../browser/monitor";
import { ComposerIntegration } from "../composer/integration";
import { ToastService } from "../utils/toast";

export class CommandHandlers {
  private browserMonitor: BrowserMonitor;
  private composerIntegration: ComposerIntegration;
  private toastService: ToastService;

  constructor(
    browserMonitor: BrowserMonitor,
    composerIntegration: ComposerIntegration
  ) {
    this.browserMonitor = browserMonitor;
    this.composerIntegration = composerIntegration;
    this.toastService = ToastService.getInstance();
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
}
