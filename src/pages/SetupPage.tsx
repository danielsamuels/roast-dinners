import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChefHat, ArrowRight } from "lucide-react";

export default function SetupPage() {
  const navigate = useNavigate();

  return (
    <main id="main-content" className="container mx-auto max-w-2xl px-4 py-6">
      {/* Hero */}
      <div className="mt-16 flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <ChefHat className="size-8 text-primary" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Plan Your Roast Dinner
        </h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          We&rsquo;ll help you plan the perfect roast — from shopping list to
          perfectly timed cooking.
        </p>
      </div>

      {/* CTA */}
      <div className="mt-8 flex justify-center">
        <Button
          size="lg"
          onClick={() => navigate("/configure")}
          className="min-h-[48px] gap-2 px-6 text-base"
        >
          Start Planning
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </main>
  );
}
