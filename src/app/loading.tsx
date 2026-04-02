import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="text-center mb-12">
        <Skeleton className="h-10 w-64 mx-auto rounded" />
        <Skeleton className="h-5 w-80 mx-auto mt-3 rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-3xl w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-4 p-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        ))}
      </div>
    </main>
  );
}
