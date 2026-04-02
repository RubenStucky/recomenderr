"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SyncButton } from "@/components/sync-button";
import { RecommendationRow } from "@/components/recommendation-row";
import { RecommendationGrid } from "@/components/recommendation-grid";
import type { RecommendationResult } from "@/types";

export default function UserDashboardPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [data, setData] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    data.recommendedForYou.length === 0 &&
    data.notInLibrary.length === 0;

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon-sm">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Film className="size-5 text-purple-400" />
              <h1 className="text-lg font-semibold text-foreground">
                Recommendations
              </h1>
            </div>
          </div>
          <SyncButton
            userId={userId}
            onSyncComplete={fetchRecommendations}
          />
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
            {/* Because you watched rows */}
            {data.becauseYouWatched.map((group) => (
              <RecommendationRow
                key={group.sourceTmdbId}
                group={group}
              />
            ))}

            {/* Recommended for you grid */}
            {data.recommendedForYou.length > 0 && (
              <RecommendationGrid
                title="Recommended for you"
                items={data.recommendedForYou}
              />
            )}

            {/* Not in library */}
            {data.notInLibrary.length > 0 && (
              <RecommendationGrid
                title="Not in your library"
                items={data.notInLibrary}
                emptyMessage="Everything recommended is already in your library!"
              />
            )}
          </>
        )}
      </div>
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
