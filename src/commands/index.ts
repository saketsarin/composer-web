import * as vscode from "vscode";
import { BrowserMonitor } from "../browser/monitor";
import { ComposerIntegration } from "../composer/integration";

export class CommandHandlers {
  constructor(
    private readonly browserMonitor: BrowserMonitor,
    private readonly composerIntegration: ComposerIntegration
  ) {}

  public async handleSmartCapture(): Promise<void> {
    if (this.browserMonitor.isPageConnected()) {
      await this.handleCapture();
    } else {
      await this.handleConnect();
    }
  }

  public async handleClearLogs(): Promise<void> {
    if (!this.browserMonitor.isPageConnected()) {
      vscode.window.showErrorMessage(
        "No browser tab connected. Please connect a tab first."
      );
      return;
    }

    const result = await vscode.window.showWarningMessage(
      "Are you sure you want to clear all browser logs?",
      "Yes",
      "No"
    );

    if (result === "Yes") {
      this.browserMonitor.clearLogs();
      vscode.window.showInformationMessage("Browser logs cleared successfully");
    }
  }

  public async handleSendLogs(): Promise<void> {
    if (!this.browserMonitor.isPageConnected()) {
      vscode.window.showErrorMessage(
        "No browser tab connected. Please connect a tab first."
      );
      return;
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Sending Logs",
          cancellable: false,
        },
        async () => {
          await this.composerIntegration.sendToComposer(
            undefined,
            this.browserMonitor.getLogs()
          );
        }
      );
      vscode.window.showInformationMessage(
        "Logs sent to Composer successfully"
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to send logs: ${msg}`);
    }
  }

  public async handleSendScreenshot(): Promise<void> {
    if (!this.browserMonitor.isPageConnected()) {
      vscode.window.showErrorMessage(
        "No browser tab connected. Please connect a tab first."
      );
      return;
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Capturing Screenshot",
          cancellable: false,
        },
        async (progress) => {
          const page = await this.browserMonitor.getPageForScreenshot();
          if (!page) {
            throw new Error("Page not accessible");
          }

          const screenshot = await page.screenshot({
            type: "png",
            fullPage: true,
            encoding: "binary",
          });

          progress.report({ message: "Sending to Composer..." });
          await this.composerIntegration.sendToComposer(
            Buffer.from(screenshot),
            undefined
          );
        }
      );
      vscode.window.showInformationMessage(
        "Screenshot sent to Composer successfully"
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("Target closed") || msg.includes("Target crashed")) {
        vscode.window.showErrorMessage(
          "Browser page was closed or crashed. Please reconnect to continue monitoring."
        );
        await this.browserMonitor.disconnect();
      } else {
        vscode.window.showErrorMessage(`Screenshot capture failed: ${msg}`);
      }
    }
  }

  private async handleConnect(): Promise<void> {
    try {
      await this.browserMonitor.connect();
      vscode.window.showInformationMessage(
        "Successfully connected to browser tab"
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to connect: ${msg}`);
    }
  }

  private async handleCapture(): Promise<void> {
    try {
      if (!this.browserMonitor.isPageConnected()) {
        vscode.window.showErrorMessage(
          "No browser tab connected. Please connect a tab first."
        );
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Capturing Tab Info",
          cancellable: false,
        },
        async (progress) => {
          const activePage = this.browserMonitor.getActivePage();
          if (!activePage) {
            throw new Error("No active page found");
          }

          progress.report({ message: "Taking screenshot..." });
          const page = await this.browserMonitor.getPageForScreenshot();
          if (!page) {
            throw new Error("Page not accessible");
          }

          const screenshot = await page.screenshot({
            type: "png",
            fullPage: true,
            encoding: "binary",
          });

          progress.report({ message: "Sending to Composer..." });
          await this.composerIntegration.sendToComposer(
            Buffer.from(screenshot),
            this.browserMonitor.getLogs()
          );
        }
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("Target closed") || msg.includes("Target crashed")) {
        vscode.window.showErrorMessage(
          "Browser page was closed or crashed. Please reconnect to continue monitoring."
        );
        await this.browserMonitor.disconnect();
      } else {
        vscode.window.showErrorMessage(`Capture failed: ${msg}`);
      }
    }
  }
}
