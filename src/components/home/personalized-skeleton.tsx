export function PersonalizedSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Continue Reading skeleton */}
      <div>
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-48">
              <div className="aspect-[2/3] bg-muted rounded-lg mb-2" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
      {/* Carousel skeleton */}
      <div>
        <div className="h-6 w-56 bg-muted rounded mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-40">
              <div className="aspect-[2/3] bg-muted rounded-lg mb-2" />
              <div className="h-4 w-28 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
