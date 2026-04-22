import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MealConfigProvider } from "@/hooks/useMealConfig";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const SetupPage = lazy(() => import("./pages/SetupPage"));
const ConfigurePage = lazy(() => import("./pages/ConfigurePage"));
const ShoppingPage = lazy(() => import("./pages/ShoppingPage"));
const CookingDayPage = lazy(() => import("./pages/CookingDayPage"));
const ReviewPage = lazy(() => import("./pages/ReviewPage"));
const CookPage = lazy(() => import("./pages/CookPage"));
const DonePage = lazy(() => import("./pages/DonePage"));
const SharedPlanPage = lazy(() => import("./pages/SharedPlanPage"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      Loading…
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <MealConfigProvider>
          {/* Skip to content link */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
          >
            Skip to content
          </a>
          <div className="min-h-svh bg-background text-foreground">
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<SetupPage />} />
                <Route path="/configure" element={<ConfigurePage />} />
                <Route path="/shopping" element={<ShoppingPage />} />
                <Route path="/cooking-day" element={<CookingDayPage />} />
                <Route path="/review" element={<ReviewPage />} />
                <Route path="/cook" element={<CookPage />} />
                <Route path="/done" element={<DonePage />} />
                <Route path="/p/:planId" element={<SharedPlanPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
          <Toaster />
        </MealConfigProvider>
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
