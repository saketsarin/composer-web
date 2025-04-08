import * as vscode from "vscode";

export class HealthChecker {
  private static instance: HealthChecker;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private disconnectEmitter = new vscode.EventEmitter<void>();

  private constructor() {}

  public static getInstance(): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker();
    }
    return HealthChecker.instance;
  }

  public startChecking(checkFunction: () => Promise<void>): void {
    this.clearHealthCheck();

    this.healthCheckInterval = setInterval(async () => {
      try {
        await checkFunction();
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
