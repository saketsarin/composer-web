import { ToastService } from "./toast";

// Custom error types
export class BrowserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrowserError";
  }
}

export class SimulatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulatorError";
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class ComposerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComposerError";
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private toastService: ToastService;

  private constructor() {
    this.toastService = ToastService.getInstance();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handleError(
    error: unknown,
    context: string,
    silent: boolean = false
  ): void {
    const errorMessage = this.formatErrorMessage(error);

    // Log error with context
    console.error(`[${context}]`, error);

    // Show error to user unless silent mode is requested
    if (!silent) {
      this.toastService.showError(`${context}: ${errorMessage}`);
    }
  }

  public async handleErrorWithProgress<T>(
    context: string,
    operation: () => Promise<T>,
    progressTitle: string
  ): Promise<T> {
    let result: T;
    try {
      await this.toastService.showProgress(progressTitle, async () => {
        result = await operation();
      });
      return result!;
    } catch (error) {
      this.handleError(error, context);
      throw error;
    }
  }

  private formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  // Helper methods for common error scenarios
  public handleBrowserError(error: unknown, context: string): void {
    if (error instanceof BrowserError) {
      this.handleError(error, context);
    } else {
      this.handleError(
        new BrowserError(this.formatErrorMessage(error)),
        context
      );
    }
  }

  public handleSimulatorError(error: unknown, context: string): void {
    if (error instanceof SimulatorError) {
      this.handleError(error, context);
    } else {
      this.handleError(
        new SimulatorError(this.formatErrorMessage(error)),
        context
      );
    }
  }

  public handleConfigError(error: unknown, context: string): void {
    if (error instanceof ConfigurationError) {
      this.handleError(error, context);
    } else {
      this.handleError(
        new ConfigurationError(this.formatErrorMessage(error)),
        context
      );
    }
  }

  public handleComposerError(error: unknown, context: string): void {
    if (error instanceof ComposerError) {
      this.handleError(error, context);
    } else {
      this.handleError(
        new ComposerError(this.formatErrorMessage(error)),
        context
      );
    }
  }
}
