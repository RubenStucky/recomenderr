"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MediaCard } from "./media-card";
import type { BecauseYouWatched, GenreCollection, ScoredRecommendation } from "@/types";

// ─── Shared scroll container ────────────────────────────────────────────────

function ScrollRow({ items, userId, onSelectItem }: { items: ScoredRecommendation[]; userId?: string; onSelectItem?: (item: ScoredRecommendation) => void }) {
  return (
    <div
      className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-thin pl-2 pr-2 -ml-2 -mr-2 pt-2 -mt-2"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {items.map((item) => (
        <div key={`${item.tmdbId}-${item.mediaType}`}>
          <MediaCard item={item} userId={userId} onSelect={onSelectItem} />
        </div>
      ))}
    </div>
  );
}

// ─── Because you watched ────────────────────────────────────────────────────

interface RecommendationRowProps {
  group: BecauseYouWatched;
  userId?: string;
  onSelectItem?: (item: ScoredRecommendation) => void;
}

export function RecommendationRow({ group, userId, onSelectItem }: RecommendationRowProps) {
  if (group.items.length === 0) return null;

  return (
    <section className="space-y-3 overflow-hidden">
      <h2 className="text-lg font-semibold text-foreground px-1">
        Because you watched{" "}
        <span className="text-purple-400">{group.sourceTitle}</span>
      </h2>
      <ScrollRow items={group.items} userId={userId} onSelectItem={onSelectItem} />
    </section>
  );
}

// ─── Because you watched (with dropdown picker) ────────────────────────────

interface BywPickerRowProps {
  groups: BecauseYouWatched[];
  userId?: string;
  onSelectItem?: (item: ScoredRecommendation) => void;
}

export function BywPickerRow({ groups, userId, onSelectItem }: BywPickerRowProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  if (groups.length === 0) return null;
  const active = groups[selectedIdx] ?? groups[0];

  return (
    <section className="space-y-3 overflow-hidden">
      <h2 className="text-lg font-semibold text-foreground px-1 flex items-center gap-1.5 flex-wrap">
        <span>Because you watched</span>
        <span className="relative inline-flex items-center">
          <select
            className="appearance-none bg-white/5 border border-white/10 rounded-lg pl-3 pr-7 py-1 text-base text-purple-400 font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500/50 cursor-pointer"
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
          >
            {groups.map((g, i) => (
              <option key={g.sourceTmdbId} value={i}>
                {g.sourceTitle}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-purple-400/60 pointer-events-none" />
        </span>
      </h2>
      <ScrollRow items={active.items} userId={userId} onSelectItem={onSelectItem} />
    </section>
  );
}

// ─── Genre Collection Row ───────────────────────────────────────────────────

interface GenreCollectionRowProps {
  collection: GenreCollection;
  userId?: string;
  onSelectItem?: (item: ScoredRecommendation) => void;
}

export function GenreCollectionRow({ collection, userId, onSelectItem }: GenreCollectionRowProps) {
  if (collection.items.length === 0) return null;

  return (
    <section className="space-y-3 overflow-hidden">
      <h2 className="text-lg font-semibold text-foreground px-1">
        Because you like{" "}
        <span className="text-purple-400">{collection.genreName}</span>
      </h2>
      <ScrollRow items={collection.items} userId={userId} onSelectItem={onSelectItem} />
    </section>
  );
}

// ─── Genre Collection (with dropdown picker) ────────────────────────────────

interface GenrePickerRowProps {
  collections: GenreCollection[];
  userId?: string;
  onSelectItem?: (item: ScoredRecommendation) => void;
}

export function GenrePickerRow({ collections, userId, onSelectItem }: GenrePickerRowProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  if (collections.length === 0) return null;
  const active = collections[selectedIdx] ?? collections[0];

  return (
    <section className="space-y-3 overflow-hidden">
      <h2 className="text-lg font-semibold text-foreground px-1 flex items-center gap-1.5 flex-wrap">
        <span>Because you like</span>
        <span className="relative inline-flex items-center">
          <select
            className="appearance-none bg-white/5 border border-white/10 rounded-lg pl-3 pr-7 py-1 text-base text-purple-400 font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500/50 cursor-pointer"
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
          >
            {collections.map((c, i) => (
              <option key={c.genreId} value={i}>
                {c.genreName}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-purple-400/60 pointer-events-none" />
        </span>
      </h2>
      <ScrollRow items={active.items} userId={userId} onSelectItem={onSelectItem} />
    </section>
  );
}

// ─── Generic titled scroll row (for Recommended / Not in library) ───────────

interface TitledScrollRowProps {
  title: string;
  items: ScoredRecommendation[];
  userId?: string;
  onSelectItem?: (item: ScoredRecommendation) => void;
}

export function TitledScrollRow({ title, items, userId, onSelectItem }: TitledScrollRowProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3 overflow-hidden">
      <h2 className="text-lg font-semibold text-foreground px-1">{title}</h2>
      <ScrollRow items={items} userId={userId} onSelectItem={onSelectItem} />
    </section>
  );
}
