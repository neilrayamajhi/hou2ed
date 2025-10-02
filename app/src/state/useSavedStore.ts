import { create } from "zustand";
import { persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SavedListing {
  id: string;
  title: string;
  address: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  imageUrl: string;
  savedAt: Date;
  availableUnits?: number;
  propertyType?: string;
}

interface SavedStore {
  savedListings: SavedListing[];
  savedSearches: SavedSearch[];
  addListing: (listing: SavedListing) => void;
  removeListing: (listingId: string) => void;
  isListingSaved: (listingId: string) => boolean;
  toggleListing: (listing: SavedListing) => void;
  addSearch: (search: SavedSearch) => void;
  removeSearch: (searchId: string) => void;
  clearAll: () => void;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: {
    minRent?: number;
    maxRent?: number;
    bedrooms?: number[];
    propertyTypes?: string[];
    neighborhoods?: string[];
  };
  createdAt: Date;
}

const useSavedStore = create<SavedStore>()(
  persist(
    (set, get) => ({
      savedListings: [],
      savedSearches: [],

      addListing: (listing) =>
        set((state) => ({
          savedListings: [listing, ...state.savedListings.filter((l) => l.id !== listing.id)],
        })),

      removeListing: (listingId) =>
        set((state) => ({
          savedListings: state.savedListings.filter((l) => l.id !== listingId),
        })),

      isListingSaved: (listingId) => {
        return get().savedListings.some((l) => l.id === listingId);
      },

      toggleListing: (listing) => {
        const isSaved = get().isListingSaved(listing.id);
        if (isSaved) {
          get().removeListing(listing.id);
        } else {
          get().addListing(listing);
        }
      },

      addSearch: (search) =>
        set((state) => ({
          savedSearches: [search, ...state.savedSearches.filter((s) => s.id !== search.id)],
        })),

      removeSearch: (searchId) =>
        set((state) => ({
          savedSearches: state.savedSearches.filter((s) => s.id !== searchId),
        })),

      clearAll: () =>
        set({
          savedListings: [],
          savedSearches: [],
        }),
    }),
    {
      name: "saved-storage",
      storage: {
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
    }
  )
);

export default useSavedStore;