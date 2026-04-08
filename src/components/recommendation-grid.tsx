"use client";

import { MediaCard } from "./media-card";
import type { ScoredRecommendation } from "@/types";

interface RecommendationGridProps {
  title: string;
  items: ScoredRecommendation[];
  emptyMessage?: string;
  userId?: string;
  onSelectItem?: (item: ScoredRecommendation) => void;
}

export function RecommendationGrid({
  title,
  items,
  emptyMessage = "No recommendations yet.",
  userId,
  onSelectItem,
}: RecommendationGridProps) {
  if (items.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground px-1">{title}</h2>
        <p className="text-sm text-muted-foreground px-1">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground px-1">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <MediaCard key={`${item.tmdbId}-${item.mediaType}`} item={item} userId={userId} onSelect={onSelectItem} />
        ))}
      </div>
    </section>
  );
}
