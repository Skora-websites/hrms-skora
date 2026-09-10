import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface SummaryCardDef {
  label: string;
  value: string | number;
  colorClass?: string;
}

interface SummaryCardsProps {
  cards: SummaryCardDef[];
  loading?: boolean;
  columns?: 2 | 4;
}

export function SummaryCards({ cards, loading, columns = 4 }: SummaryCardsProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "grid gap-4 mb-6",
          columns === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"
        )}
      >
        {Array.from({ length: cards.length }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4 mb-6",
        columns === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"
      )}
    >
      {cards.map((card, i) => (
        <Card key={i}>
          <CardContent className="p-3">
            <p className="text-xs text-muted font-semibold">{card.label}</p>
            <p className={cn("text-xl font-bold mt-1", card.colorClass || "text-dark dark:text-white")}>
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
