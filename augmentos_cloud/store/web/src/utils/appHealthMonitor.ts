// src/utils/appHealthMonitor.ts
import axios from 'axios';

export interface AppHealthStatus {
  packageName: string;
  isHealthy: boolean;
  lastChecked: string;
  lastHealthy?: string;
  errorCount: number;
  heartbeatStarted?: string;
  heartbeatExpires?: string;
}

export interface AppHealthResponse {
  success: boolean;
  data: AppHealthStatus[];
}

class AppHealthMonitor {
  private healthCache = new Map<string, AppHealthStatus>();
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>();
  private readonly HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly HEARTBEAT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_RETRIES = 3;

  /**
   * Check if an app is healthy
   */
  async checkAppHealth(packageName: string): Promise<boolean> {
    try {
      // Check with backend first
      const response = await axios.get<{ isHealthy: boolean }>(
        `/api/apps/${packageName}/health`
      );
      return response.data.isHealthy;
    } catch (error) {
      console.error(`Health check failed for ${packageName}:`, error);
      return false;
    }
  }

  /**
   * Get health status for multiple apps
   */
  async getAppsHealthStatus(packageNames: string[]): Promise<Map<string, boolean>> {
    try {
      const response = await axios.post<AppHealthResponse>(
        `/api/apps/health/bulk`,
        { packageNames }
      );

      const healthMap = new Map<string, boolean>();
      response.data.data.forEach(status => {
        healthMap.set(status.packageName, status.isHealthy);
        this.healthCache.set(status.packageName, status);
      });

      return healthMap;
    } catch (error) {
      console.error('Bulk health check failed:', error);
      // Return all as healthy if check fails to avoid hiding apps unnecessarily
      const healthMap = new Map<string, boolean>();
      packageNames.forEach(pkg => healthMap.set(pkg, true));
      return healthMap;
    }
  }

  /**
   * Report an app error (called when app fails to respond)
   */
  async reportAppError(packageName: string, error: any): Promise<void> {
    try {
      await axios.post(`/api/apps/${packageName}/error`, {
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      });

      // Start heartbeat monitoring if not already started
      this.startHeartbeat(packageName);
    } catch (err) {
      console.error(`Failed to report error for ${packageName}:`, err);
    }
  }

  /**
   * Start heartbeat monitoring for an unhealthy app
   */
  private startHeartbeat(packageName: string): void {
    // Don't start if already monitoring
    if (this.heartbeatIntervals.has(packageName)) {
      return;
    }

    const startTime = Date.now();
    const expiryTime = startTime + this.HEARTBEAT_EXPIRY;

    console.log(`Starting heartbeat monitoring for ${packageName}`);

    const interval = setInterval(async () => {
      // Check if heartbeat has expired
      if (Date.now() > expiryTime) {
        console.log(`Heartbeat expired for ${packageName}, giving up`);
        this.stopHeartbeat(packageName);
        return;
      }

      try {
        const isHealthy = await this.checkAppHealth(packageName);
        
        if (isHealthy) {
          console.log(`App ${packageName} is healthy again, stopping heartbeat`);
          await this.markAppHealthy(packageName);
          this.stopHeartbeat(packageName);
        } else {
          console.log(`App ${packageName} still unhealthy, continuing heartbeat`);
        }
      } catch (error) {
        console.error(`Heartbeat check failed for ${packageName}:`, error);
      }
    }, this.HEARTBEAT_INTERVAL);

    this.heartbeatIntervals.set(packageName, interval);
  }

  /**
   * Stop heartbeat monitoring for an app
   */
  private stopHeartbeat(packageName: string): void {
    const interval = this.heartbeatIntervals.get(packageName);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(packageName);
    }
  }

  /**
   * Mark an app as healthy (backend call)
   */
  private async markAppHealthy(packageName: string): Promise<void> {
    try {
      await axios.post(`/api/apps/${packageName}/healthy`);
    } catch (error) {
      console.error(`Failed to mark ${packageName} as healthy:`, error);
    }
  }

  /**
   * Get cached health status
   */
  getCachedHealthStatus(packageName: string): AppHealthStatus | undefined {
    return this.healthCache.get(packageName);
  }

  /**
   * Clear all heartbeats (cleanup)
   */
  cleanup(): void {
    this.heartbeatIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.heartbeatIntervals.clear();
  }
}

// Export singleton instance
export const appHealthMonitor = new AppHealthMonitor();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    appHealthMonitor.cleanup();
  });
}