import * as vscode from "vscode";

export interface FeatureToggles {
  iOSFeatures: boolean;
}

export class FeatureToggleManager {
  private static instance: FeatureToggleManager;
  private context: vscode.ExtensionContext | undefined;

  private constructor() {}

  public static getInstance(): FeatureToggleManager {
    if (!FeatureToggleManager.instance) {
      FeatureToggleManager.instance = new FeatureToggleManager();
    }
    return FeatureToggleManager.instance;
  }

  public initialize(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  public getToggles(): FeatureToggles {
    if (!this.context) {
      return this.getDefaultToggles();
    }

    const toggles =
      this.context.globalState.get<FeatureToggles>("featureToggles");
    return toggles || this.getDefaultToggles();
  }

  public async updateToggles(toggles: FeatureToggles): Promise<void> {
    if (!this.context) {
      return;
    }

    const previousToggles = this.getToggles();
    await this.context.globalState.update("featureToggles", toggles);

    // Update context for menu visibility
    await vscode.commands.executeCommand(
      "setContext",
      "web-preview:iOSFeaturesEnabled",
      toggles.iOSFeatures
    );

    // If iOS features toggle changed, update the simulator status bar
    if (previousToggles.iOSFeatures !== toggles.iOSFeatures) {
      const iOSSimulatorMonitor =
        require("../../ios/simulator").iOSSimulatorMonitor.getInstance();
      iOSSimulatorMonitor.updateStatusBar();
    }
  }

  public getDefaultToggles(): FeatureToggles {
    return {
      iOSFeatures: false, // iOS features disabled by default
    };
  }

  public async enableiOSFeatures(enabled: boolean): Promise<void> {
    const toggles = this.getToggles();
    toggles.iOSFeatures = enabled;
    await this.updateToggles(toggles);
  }

  public isiOSFeaturesEnabled(): boolean {
    return this.getToggles().iOSFeatures;
  }
}
