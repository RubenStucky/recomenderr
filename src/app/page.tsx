"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCard } from "@/components/user-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TautulliUser } from "@/types";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function HomePage() {
  const router = useRouter();
  const [users, setUsers] = useState<TautulliUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for saved user cookie and redirect
    const savedUserId = getCookie("selectedUserId");
    if (savedUserId) {
      router.replace(`/user/${savedUserId}`);
      return;
    }

    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setUsers(data.users);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to connect to Tautulli"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">
          🎬 Plex Recommender
        </h1>
        <p className="mt-3 text-muted-foreground text-lg">
          Select a user to view personalized recommendations
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="max-w-md w-full rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-center">
          <p className="text-sm text-destructive font-medium">
            Connection Error
          </p>
          <p className="text-xs text-destructive/80 mt-1">{error}</p>
          <p className="text-xs text-muted-foreground mt-3">
            Make sure Tautulli is running and your environment variables are
            configured correctly.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-3xl w-full">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-4 p-6">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* User grid */}
      {!loading && !error && users.length === 0 && (
        <p className="text-muted-foreground">
          No users found. Is Tautulli configured?
        </p>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-3xl w-full">
          {users.map((user) => (
            <UserCard key={user.userId} user={user} />
          ))}
        </div>
      )}
    </main>
  );
}
