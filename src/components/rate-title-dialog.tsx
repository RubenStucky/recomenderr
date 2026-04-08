"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { X, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating, starsToRating } from "@/components/star-rating";

interface SearchResult {
  tmdbId: number;
  mediaType: string;
  title: string;
  year: string;
  posterPath: string | null;
  inLibrary?: boolean;
}

interface RatedItem {
  tmdbId: number;
  mediaType: string;
  title: string;
  year: string;
  posterPath: string | null;
  rating: number;
}

interface RateTitleDialogProps {
  userId: string;
  onClose: () => void;
  onRated?: (item: RatedItem) => void;
}

export function RateTitleDialog({ userId, onClose, onRated }: RateTitleDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [pendingStars, setPendingStars] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length === 0) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const res = await fetch(`/api/search-tmdb?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data.results ?? []);
    setShowDropdown(true);
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    setPendingStars(null);
    setSaved(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  function handleSelect(result: SearchResult) {
    setSelected(result);
    setQuery(result.title);
    setShowDropdown(false);
    setPendingStars(null);
    setSaved(false);
  }

  async function handleRate(stars: number) {
    if (!selected) return;
    setSaving(true);
    const rating = starsToRating(stars);
    try {
      await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          tmdbId: selected.tmdbId,
          mediaType: selected.mediaType,
          rating,
        }),
      });
      setPendingStars(stars);
      setSaved(true);
      onRated?.({
        tmdbId: selected.tmdbId,
        mediaType: selected.mediaType,
        title: selected.title,
        year: selected.year,
        posterPath: selected.posterPath,
        rating,
      });
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  function handleRateAnother() {
    setQuery("");
    setSelected(null);
    setPendingStars(null);
    setSaved(false);
    setResults([]);
    inputRef.current?.focus();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-md bg-[#09090b] border border-white/10 rounded-t-xl sm:rounded-xl shadow-2xl overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Star className="size-5 text-purple-400" />
            <h2 className="text-base font-semibold text-foreground">Rate a Title</h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Search input */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => results.length > 0 && setShowDropdown(true)}
                placeholder="Search movies &amp; TV shows…"
                className="w-full bg-zinc-800 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            {/* Dropdown */}
            {showDropdown && results.length > 0 && (
              <ul className="absolute z-10 top-full mt-1 w-full bg-zinc-900 border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                {results.map((r) => (
                  <li key={`${r.tmdbId}-${r.mediaType}`}>
                    <button
                      type="button"
                      onClick={() => handleSelect(r)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="shrink-0 w-8 h-12 rounded overflow-hidden bg-zinc-800 relative">
                        {r.posterPath ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w92${r.posterPath}`}
                            alt={r.title}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-700" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.year} · {r.mediaType === "tv" ? "TV" : "Movie"}
                          {r.inLibrary && <span className="ml-1.5 text-purple-400">· In library</span>}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {showDropdown && results.length === 0 && query.trim().length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-zinc-900 border border-white/10 rounded-lg shadow-xl px-4 py-3 text-sm text-muted-foreground">
                No titles found.
              </div>
            )}
          </div>

          {/* Selected title + rating */}
          {selected && (
            <div className="space-y-4">
              {/* Selected item preview */}
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-white/5">
                <div className="shrink-0 w-10 h-[60px] rounded overflow-hidden bg-zinc-800 relative">
                  {selected.posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${selected.posterPath}`}
                      alt={selected.title}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-700" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{selected.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.year} · {selected.mediaType === "tv" ? "TV Series" : "Movie"}
                  </p>
                </div>
              </div>

              {/* Star rating */}
              {saved ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <p className="text-sm text-green-400 font-medium">Rating saved!</p>
                  <StarRating value={pendingStars} readonly size="md" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRateAnother}
                    className="mt-1"
                  >
                    Rate another title
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <p className="text-sm text-muted-foreground">Pick a rating</p>
                  <StarRating
                    value={pendingStars}
                    size="md"
                    onChange={saving ? undefined : handleRate}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
