/**
 * Sorting utilities for listings
 */

import type { Listing } from "../types/listing";
import type { SortOption } from "../types/filters";

export function sortListings(listings: Listing[], sortBy: SortOption): Listing[] {
  const sorted = [...listings];

  switch (sortBy) {
    case "priceAsc":
      return sorted.sort((a, b) => {
        const priceA = a.price.isFree ? 0 : a.price.min;
        const priceB = b.price.isFree ? 0 : b.price.min;
        return priceA - priceB;
      });

    case "priceDesc":
      return sorted.sort((a, b) => {
        const priceA = a.price.isFree ? 0 : a.price.max;
        const priceB = b.price.isFree ? 0 : b.price.max;
        return priceB - priceA;
      });

    case "distance":
      return sorted.sort((a, b) => {
        const distA = a.distance ?? Infinity;
        const distB = b.distance ?? Infinity;
        return distA - distB;
      });

    case "newest":
      return sorted.sort((a, b) => {
        const dateA = new Date(a.lastUpdated).getTime();
        const dateB = new Date(b.lastUpdated).getTime();
        return dateB - dateA;
      });

    case "rating":
      return sorted.sort((a, b) => {
        const ratingA = a.rating ?? 0;
        const ratingB = b.rating ?? 0;
        return ratingB - ratingA;
      });

    case "availability":
      return sorted.sort((a, b) => {
        const availOrder = { available: 0, waitlist: 1, full: 2, unknown: 3 };
        return availOrder[a.availability] - availOrder[b.availability];
      });

    case "relevance":
    default:
      // In a real app, this would use a relevance scoring algorithm
      // For now, prioritize available, then by distance
      return sorted.sort((a, b) => {
        if (a.availability !== b.availability) {
          const availOrder = { available: 0, waitlist: 1, full: 2, unknown: 3 };
          return availOrder[a.availability] - availOrder[b.availability];
        }
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