"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface SyncButtonProps {
  userId: string;
  onSyncComplete?: () => void;
}

export function SyncButton({ userId, onSyncComplete }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/sync?userId=${userId}`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        setMessage(`Synced ${data.itemsProcessed} items`);
        onSyncComplete?.();
      } else {
        setMessage("Sync failed");
      }
    } catch {
      setMessage("Sync error");
    } finally {
      setSyncing(false);
      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {message && (
        <span className="text-xs text-muted-foreground animate-in fade-in">
          {message}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={syncing}
      >
        <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing…" : "Sync"}
      </Button>
    </div>
  );
}
