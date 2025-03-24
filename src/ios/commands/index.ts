import { iOSSimulatorMonitor } from "../simulator";
import { ComposerIntegration } from "../../shared/composer/integration";
import { ToastService } from "../../shared/utils/toast";

export class iOSCommandHandlers {
  private iOSSimulatorMonitor: iOSSimulatorMonitor;
  private composerIntegration: ComposerIntegration;
  private toastService: ToastService;

  constructor(
    iOSSimulatorMonitor: iOSSimulatorMonitor,
    composerIntegration: ComposerIntegration
  ) {
    this.iOSSimulatorMonitor = iOSSimulatorMonitor;
    this.composerIntegration = composerIntegration;
    this.toastService = ToastService.getInstance();
  }

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
