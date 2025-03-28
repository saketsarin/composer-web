import * as vscode from "vscode";

export class HealthChecker {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private disconnectEmitter = new vscode.EventEmitter<void>();

  constructor() {}

  public startHealthCheck(checkFunction: () => Promise<boolean>): void {
    this.clearHealthCheck();

    this.healthCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await checkFunction();
        if (!isHealthy) {
          throw new Error("Health check failed");
        }
      } catch (error) {
        this.clearHealthCheck();
        this.disconnectEmitter.fire();
      }
    }, 5000);
  }

  public clearHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  public onDisconnect(listener: () => void): vscode.Disposable {
    return this.disconnectEmitter.event(listener);
  }

  public dispose(): void {
    this.clearHealthCheck();
    this.disconnectEmitter.dispose();
  }
}
