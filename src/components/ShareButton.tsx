import { Share2, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMealConfig } from "@/hooks/useMealConfig";
import { useSharePlan } from "@/hooks/useSharePlan";
import { buildMealConfig } from "@/lib/config";

export function ShareButton() {
  const { state } = useMealConfig();
  const { sharePlan, isSharing } = useSharePlan();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const config = buildMealConfig(state);
    if (!config) {
      toast.error("Complete your meal configuration before sharing.");
      return;
    }

    try {
      const { url } = await sharePlan(config);

      // Try Web Share API first (mobile share sheet)
      if (navigator.share) {
        try {
          await navigator.share({
            title: "My Roast Dinner Plan",
            url,
          });
          toast.success("Plan shared!");
          return;
        } catch {
          // User cancelled or share failed — fall through to clipboard
        }
      }

      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to share plan. Please check your connection.");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      disabled={isSharing}
    >
      {isSharing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : copied ? (
        <Check className="mr-2 h-4 w-4" />
      ) : (
        <Share2 className="mr-2 h-4 w-4" />
      )}
      {isSharing ? "Sharing…" : copied ? "Copied!" : "Share Plan"}
    </Button>
  );
}
