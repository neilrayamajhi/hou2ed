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
        const priceA = a.cost?.free ? 0 : (a.cost?.monthly ?? Infinity);
        const priceB = b.cost?.free ? 0 : (b.cost?.monthly ?? Infinity);
        return priceA - priceB;
      });

    case "priceDesc":
      return sorted.sort((a, b) => {
        const priceA = a.cost?.free ? 0 : (a.cost?.monthly ?? 0);
        const priceB = b.cost?.free ? 0 : (b.cost?.monthly ?? 0);
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
        const dateA = new Date(a.updated_at).getTime();
        const dateB = new Date(b.updated_at).getTime();
        return dateB - dateA;
      });

    case "rating":
      // Rating doesn't exist in the Listing type
      // Sort by responsiveness response_rate instead
      return sorted.sort((a, b) => {
        const ratingA = a.responsiveness?.response_rate ?? 0;
        const ratingB = b.responsiveness?.response_rate ?? 0;
        return ratingB - ratingA;
      });

    case "availability":
      return sorted.sort((a, b) => {
        // Sort by beds_today (descending - most available first)
        const bedsA = a.availability.beds_today;
        const bedsB = b.availability.beds_today;
        return bedsB - bedsA;
      });

    case "relevance":
    default:
      // In a real app, this would use a relevance scoring algorithm
      // For now, prioritize available beds, then by distance
      return sorted.sort((a, b) => {
        const bedsA = a.availability.beds_today;
        const bedsB = b.availability.beds_today;
        if (bedsA !== bedsB) {
          return bedsB - bedsA; // More beds = higher priority
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