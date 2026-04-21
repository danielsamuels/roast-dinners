import { useState, useCallback } from "react";
import type { MealConfig, SharedPlan } from "@/types/recipe";
import { API_BASE_URL } from "@/config/api";

interface ShareResult {
  id: string;
  url: string;
}

interface UseSharePlan {
  sharePlan: (config: MealConfig) => Promise<ShareResult>;
  loadSharedPlan: (id: string) => Promise<MealConfig | null>;
  isSharing: boolean;
  error: string | null;
}

export function useSharePlan(): UseSharePlan {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sharePlan = useCallback(async (config: MealConfig): Promise<ShareResult> => {
    setIsSharing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        throw new Error(`Failed to share plan (${response.status})`);
      }

      const data = (await response.json()) as ShareResult;
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to share plan";
      setError(message);
      throw err;
    } finally {
      setIsSharing(false);
    }
  }, []);

  const loadSharedPlan = useCallback(async (id: string): Promise<MealConfig | null> => {
    setIsSharing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/plans/${encodeURIComponent(id)}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to load shared plan (${response.status})`);
      }

      const data = (await response.json()) as SharedPlan;
      return data.config;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load shared plan";
      setError(message);
      return null;
    } finally {
      setIsSharing(false);
    }
  }, []);

  return { sharePlan, loadSharedPlan, isSharing, error };
}
