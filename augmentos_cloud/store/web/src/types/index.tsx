// src/types/index.tsx - Updated with health status

// Define App type enum
export enum AppType {
  STANDARD = 'standard',
  SYSTEM = 'system',
  BACKGROUND = 'background'
}

// App settings interface
export interface AppSettings {
  [key: string]: unknown;
}

/**
 * App interface for frontend
 * Matches server-side AppI but adapted for the frontend needs
 * Now includes health monitoring fields
 */
export interface AppI {
  packageName: string;
  name: string;
  description?: string;
  publicUrl?: string;
  webviewURL?: string; // URL for phone UI
  logoURL: string;
  appType?: AppType; // Type of App
  tpaType?: AppType; // TODO: remove this once we have migrated over

  // App details
  version?: string;
  settings?: AppSettings;
  permissions?: {
    type: string;
    description?: string;
  }[];

  // Frontend-specific properties
  developerId?: string; // Developer's email address
  isInstalled?: boolean;
  installedDate?: string;
  uninstallable?: boolean; // Whether the app can be uninstalled

  // Organization information
  organizationId?: string; // Reference to organization
  orgName?: string; // Name of the organization

  // Developer/Organization profile information
  developerProfile?: {
    company?: string;
    website?: string;
    contactEmail?: string;
    description?: string;
    logo?: string;
  };

  // Health monitoring fields
  isHealthy?: boolean; // Whether the app is currently healthy
  lastHealthCheck?: string; // ISO timestamp of last health check
  healthCheckError?: string; // Error message if unhealthy
  
  // Developer/tester access
  testers?: string[]; // Array of tester email addresses
  isDeveloper?: boolean; // Whether current user is the developer
  isTester?: boolean; // Whether current user is a tester

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// Install info interface
export interface InstallInfo {
  packageName: string;
  installedDate: string;
}

// User interface
export interface User {
  id: string;
  email: string;
  installedApps?: InstallInfo[];
  createdAt?: string;
  updatedAt?: string;
}

// Health status interface for monitoring
export interface AppHealthStatus {
  packageName: string;
  isHealthy: boolean;
  lastChecked: string;
  lastHealthy?: string;
  errorCount: number;
  heartbeatStarted?: string;
  heartbeatExpires?: string;
  errorMessages?: string[];
}

// Health check result interface
export interface HealthCheckResult {
  packageName: string;
  isHealthy: boolean;
  responseTime?: number;
  error?: string;
  timestamp: string;
}

// Bulk health check request/response
export interface BulkHealthCheckRequest {
  packageNames: string[];
}

export interface BulkHealthCheckResponse {
  results: HealthCheckResult[];
  timestamp: string;
}

// Error reporting interface
export interface AppErrorReport {
  packageName: string;
  error: string;
  timestamp: string;
  userId?: string;
  operation?: string; // 'install', 'uninstall', 'start', 'stop', 'open', etc.
  userAgent?: string;
  additionalContext?: Record<string, any>;
}