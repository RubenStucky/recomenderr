"use client";

import { useState } from "react";

/** Maps 1-5 star display values to the internal -2..2 rating scale. */
export function starsToRating(stars: number): number {
  return stars - 3; // 1→-2, 2→-1, 3→0, 4→1, 5→2
}

/** Maps the internal -2..2 rating scale to 1-5 star display values. */
export function ratingToStars(rating: number): number {
  return rating + 3; // -2→1, -1→2, 0→3, 1→4, 2→5
}

interface StarRatingProps {
  value: number | null; // 1-5, or null if unrated
  onChange?: (stars: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const starSize = size === "sm" ? "text-base" : "text-xl";
  const gap = size === "sm" ? "gap-0.5" : "gap-1";

  const activeValue = hoverValue ?? value;

  return (
    <div
      className={`flex items-center ${gap}`}
      onClick={(e) => e.stopPropagation()}
      onMouseLeave={() => setHoverValue(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          className={`${starSize} leading-none transition-colors disabled:cursor-default ${
            activeValue !== null && star <= activeValue
              ? "text-amber-400"
              : "text-zinc-600"
          } ${readonly ? "" : "cursor-pointer"}`}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
