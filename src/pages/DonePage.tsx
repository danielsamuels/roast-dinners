import { useNavigate } from "react-router-dom";
import { useMealConfig } from "@/hooks/useMealConfig";
import { useCookingSession } from "@/hooks/useCookingSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";

export default function DonePage() {
  const navigate = useNavigate();
  const { resetConfig } = useMealConfig();
  const session = useCookingSession();

  const handlePlanAnother = () => {
    session.endSession();
    resetConfig();
    navigate("/");
  };

  return (
    <main id="main-content" className="container mx-auto max-w-md px-4 py-12 text-center">
      <div className="text-8xl animate-bounce" aria-hidden="true">🎉</div>

      <h1 className="mt-6 text-4xl font-bold tracking-tight">
        Your Roast Dinner is Ready!
      </h1>

      <p className="mt-3 text-lg text-muted-foreground">
        Everything is cooked and ready to serve. Enjoy your meal!
      </p>

      <Card className="mt-8">
        <CardContent className="py-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            <span aria-hidden="true">🍽️</span> Time to plate up and enjoy with your guests.
          </p>
          <p className="text-sm text-muted-foreground">
            Don't forget the gravy!
          </p>
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Button size="lg" onClick={handlePlanAnother}>
          <RotateCcw className="size-4" aria-hidden="true" data-icon="inline-start" />
          Plan Another Roast
        </Button>
      </div>
    </main>
  );
}
