import { BrowserMonitor } from "../browser/monitor";
import { ComposerIntegration } from "../shared/composer/integration";
import { iOSSimulatorMonitor } from "../ios/simulator";
import { BrowserCommandHandlers } from "../browser/commands";
import { iOSCommandHandlers } from "../ios/commands";

export class CommandHandlers {
  private browserCommandHandlers: BrowserCommandHandlers;
  private iOSCommandHandlers: iOSCommandHandlers;

  constructor(
    browserMonitor: BrowserMonitor,
    composerIntegration: ComposerIntegration,
    iOSSimulatorMonitor: iOSSimulatorMonitor
  ) {
    this.browserCommandHandlers = new BrowserCommandHandlers(
      browserMonitor,
      composerIntegration
    );
    this.iOSCommandHandlers = new iOSCommandHandlers(
      iOSSimulatorMonitor,
      composerIntegration
    );
  }

  // Browser commands
  public async handleSmartCapture(): Promise<void> {
    return this.browserCommandHandlers.handleSmartCapture();
  }

  public async handleClearLogs(): Promise<void> {
    return this.browserCommandHandlers.handleClearLogs();
  }

  public async handleSendLogs(): Promise<void> {
    return this.browserCommandHandlers.handleSendLogs();
  }

  public async handleSendScreenshot(): Promise<void> {
    return this.browserCommandHandlers.handleSendScreenshot();
  }

  // iOS commands
  public async handleConnectiOSSimulator(): Promise<void> {
    return this.iOSCommandHandlers.handleConnectiOSSimulator();
  }

  public async handleSendiOSScreenshot(): Promise<void> {
    return this.iOSCommandHandlers.handleSendiOSScreenshot();
  }

  public async handleCaptureiOS(): Promise<void> {
    return this.iOSCommandHandlers.handleCaptureiOS();
  }
}
