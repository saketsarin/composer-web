import * as vscode from "vscode";
import { ComposerIntegration } from "./composer/integration";
import { BrowserMonitor } from "./browser/monitor";

export function activate(context: vscode.ExtensionContext) {
  const composerIntegration = ComposerIntegration.getInstance(context);
  const browserMonitor = BrowserMonitor.getInstance();

  async function handleCapture() {
    try {
      if (!browserMonitor.isPageConnected()) {
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
          const activePage = browserMonitor.getActivePage();
          if (!activePage) {
            throw new Error("No active page found");
          }

          progress.report({ message: "Taking screenshot..." });
          const page = await browserMonitor.getPageForScreenshot();
          if (!page) {
            throw new Error("Page not accessible");
          }

          const screenshot = await page.screenshot({
            type: "png",
            fullPage: true,
            encoding: "binary",
          });

          progress.report({ message: "Sending to Composer..." });
          await composerIntegration.sendToComposer(
            Buffer.from(screenshot),
            browserMonitor.getLogs()
          );
        }
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("Target closed") || msg.includes("Target crashed")) {
        vscode.window.showErrorMessage(
          "Browser page was closed or crashed. Please reconnect to continue monitoring."
        );
        await browserMonitor.disconnect();
      } else {
        vscode.window.showErrorMessage(`Capture failed: ${msg}`);
      }
    }
  }

  async function handleConnect() {
    try {
      await browserMonitor.connect();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to connect: ${msg}`);
    }
  }

  async function handleSmartCapture() {
    if (browserMonitor.isPageConnected()) {
      await handleCapture();
    } else {
      await handleConnect();
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("web-preview.connectTab", handleConnect),
    vscode.commands.registerCommand("web-preview.captureTab", handleCapture),
    vscode.commands.registerCommand(
      "web-preview.smartCapture",
      handleSmartCapture
    ),
    browserMonitor
  );
}

export function deactivate() {}
