"use client";

import { useState, useEffect } from "react";

interface RatingWidgetProps {
  userId: string;
  tmdbId: number;
  mediaType: string;
}

const RATINGS = [
  { value: -2, label: "👎👎", title: "Major Dislike" },
  { value: -1, label: "👎", title: "Dislike" },
  { value: 0, label: "—", title: "Neutral" },
  { value: 1, label: "👍", title: "Like" },
  { value: 2, label: "👍👍", title: "Major Like" },
] as const;

export function RatingWidget({ userId, tmdbId, mediaType }: RatingWidgetProps) {
  const [activeRating, setActiveRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Load existing rating on mount
  useEffect(() => {
    fetch(`/api/rate?userId=${userId}&tmdbId=${tmdbId}&mediaType=${mediaType}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.rating !== null && data.rating !== undefined) {
          setActiveRating(data.rating);
        }
      })
      .catch(() => {});
  }, [userId, tmdbId, mediaType]);

  async function handleRate(value: number) {
    setSaving(true);
    try {
      await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tmdbId, mediaType, rating: value }),
      });
      setActiveRating(value);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
      {RATINGS.map(({ value, label, title }) => (
        <button
          key={value}
          title={title}
          disabled={saving}
          onClick={() => handleRate(value)}
          className={`flex-1 rounded py-0.5 text-xs transition-colors ${
            activeRating === value
              ? "bg-purple-600 text-white"
              : "bg-white/10 text-zinc-300 hover:bg-white/20"
          } disabled:opacity-50`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
