// src/hooks/useAppHealth.tsx
import { useState, useEffect, useCallback } from 'react';
import { AppI } from '../types';
import { appHealthMonitor } from '../utils/appHealthMonitor';
import { useAuth } from './useAuth';

interface UseAppHealthReturn {
  filterHealthyApps: (apps: AppI[]) => AppI[];
  reportAppError: (packageName: string, error: any) => Promise<void>;
  isAppHealthy: (packageName: string) => boolean;
  refreshHealthStatus: () => Promise<void>;
  isLoading: boolean;
}

export function useAppHealth(): UseAppHealthReturn {
  const { user } = useAuth();
  const [healthStatusMap, setHealthStatusMap] = useState<Map<string, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Check if user is a developer/tester for an app
   */
  const isUserDeveloperOrTester = useCallback((app: AppI): boolean => {
    if (!user) return false;
    
    // Check if user is the developer
    if (app.developerId === user.email) {
      return true;
    }
    
    // Add additional checks for testers if you have that data
    // For example, if you have a testers array in the app object:
    // if (app.testers?.includes(user.email)) {
    //   return true;
    // }
    
    return false;
  }, [user]);

  /**
   * Filter apps based on health status
   */
  const filterHealthyApps = useCallback((apps: AppI[]): AppI[] => {
    return apps.filter(app => {
      // Always show apps to their developers/testers
      if (isUserDeveloperOrTester(app)) {
        return true;
      }
      
      // Check health status
      const isHealthy = healthStatusMap.get(app.packageName);
      
      // If health status is unknown, assume healthy to avoid hiding unnecessarily
      return isHealthy !== false;
    });
  }, [healthStatusMap, isUserDeveloperOrTester]);

  /**
   * Check if a specific app is healthy
   */
  const isAppHealthy = useCallback((packageName: string): boolean => {
    const healthStatus = healthStatusMap.get(packageName);
    return healthStatus !== false; // Assume healthy if unknown
  }, [healthStatusMap]);

  /**
   * Report an error for an app
   */
  const reportAppError = useCallback(async (packageName: string, error: any): Promise<void> => {
    console.log(`Reporting error for app ${packageName}:`, error);
    
    // Update local state immediately
    setHealthStatusMap(prev => new Map(prev).set(packageName, false));
    
    // Report to monitoring service
    await appHealthMonitor.reportAppError(packageName, error);
  }, []);

  /**
   * Refresh health status for all apps
   */
  const refreshHealthStatus = useCallback(async (): Promise<void> => {
    // This would typically be called when fetching apps
    // The actual health checking is done server-side and returned with app data
  }, []);

  /**
   * Update health status from app data
   */
  const updateHealthFromApps = useCallback((apps: AppI[]): void => {
    const newHealthMap = new Map<string, boolean>();
    
    apps.forEach(app => {
      // Check if app has health status metadata
      // You might add this to your AppI interface
      const isHealthy = (app as any).isHealthy !== false;
      newHealthMap.set(app.packageName, isHealthy);
    });
    
    setHealthStatusMap(newHealthMap);
  }, []);

  /**
   * Bulk check health status for apps
   */
  const bulkCheckHealth = useCallback(async (apps: AppI[]): Promise<void> => {
    if (apps.length === 0) return;
    
    setIsLoading(true);
    try {
      const packageNames = apps.map(app => app.packageName);
      const healthMap = await appHealthMonitor.getAppsHealthStatus(packageNames);
      setHealthStatusMap(healthMap);
    } catch (error) {
      console.error('Failed to bulk check app health:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    filterHealthyApps,
    reportAppError,
    isAppHealthy,
    refreshHealthStatus,
    isLoading
  };
}