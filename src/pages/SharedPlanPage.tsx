import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMealConfig } from "@/hooks/useMealConfig";
import { useSharePlan } from "@/hooks/useSharePlan";

export default function SharedPlanPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { hydrateFromMealConfig } = useMealConfig();
  const { loadSharedPlan, isSharing, error } = useSharePlan();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!planId || loadedRef.current) return;
    loadedRef.current = true;

    loadSharedPlan(planId).then((config) => {
      if (config) {
        hydrateFromMealConfig(config);
        navigate("/review", { replace: true });
      }
    });
  }, [planId, loadSharedPlan, hydrateFromMealConfig, navigate]);

  if (error) {
    return (
      <div className="container mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Plan Not Found</h1>
        <p className="text-muted-foreground">
          {navigator.onLine
            ? "This plan may have expired or the link is invalid."
            : "You appear to be offline. Please check your connection and try again."}
        </p>
        <button
          onClick={() => navigate("/")}
          className="text-primary underline underline-offset-4"
        >
          Start a new plan
        </button>
      </div>
    );
  }

  if (isSharing) {
    return (
      <div className="container mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-muted-foreground">Loading shared plan…</p>
      </div>
    );
  }

  // Brief render before redirect or error state kicks in
  return null;
}
