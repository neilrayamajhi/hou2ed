/**
 * Sorting utilities for listings
 */

import type { Listing } from "../types/listing";
import type { SortOption } from "../types/filters";

function availabilityScore(l: Listing): number {
  if (l.availability.beds_today > 0) return 0;
  if ((l.availability.waitlist ?? 0) > 0) return 1;
  return 2;
}

function monthlyPrice(l: Listing): number {
  if (l.cost?.free) return 0;
  return l.cost?.monthly ?? 0;
}

export function sortListings(listings: Listing[], sortBy: SortOption): Listing[] {
  const sorted = [...listings];

  switch (sortBy) {
    case "priceAsc":
      return sorted.sort((a, b) => monthlyPrice(a) - monthlyPrice(b));

    case "priceDesc":
      return sorted.sort((a, b) => monthlyPrice(b) - monthlyPrice(a));

    case "distance":
      return sorted.sort(
        (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity),
      );

    case "newest":
      return sorted.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );

    case "rating":
      return sorted;

    case "availability":
      return sorted.sort((a, b) => availabilityScore(a) - availabilityScore(b));

    case "relevance":
    default:
      return sorted.sort((a, b) => {
        const availDiff = availabilityScore(a) - availabilityScore(b);
        if (availDiff !== 0) return availDiff;
        return (a.distance ?? Infinity) - (b.distance ?? Infinity);
      });
  }
}

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "priceAsc", label: "Price: Low to High" },
  { value: "priceDesc", label: "Price: High to Low" },
  { value: "distance", label: "Distance: Nearest" },
  { value: "newest", label: "Recently Updated" },
  { value: "rating", label: "Highest Rated" },
  { value: "availability", label: "Available First" },
];