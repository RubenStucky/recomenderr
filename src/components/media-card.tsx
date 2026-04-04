"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { ScoredRecommendation } from "@/types";
import { RequestButton } from "./request-button";
import { RatingWidget } from "./rating-widget";

interface MediaCardProps {
  item: ScoredRecommendation;
  userId?: string;
}

export function MediaCard({ item, userId }: MediaCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const posterUrl = item.posterPath
    ? `https://image.tmdb.org/t/p/w300${item.posterPath}`
    : "/placeholder-poster.svg";

  return (
    <div
      className="group relative flex-shrink-0 w-[160px] sm:w-[180px] transition-transform duration-200 hover:scale-105"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/10 transition-all group-hover:ring-2 group-hover:ring-purple-500/50">
        <Image
          src={posterUrl}
          alt={item.title}
          fill
          className="object-cover"
          sizes="180px"
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

        {/* Hover overlay */}
        <div
          className={`absolute inset-0 bg-black/80 p-3 flex flex-col justify-end transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-xs text-zinc-300 line-clamp-4 mb-2">
            {item.overview || "No description available."}
          </p>
          {item.voteAverage > 0 && (
            <p className="text-xs text-amber-400 mb-2">
              ★ {item.voteAverage.toFixed(1)}
            </p>
          )}
          {item.inLibrary && userId && (
            <RatingWidget
              userId={userId}
              tmdbId={item.tmdbId}
              mediaType={item.mediaType}
            />
          )}
          {!item.inLibrary && (
            <RequestButton
              tmdbId={item.tmdbId}
              mediaType={item.mediaType}
              size="sm"
            />
          )}
        </div>
      </div>

      {/* Title and year */}
      <div className="mt-2 px-0.5">
        <p className="text-sm font-medium text-foreground truncate">
          {item.title}
        </p>
        <p className="text-xs text-muted-foreground">{item.year}</p>
      </div>
    </div>
  );
}
