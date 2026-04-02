"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Send } from "lucide-react";

interface RequestButtonProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
  size?: "default" | "sm" | "xs";
}

export function RequestButton({
  tmdbId,
  mediaType,
  size = "default",
}: RequestButtonProps) {
  const [status, setStatus] = useState<
    "idle" | "loading" | "requested" | "error"
  >("idle");

  async function handleRequest() {
    if (status === "requested" || status === "loading") return;
    setStatus("loading");

    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, mediaType }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus("requested");
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  if (status === "requested") {
    return (
      <Button
        size={size}
        variant="secondary"
        disabled
        className="bg-amber-600/20 text-amber-400 border-0"
      >
        <Check className="size-3" />
        Requested
      </Button>
    );
  }

  if (status === "error") {
    return (
      <Button
        size={size}
        variant="destructive"
        onClick={handleRequest}
        className="border-0"
      >
        Failed — Retry
      </Button>
    );
  }

  return (
    <Button
      size={size}
      onClick={handleRequest}
      disabled={status === "loading"}
      className="bg-purple-600 hover:bg-purple-700 text-white border-0"
    >
      {status === "loading" ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Send className="size-3" />
      )}
      Request
    </Button>
  );
}
