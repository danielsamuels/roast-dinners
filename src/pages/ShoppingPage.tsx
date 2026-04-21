import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Copy, Share2, ArrowLeft, ArrowRight, ShoppingCart, Eye, EyeOff } from "lucide-react";
import { useMealConfig } from "@/hooks/useMealConfig";
import { StepIndicator } from "@/components/StepIndicator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  generateShoppingList,
  formatShoppingListText,
  formatQuantity,
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_ORDER,
  type ShoppingItem,
  type ShoppingList,
} from "@/lib/shopping";
import type { ShoppingCategory } from "@/types/recipe";

function ShoppingCategorySection({
  category,
  items,
  onToggle,
  showAll,
}: {
  category: ShoppingCategory;
  items: ShoppingItem[];
  onToggle: (id: string) => void;
  showAll: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const visibleItems = showAll ? items : items.filter((i) => !i.isChecked);
  const checkedCount = items.filter((i) => i.isChecked).length;

  if (visibleItems.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
        {isOpen ? (
          <ChevronDown className="size-4 shrink-0" />
        ) : (
          <ChevronRight className="size-4 shrink-0" />
        )}
        <span className="flex-1 text-left">
          {CATEGORY_DISPLAY_NAMES[category]}
        </span>
        <span className="text-xs font-normal text-muted-foreground">
          {checkedCount > 0
            ? `${checkedCount}/${items.length} have`
            : `${items.length} item${items.length !== 1 ? "s" : ""}`}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="divide-y divide-border/50">
          {visibleItems.map((item) => (
            <li
              key={item.ingredientId}
              className={cn(
                "flex items-start gap-3 px-3 py-2.5 transition-opacity",
                item.isChecked && "opacity-40",
              )}
            >
              <Checkbox
                checked={item.isChecked}
                onCheckedChange={() => onToggle(item.ingredientId)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      item.isChecked && "line-through",
                    )}
                  >
                    {item.name}
                  </span>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatQuantity(item.quantity, item.unit)}
                  </span>
                </div>
                {item.fromDishes.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {item.fromDishes.map((dish) => (
                      <Badge
                        key={dish}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 font-normal"
                      >
                        {dish}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function BuyOnlySection({
  items,
  checkedIds,
  onToggle,
  showAll,
}: {
  items: ShoppingList["buyOnlyItems"];
  checkedIds: Set<string>;
  onToggle: (id: string) => void;
  showAll: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const visibleItems = showAll
    ? items
    : items.filter((i) => !checkedIds.has(i.id));
  const checkedCount = items.filter((i) => checkedIds.has(i.id)).length;

  if (visibleItems.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
        {isOpen ? (
          <ChevronDown className="size-4 shrink-0" />
        ) : (
          <ChevronRight className="size-4 shrink-0" />
        )}
        <span className="flex-1 text-left">Pre-made & Condiments</span>
        <span className="text-xs font-normal text-muted-foreground">
          {checkedCount > 0
            ? `${checkedCount}/${items.length} have`
            : `${items.length} item${items.length !== 1 ? "s" : ""}`}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="divide-y divide-border/50">
          {visibleItems.map((item) => {
            const isChecked = checkedIds.has(item.id);
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 transition-opacity",
                  isChecked && "opacity-40",
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => onToggle(item.id)}
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    isChecked && "line-through",
                  )}
                >
                  {item.name}
                </span>
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ShoppingPage() {
  const navigate = useNavigate();
  const { state, toggleShoppingItem } = useMealConfig();
  const [showAll, setShowAll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [checkedBuyOnly, setCheckedBuyOnly] = useState<Set<string>>(new Set());

  const shoppingList = useMemo(
    () => generateShoppingList(state, state.checkedShoppingItems),
    [state],
  );

  const toggleBuyOnly = useCallback((id: string) => {
    setCheckedBuyOnly((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = new Map<ShoppingCategory, ShoppingItem[]>();
    for (const item of shoppingList.items) {
      const existing = groups.get(item.category) ?? [];
      existing.push(item);
      groups.set(item.category, existing);
    }
    return groups;
  }, [shoppingList.items]);

  const handleCopy = useCallback(async () => {
    const text = formatShoppingListText(shoppingList);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: no clipboard API
    }
  }, [shoppingList]);

  const handleShare = useCallback(async () => {
    const text = formatShoppingListText(shoppingList);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Shopping list for ${shoppingList.meatName}`,
          text,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await handleCopy();
    }
  }, [shoppingList, handleCopy]);

  const totalItems = shoppingList.items.length + shoppingList.buyOnlyItems.length;
  const checkedCount =
    shoppingList.items.filter((i) => i.isChecked).length +
    shoppingList.buyOnlyItems.filter((i) => checkedBuyOnly.has(i.id)).length;

  return (
    <div className="container mx-auto max-w-2xl px-4 pb-24">
      <StepIndicator currentPath="/shopping" />

      {/* Summary */}
      <div className="mt-4 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingCart className="size-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Shopping List</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Shopping list for{" "}
          <span className="font-medium text-foreground">
            {shoppingList.meatName}
          </span>{" "}
          for{" "}
          <span className="font-medium text-foreground">
            {shoppingList.servings}
          </span>{" "}
          people
        </p>

        {/* Toggle + Stats */}
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAll ? (
              <>
                <Eye className="size-3.5" />
                Show all
              </>
            ) : (
              <>
                <EyeOff className="size-3.5" />
                Show items to buy
              </>
            )}
          </button>
          <span className="text-xs text-muted-foreground">
            {checkedCount}/{totalItems} checked
          </span>
        </div>
      </div>

      {/* Shopping items by category */}
      {totalItems === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p className="text-sm">No items to show.</p>
          <p className="mt-1 text-xs">
            Go back to configure your meal first.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {CATEGORY_ORDER.map((category) => {
            const items = groupedItems.get(category);
            if (!items || items.length === 0) return null;
            return (
              <ShoppingCategorySection
                key={category}
                category={category}
                items={items}
                onToggle={toggleShoppingItem}
                showAll={showAll}
              />
            );
          })}

          {/* Buy-only section */}
          {shoppingList.buyOnlyItems.length > 0 && (
            <BuyOnlySection
              items={shoppingList.buyOnlyItems}
              checkedIds={checkedBuyOnly}
              onToggle={toggleBuyOnly}
              showAll={showAll}
            />
          )}
        </div>
      )}

      {/* Export buttons */}
      {totalItems > 0 && (
        <div className="mt-6 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-1"
          >
            <Copy className="size-3.5 mr-1.5" />
            {copied ? "Copied!" : "Copy List"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex-1"
          >
            <Share2 className="size-3.5 mr-1.5" />
            Share
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/configure")}>
            <ArrowLeft className="size-4 mr-1.5" />
            Back
          </Button>
          <Button size="sm" onClick={() => navigate("/review")}>
            Review Plan
            <ArrowRight className="size-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
