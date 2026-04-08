"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating, ratingToStars, starsToRating } from "@/components/star-rating";

export interface WatchHistoryItem {
  tmdbId: number;
  mediaType: string;
  title: string;
  year: string;
  posterPath: string | null;
  watchedAt: number | null;
  rating: number | null;
}

interface WatchHistoryModalProps {
  userId: string;
  onClose: () => void;
  externalItems?: WatchHistoryItem[];
}

function sortItems(list: WatchHistoryItem[]): WatchHistoryItem[] {
  const unrated = list.filter((i) => i.rating === null);
  const rated = list.filter((i) => i.rating !== null);
  return [...unrated, ...rated];
}

function mergeExternal(fetched: WatchHistoryItem[], external: WatchHistoryItem[]): WatchHistoryItem[] {
  if (external.length === 0) return fetched;
  const ids = new Set(fetched.map((i) => `${i.tmdbId}-${i.mediaType}`));
  const toAdd = external.filter((e) => !ids.has(`${e.tmdbId}-${e.mediaType}`));
  if (toAdd.length === 0) return fetched;
  return sortItems([...fetched, ...toAdd]);
}

export function WatchHistoryModal({ userId, onClose, externalItems }: WatchHistoryModalProps) {
  const [items, setItems] = useState<WatchHistoryItem[]>([]);
  const [totalWatched, setTotalWatched] = useState(0);
  const [totalRated, setTotalRated] = useState(0);
  const [loading, setLoading] = useState(true);
  const externalRef = useRef(externalItems);
  externalRef.current = externalItems;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/watch-history?userId=${userId}`);
      const data = await res.json();
      const fetched: WatchHistoryItem[] = data.items ?? [];
      setItems(mergeExternal(fetched, externalRef.current ?? []));
      setTotalWatched(data.totalWatched ?? 0);
      setTotalRated(data.totalRated ?? 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Inject newly externally-rated items while modal is open
  useEffect(() => {
    if (loading) return;
    setItems((prev) => mergeExternal(prev, externalItems ?? []));
  }, [externalItems, loading]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function submitRating(tmdbId: number, mediaType: string, stars: number) {
    const rating = starsToRating(stars);
    await fetch("/api/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, tmdbId, mediaType, rating }),
    });
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.tmdbId === tmdbId && item.mediaType === mediaType
          ? { ...item, rating }
          : item
      );
      const unrated = updated.filter((i) => i.rating === null);
      const rated = updated.filter((i) => i.rating !== null);
      setTotalRated(rated.length);
      return [...unrated, ...rated];
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-[#09090b] border border-white/10 rounded-t-xl sm:rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <History className="size-5 text-purple-400" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Watch History</h2>
              {!loading && (
                <p className="text-xs text-muted-foreground">
                  {totalWatched} watched, {totalRated} rated
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-sm text-muted-foreground">Loading…</div>
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">
                No watch history found. Try syncing first.
              </p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <ul className="divide-y divide-white/5">
              {items.map((item) => (
                <WatchHistoryRow
                  key={`${item.tmdbId}-${item.mediaType}`}
                  item={item}
                  onRate={submitRating}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function WatchHistoryRow({
  item,
  onRate,
}: {
  item: WatchHistoryItem;
  onRate: (tmdbId: number, mediaType: string, stars: number) => void;
}) {
  const posterUrl = item.posterPath
    ? `https://image.tmdb.org/t/p/w92${item.posterPath}`
    : null;

  const isTV = item.mediaType === "tv";
  const currentStars = item.rating !== null ? ratingToStars(item.rating) : null;

  return (
    <li className="px-5 py-3">
      <div className="flex items-center gap-3">
        {/* Poster */}
        <div className="shrink-0 w-10 h-[60px] rounded overflow-hidden bg-zinc-800 ring-1 ring-white/10 relative">
          {posterUrl ? (
            <Image src={posterUrl} alt={item.title} fill className="object-cover" sizes="40px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
              ?
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {item.year}
              {isTV && " · TV"}
            </p>
          </div>

          <StarRating
            value={currentStars}
            size="sm"
            onChange={(stars) => onRate(item.tmdbId, item.mediaType, stars)}
          />
        </div>
      </div>
    </li>
  );
}
