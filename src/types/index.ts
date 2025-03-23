export interface BrowserLog {
  type: string;
  args: string[];
  timestamp: number;
}

export interface NetworkRequest {
  url: string;
  status: number;
  error?: string;
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

export interface iOSLog {
  message: string;
  timestamp: number;
  level: string;
  processId?: string;
  processName?: string;
}

export interface iOSLogData {
  logs: iOSLog[];
  device: iOSSimulatorInfo;
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
  mac: string;
}

export interface LogData {
  console: BrowserLog[];
  network: NetworkRequest[];
}
