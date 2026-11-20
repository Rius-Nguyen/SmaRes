"use client";

export function DishSkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#e2e8e4] overflow-hidden animate-pulse">
      <div className="aspect-[4/3] w-full bg-stone-200" />
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="h-5 bg-stone-200 rounded w-2/3" />
          <div className="h-5 bg-stone-200 rounded w-20 shrink-0" />
        </div>
        <div className="h-4 bg-stone-100 rounded w-full" />
        <div className="h-10 bg-stone-200 rounded-xl mt-4" />
      </div>
    </div>
  );
}

export function BookingSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="h-24 rounded-2xl bg-white border border-[#e2e8e4] p-4 space-y-2">
          <div className="h-4 bg-stone-200 rounded w-1/2" />
          <div className="h-3 bg-stone-100 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}