import * as vscode from "vscode";

export class ToastService {
  private static instance: ToastService;

  private constructor() {}

  public static getInstance(): ToastService {
    if (!ToastService.instance) {
      ToastService.instance = new ToastService();
    }
    return ToastService.instance;
  }

  public showError(message: string) {
    vscode.window.showErrorMessage(message);
  }

  public showWarning(message: string) {
    vscode.window.showWarningMessage(message);
  }

  public showInfo(message: string) {
    vscode.window.showInformationMessage(message);
  }

  public async showConfirmation(message: string): Promise<boolean> {
    const result = await vscode.window.showWarningMessage(message, "Yes", "No");
    return result === "Yes";
  }

  public async showProgress(
    title: string,
    task: () => Promise<void>,
    cancellable: boolean = false
  ) {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable,
      },
      async (progress) => {
        try {
          await task();
          progress.report({ increment: 100 });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.showError(msg);
          throw error;
        }
      }
    );
  }

  // Common toast messages
  public showBrowserDisconnected() {
    this.showWarning("Browser tab disconnected");
  }

  public showNoTabConnected() {
    this.showError("No browser tab connected. Please connect a tab first.");
  }

  public showTabClosed() {
    this.showWarning("The monitored tab was closed. Monitoring has stopped.");
  }

  public showSessionDisconnected() {
    this.showError(
      "Browser session disconnected. Please reconnect to continue."
    );
  }

  public showConnectionSuccess() {
    this.showInfo("Successfully connected to browser tab");
  }

  public showLogsClearedSuccess() {
    this.showInfo("Browser logs cleared successfully");
  }

  public showLogsSentSuccess() {
    this.showInfo("Logs sent to Composer successfully");
  }

  public showScreenshotSentSuccess() {
    this.showInfo("Screenshot sent to Composer successfully");
  }

  public showPageClosedOrCrashed() {
    this.showError(
      "Browser page was closed or crashed. Please reconnect to continue monitoring."
    );
  }
}
