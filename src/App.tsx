import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MealConfigProvider } from "@/hooks/useMealConfig";
import { TooltipProvider } from "@/components/ui/tooltip";
import SetupPage from "@/pages/SetupPage";
import ConfigurePage from "@/pages/ConfigurePage";
import ShoppingPage from "@/pages/ShoppingPage";
import ReviewPage from "@/pages/ReviewPage";
import CookPage from "@/pages/CookPage";
import DonePage from "@/pages/DonePage";

function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <MealConfigProvider>
          <div className="min-h-svh bg-background text-foreground">
            <Routes>
              <Route path="/" element={<SetupPage />} />
              <Route path="/configure" element={<ConfigurePage />} />
              <Route path="/shopping" element={<ShoppingPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/cook" element={<CookPage />} />
              <Route path="/done" element={<DonePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </MealConfigProvider>
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
