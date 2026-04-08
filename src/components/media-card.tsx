"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { ScoredRecommendation } from "@/types";

interface MediaCardProps {
  item: ScoredRecommendation;
  userId?: string;
  onSelect?: (item: ScoredRecommendation) => void;
}

export function MediaCard({ item, onSelect }: MediaCardProps) {
  const posterUrl = item.posterPath
    ? `https://image.tmdb.org/t/p/w300${item.posterPath}`
    : "/placeholder-poster.svg";

  return (
    <button
      type="button"
      className="group relative flex-shrink-0 w-[calc(50vw-2rem)] sm:w-[180px] text-left cursor-pointer"
      onClick={() => onSelect?.(item)}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800 outline outline-1 outline-white/10 sm:group-hover:outline-2 sm:group-hover:outline-purple-500/50 transition-[outline-color] duration-200">
        <Image
          src={posterUrl}
          alt={item.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 45vw, 180px"
          unoptimized={!item.posterPath}
        />

        {/* Status badge */}
        {item.inLibrary && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-green-600 text-white text-[10px] border-0">
              In Library
            </Badge>
          </div>
        )}

        {/* Media type badge */}
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-black/60 text-white text-[10px] border-0 backdrop-blur-sm">
            {item.mediaType === "tv" ? "TV" : "Movie"}
          </Badge>
        </div>
      </div>

      {/* Title and year */}
      <div className="mt-2 px-0.5">
        <p className="text-sm font-medium text-foreground truncate">
          {item.title}
        </p>
        <div className="flex items-center gap-1.5">
          <p className="text-xs text-muted-foreground">{item.year}</p>
          {item.voteAverage > 0 && (
            <p className="text-xs text-amber-400">
              ★ {item.voteAverage.toFixed(1)}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
