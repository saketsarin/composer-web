export interface BrowserLog {
  type: string;
  args: string[];
  timestamp: number;
  message: string;
}

export interface NetworkRequest {
  url: string;
  status: number;
  error?: string;
  timestamp: number;
  method: string;
  duration?: number;
}

export interface DOMEvent {
  type: string;
  target: string;
  timestamp: number;
}

export interface Exception {
  message: string;
  stack?: string;
  timestamp: number;
}

export interface MonitoredPage {
  title: string;
  url: string;
  id: string;
}

export interface iOSSimulatorInfo {
  name: string;
  udid: string;
  status: string;
  runtime: string;
}

export interface iOSApp {
  name: string;
  bundleId: string;
}

export interface ExtensionConfig {
  captureFormat: "png" | "jpg";
  includeStyles: boolean;
  quality: number;
  remoteDebuggingUrl: string;
  customKeybindings?: KeybindConfig[];
}

export interface KeybindConfig {
  command: string;
  key: string;
  mac?: string;
}

export interface LogData {
  console: BrowserLog[];
  network: NetworkRequest[];
  exceptions?: Exception[];
  domEvents?: DOMEvent[];
}
