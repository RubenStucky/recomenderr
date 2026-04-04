"use client";

import { MediaCard } from "./media-card";
import type { BecauseYouWatched } from "@/types";

interface RecommendationRowProps {
  group: BecauseYouWatched;
  userId?: string;
}

export function RecommendationRow({ group, userId }: RecommendationRowProps) {
  if (group.items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground px-1">
        Because you watched{" "}
        <span className="text-purple-400">{group.sourceTitle}</span>
      </h2>
      <div
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {group.items.map((item) => (
          <div
            key={`${item.tmdbId}-${item.mediaType}`}
            style={{ scrollSnapAlign: "start" }}
          >
            <MediaCard item={item} userId={userId} />
          </div>
        ))}
      </div>
    </section>
  );
}
