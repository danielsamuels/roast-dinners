import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMealConfig } from "@/hooks/useMealConfig";
import { useSharePlan } from "@/hooks/useSharePlan";

export default function SharedPlanPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { hydrateFromMealConfig } = useMealConfig();
  const { loadSharedPlan, isSharing, error } = useSharePlan();
  const lastLoadedPlanId = useRef<string | null>(null);

  useEffect(() => {
    if (!planId || lastLoadedPlanId.current === planId) return;
    lastLoadedPlanId.current = planId;

    loadSharedPlan(planId).then((config) => {
      if (config) {
        hydrateFromMealConfig(config);
        navigate("/review", { replace: true });
      }
    });
  }, [planId, loadSharedPlan, hydrateFromMealConfig, navigate]);

  const handleRetry = () => {
    lastLoadedPlanId.current = null;
  };

  if (error) {
    return (
      <main id="main-content" className="container mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Plan Not Found</h1>
        <p className="text-muted-foreground">
          {navigator.onLine
            ? "This plan may have expired or the link is invalid."
            : "You appear to be offline. Please check your connection and try again."}
        </p>
        <button
          onClick={handleRetry}
          className="text-primary underline underline-offset-4"
        >
          Try again
        </button>
        <button
          onClick={() => navigate("/")}
          className="text-primary underline underline-offset-4"
        >
          Start a new plan
        </button>
      </main>
    );
  }

  if (isSharing) {
    return (
      <main id="main-content" className="container mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" aria-hidden="true" />
        <p className="text-muted-foreground" role="status">Loading shared plan…</p>
      </main>
    );
  }

  // Brief render before redirect or error state kicks in
  return null;
}
