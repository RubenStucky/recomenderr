"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Film, History, Star, MoreVertical, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SyncButton } from "@/components/sync-button";
import { RecommendationRow, BywPickerRow, GenreCollectionRow, GenrePickerRow, TitledScrollRow } from "@/components/recommendation-row";
import { WatchHistoryModal, WatchHistoryItem } from "@/components/watch-history-modal";
import { RateTitleDialog } from "@/components/rate-title-dialog";
import { MediaDetailModal } from "@/components/media-detail-modal";
import type { RecommendationResult, ScoredRecommendation } from "@/types";

export default function UserDashboardPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [data, setData] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScoredRecommendation | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [externalRated, setExternalRated] = useState<WatchHistoryItem[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  // Set cookie so we remember this user
  useEffect(() => {
    document.cookie = `selectedUserId=${encodeURIComponent(userId)};path=/;max-age=${60 * 60 * 24 * 30};SameSite=Lax`;
  }, [userId]);

  // Close mobile menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    }
    if (showMobileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMobileMenu]);

  function handleRated(item: { tmdbId: number; mediaType: string; title: string; year: string; posterPath: string | null; rating: number }) {
    const entry: WatchHistoryItem = {
      tmdbId: item.tmdbId,
      mediaType: item.mediaType,
      title: item.title,
      year: item.year,
      posterPath: item.posterPath,
      watchedAt: null,
      rating: item.rating,
    };
    setExternalRated((prev) => {
      const key = `${item.tmdbId}-${item.mediaType}`;
      const existing = prev.find((e) => `${e.tmdbId}-${e.mediaType}` === key);
      if (!existing) return [...prev, entry];
      return prev.map((e) => `${e.tmdbId}-${e.mediaType}` === key ? { ...e, rating: item.rating } : e);
    });
  }

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recommendations?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      const result: RecommendationResult = await res.json();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load recommendations"
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const isEmpty =
    data &&
    data.becauseYouWatched.length === 0 &&
    (data.genreCollections ?? []).length === 0 &&
    data.recommendedForYou.length === 0 &&
    data.notInLibrary.length === 0;

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Film className="size-5 text-purple-400" />
              <h1 className="text-lg font-semibold text-foreground">
                Recommendations
              </h1>
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/" onClick={() => {
              document.cookie = "selectedUserId=;path=/;max-age=0";
            }}>
              <Button variant="outline" size="sm">
                <Users className="size-3.5" />
                Switch User
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(true)}
            >
              <History className="size-3.5" />
              Watch History
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRateDialog(true)}
            >
              <Star className="size-3.5" />
              Rate a Title
            </Button>
            <SyncButton
              userId={userId}
              onSyncComplete={fetchRecommendations}
            />
          </div>

          {/* Mobile overflow menu */}
          <div className="sm:hidden relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <MoreVertical className="size-4" />
            </Button>
            {showMobileMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-900 border border-white/10 rounded-lg shadow-xl py-1 z-50">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-white/5 transition-colors"
                  onClick={() => {
                    setShowHistory(true);
                    setShowMobileMenu(false);
                  }}
                >
                  <History className="size-3.5" />
                  Watch History
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-white/5 transition-colors"
                  onClick={() => {
                    setShowRateDialog(true);
                    setShowMobileMenu(false);
                  }}
                >
                  <Star className="size-3.5" />
                  Rate a Title
                </button>
                <MobileSyncButton
                  userId={userId}
                  onSyncComplete={() => {
                    fetchRecommendations();
                    setShowMobileMenu(false);
                  }}
                />
                <div className="border-t border-white/10 my-1" />
                <Link href="/" onClick={() => {
                  document.cookie = "selectedUserId=;path=/;max-age=0";
                }}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-white/5 transition-colors"
                  >
                    <Users className="size-3.5" />
                    Switch User
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-10">
        {/* Loading state */}
        {loading && <DashboardSkeleton />}

        {/* Error state */}
        {error && !loading && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-6 text-center">
            <p className="text-sm text-destructive font-medium">{error}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Try syncing your watch history first.
            </p>
            <div className="mt-4">
              <SyncButton
                userId={userId}
                onSyncComplete={fetchRecommendations}
              />
            </div>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Film className="size-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No recommendations yet
            </h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Watch some content on Plex first, then hit Sync to generate
              personalized recommendations.
            </p>
            <SyncButton
              userId={userId}
              onSyncComplete={fetchRecommendations}
            />
          </div>
        )}

        {/* Recommendation sections */}
        {data && !loading && !isEmpty && (
          <>
            {/* Top 2 "Because you watched" rows */}
            {data.becauseYouWatched.slice(0, 2).map((group) => (
              <RecommendationRow
                key={group.sourceTmdbId}
                group={group}
                userId={userId}
                onSelectItem={setSelectedItem}
              />
            ))}

            {/* Top 2 genre collections */}
            {(data.genreCollections ?? []).slice(0, 2).map((collection) => (
              <GenreCollectionRow
                key={collection.genreId}
                collection={collection}
                userId={userId}
                onSelectItem={setSelectedItem}
              />
            ))}

            {/* Dynamic "Because you watched" picker (remaining groups) */}
            {data.becauseYouWatched.length > 2 && (
              <BywPickerRow
                groups={data.becauseYouWatched.slice(2)}
                userId={userId}
                onSelectItem={setSelectedItem}
              />
            )}

            {/* Dynamic genre picker (remaining genres) */}
            {(data.genreCollections ?? []).length > 2 && (
              <GenrePickerRow
                collections={(data.genreCollections ?? []).slice(2)}
                userId={userId}
                onSelectItem={setSelectedItem}
              />
            )}

            {/* Recommended for you (horizontal) */}
            {data.recommendedForYou.length > 0 && (
              <TitledScrollRow
                title="Recommended for you"
                items={data.recommendedForYou}
                userId={userId}
                onSelectItem={setSelectedItem}
              />
            )}

            {/* Not in library (horizontal) */}
            {data.notInLibrary.length > 0 && (
              <TitledScrollRow
                title="Not in your library"
                items={data.notInLibrary}
                userId={userId}
                onSelectItem={setSelectedItem}
              />
            )}
          </>
        )}
      </div>

      {showHistory && (
        <WatchHistoryModal userId={userId} onClose={() => setShowHistory(false)} externalItems={externalRated} />
      )}
      {showRateDialog && (
        <RateTitleDialog userId={userId} onClose={() => setShowRateDialog(false)} onRated={handleRated} />
      )}
      {selectedItem && (
        <MediaDetailModal
          item={selectedItem}
          userId={userId}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      {/* Skeleton for "Because you watched" rows */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-6 w-64 rounded" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="flex-shrink-0 w-[180px]">
                <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4 mt-2 rounded" />
                <Skeleton className="h-3 w-1/2 mt-1 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Skeleton for grid */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-48 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4 mt-2 rounded" />
              <Skeleton className="h-3 w-1/2 mt-1 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Sync Button (menu-item style) ──────────────────────────────────

function MobileSyncButton({ userId, onSyncComplete }: { userId: string; onSyncComplete: () => void }) {
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/sync?userId=${userId}`, { method: "POST" });
      const data = await res.json();
      if (data.success) onSyncComplete();
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      type="button"
      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
      onClick={handleSync}
      disabled={syncing}
    >
      <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? "Syncing…" : "Sync"}
    </button>
  );
}
