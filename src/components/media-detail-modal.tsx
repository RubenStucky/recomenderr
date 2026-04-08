"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { X, Send, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingWidget } from "./rating-widget";
import type { ScoredRecommendation } from "@/types";

// TMDB genre ID → name mapping (stable data, rarely changes)
const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Sci-Fi", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  // TV-specific
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};

interface SeasonInfo {
  seasonNumber: number;
  name: string;
  episodeCount: number;
}

interface MediaDetailModalProps {
  item: ScoredRecommendation;
  userId?: string;
  onClose: () => void;
}

export function MediaDetailModal({ item, userId, onClose }: MediaDetailModalProps) {
  const posterUrl = item.posterPath
    ? `https://image.tmdb.org/t/p/w500${item.posterPath}`
    : "/placeholder-poster.svg";

  const genreNames = item.genres
    .map((id) => GENRE_MAP[id])
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-lg max-h-[90vh] flex flex-col bg-[#09090b] border border-white/10 sm:rounded-xl rounded-t-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 rounded-full bg-black/60 p-1.5 text-white/80 hover:text-white backdrop-blur-sm transition-colors"
        >
          <X className="size-4" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {/* Poster + overlay header */}
          <div className="relative w-full aspect-[3/2] sm:aspect-video">
            <Image
              src={posterUrl}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 512px"
              unoptimized={!item.posterPath}
              priority
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent" />

            {/* Title on top of poster */}
            <div className="absolute bottom-0 left-0 right-0 p-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-black/60 text-white text-[10px] border-0 backdrop-blur-sm">
                  {item.mediaType === "tv" ? "TV Series" : "Movie"}
                </Badge>
                {item.inLibrary && (
                  <Badge className="bg-green-600 text-white text-[10px] border-0">
                    In Library
                  </Badge>
                )}
              </div>
              <h2 className="text-xl font-semibold text-white">{item.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-white/70">{item.year}</span>
                {item.voteAverage > 0 && (
                  <span className="text-sm text-amber-400">★ {item.voteAverage.toFixed(1)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Genres */}
            {genreNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {genreNames.map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Overview */}
            <p className="text-sm text-zinc-300 leading-relaxed">
              {item.overview || "No description available."}
            </p>

            {/* Why recommended */}
            {item.sourceTitle && (
              <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3 space-y-1">
                <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">Why this was recommended</p>
                <p className="text-sm text-zinc-300">
                  {item.sourceTmdbId === 0
                    ? "Matches your taste profile"
                    : <>Because you watched <span className="font-medium text-foreground">{item.sourceTitle}</span></>
                  }
                </p>
                {item.score > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Match score: {Math.round(item.score * 100)}%
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 pb-2">
              {item.inLibrary && userId ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Rate this title</p>
                  <RatingWidget
                    userId={userId}
                    tmdbId={item.tmdbId}
                    mediaType={item.mediaType}
                  />
                </div>
              ) : !item.inLibrary ? (
                item.mediaType === "tv" ? (
                  <TVRequestSection tmdbId={item.tmdbId} title={item.title} />
                ) : (
                  <MovieRequestSection tmdbId={item.tmdbId} title={item.title} />
                )
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Movie Request (with confirmation) ──────────────────────────────────────

function MovieRequestSection({ tmdbId, title }: { tmdbId: number; title: string }) {
  const [step, setStep] = useState<"idle" | "confirm" | "loading" | "done" | "error">("idle");

  async function handleConfirm() {
    setStep("loading");
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, mediaType: "movie" }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("done");
      } else {
        setStep("error");
        setTimeout(() => setStep("idle"), 3000);
      }
    } catch {
      setStep("error");
      setTimeout(() => setStep("idle"), 3000);
    }
  }

  if (step === "done") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <Check className="size-4" />
        Request submitted!
      </div>
    );
  }

  if (step === "confirm" || step === "loading") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-foreground">
          Request <span className="font-medium">{title}</span>?
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={step === "loading"}
            className="bg-purple-600 hover:bg-purple-700 text-white border-0"
          >
            {step === "loading" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Send className="size-3" />
            )}
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStep("idle")}
            disabled={step === "loading"}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setStep("confirm")}
        className="border-0"
      >
        Request failed — Retry
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() => setStep("confirm")}
      className="bg-purple-600 hover:bg-purple-700 text-white border-0"
    >
      <Send className="size-3" />
      Request
    </Button>
  );
}

// ─── TV Request (with season selector) ──────────────────────────────────────

function TVRequestSection({ tmdbId, title }: { tmdbId: number; title: string }) {
  const [step, setStep] = useState<"idle" | "select" | "loading" | "done" | "error">("idle");
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<Set<number>>(new Set());
  const [showAllSeasons, setShowAllSeasons] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(false);

  const fetchSeasons = useCallback(async () => {
    setLoadingSeasons(true);
    try {
      const res = await fetch(`/api/search-tmdb?tvId=${tmdbId}`);
      const data = await res.json();
      if (data.seasons) {
        const realSeasons: SeasonInfo[] = data.seasons
          .filter((s: { season_number: number }) => s.season_number > 0)
          .map((s: { season_number: number; name: string; episode_count: number }) => ({
            seasonNumber: s.season_number,
            name: s.name,
            episodeCount: s.episode_count,
          }));
        setSeasons(realSeasons);
        // Auto-select the first season
        if (realSeasons.length > 0) {
          setSelectedSeasons(new Set([realSeasons[0].seasonNumber]));
        }
      }
    } catch {
      // Could not load seasons, will fall back to requesting all
    } finally {
      setLoadingSeasons(false);
    }
  }, [tmdbId]);

  function toggleSeason(num: number) {
    setSelectedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(num)) {
        next.delete(num);
      } else {
        next.add(num);
      }
      return next;
    });
  }

  async function handleRequest() {
    setStep("loading");
    try {
      const seasonsArray = selectedSeasons.size > 0
        ? Array.from(selectedSeasons).sort((a, b) => a - b)
        : undefined;
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId,
          mediaType: "tv",
          seasons: seasonsArray,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("done");
      } else {
        setStep("error");
        setTimeout(() => setStep("idle"), 3000);
      }
    } catch {
      setStep("error");
      setTimeout(() => setStep("idle"), 3000);
    }
  }

  function handleStartRequest() {
    setStep("select");
    fetchSeasons();
  }

  if (step === "done") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <Check className="size-4" />
        Request submitted!
      </div>
    );
  }

  if (step === "error") {
    return (
      <Button
        size="sm"
        variant="destructive"
        onClick={handleStartRequest}
        className="border-0"
      >
        Request failed — Retry
      </Button>
    );
  }

  if (step === "select" || step === "loading") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-foreground">
          Request <span className="font-medium">{title}</span>
        </p>

        {loadingSeasons ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading seasons…
          </div>
        ) : seasons.length > 0 ? (
          <div className="space-y-2">
            {/* First season - always visible */}
            <label
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 border border-white/5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedSeasons.has(seasons[0].seasonNumber)}
                onChange={() => toggleSeason(seasons[0].seasonNumber)}
                className="rounded border-white/20 bg-zinc-700 text-purple-500 focus:ring-purple-500/50"
              />
              <span className="text-sm text-foreground flex-1">
                {seasons[0].name}
              </span>
              <span className="text-xs text-muted-foreground">
                {seasons[0].episodeCount} episodes
              </span>
            </label>

            {/* Other seasons - hidden by default */}
            {seasons.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowAllSeasons(!showAllSeasons)}
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors px-1"
                >
                  {showAllSeasons ? (
                    <ChevronUp className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                  {showAllSeasons ? "Hide" : "Show"} {seasons.length - 1} more season{seasons.length - 1 > 1 ? "s" : ""}
                </button>

                {showAllSeasons && (
                  <div className="space-y-1.5">
                    {seasons.slice(1).map((s) => (
                      <label
                        key={s.seasonNumber}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 border border-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSeasons.has(s.seasonNumber)}
                          onChange={() => toggleSeason(s.seasonNumber)}
                          className="rounded border-white/20 bg-zinc-700 text-purple-500 focus:ring-purple-500/50"
                        />
                        <span className="text-sm text-foreground flex-1">
                          {s.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {s.episodeCount} episodes
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Could not load season info. Will request the full series.
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleRequest}
            disabled={step === "loading" || (seasons.length > 0 && selectedSeasons.size === 0)}
            className="bg-purple-600 hover:bg-purple-700 text-white border-0"
          >
            {step === "loading" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Send className="size-3" />
            )}
            Request{selectedSeasons.size > 0 ? ` (${selectedSeasons.size} season${selectedSeasons.size > 1 ? "s" : ""})` : ""}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStep("idle")}
            disabled={step === "loading"}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      onClick={handleStartRequest}
      className="bg-purple-600 hover:bg-purple-700 text-white border-0"
    >
      <Send className="size-3" />
      Request
    </Button>
  );
}
