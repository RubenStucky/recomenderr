import { Skeleton } from "@/components/ui/skeleton";

export default function UserLoading() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-8 w-20 rounded" />
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-10">
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
      </div>
    </main>
  );
}
