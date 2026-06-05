# Interactive Walkthrough: Clicking a Listing

**Let's trace EXACTLY what happens when you click a listing card!**

This walkthrough shows you the actual code from your app, step by step.

---

## The Journey

```
User sees listing on map
       ↓
User taps listing card
       ↓
App navigates to details screen
       ↓
Screen loads listing data
       ↓
Screen displays listing details
```

Let's follow this journey through the actual code!

---

## Step 1: User Sees Listings on HomeScreen

**File:** `app/src/screens/Home/HomeScreen.tsx`

### The Setup

When HomeScreen loads, it does these things:

```tsx
// Line ~140 - Get filters from global store
const filters = useFilterStore((state) => state.filters);

// Line ~145 - Get user's current location
const [userLocation, setUserLocation] = useState(null);

useEffect(() => {
  (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }
  })();
}, []);
```

**What's happening:**
1. `useFilterStore` gets the search filters (city, amenities, etc.) from global state
2. `useState(null)` creates a variable to store user's GPS location
3. `useEffect` asks for location permission and gets current position
4. This only runs once (empty `[]` dependency array)

### Fetching Listings

```tsx
// Line ~180 - Use custom hook to search for listings
const {
  listings,      // Array of listings
  isLoading,     // True while fetching
  error          // Error message if fetch fails
} = useSearch({
  ...filters,  // Spread operator: includes all filter properties
  latitude: userLocation?.latitude,
  longitude: userLocation?.longitude,
  radius: 50,  // Search within 50 miles
});
```

**What's happening:**
1. `useSearch` is a custom hook (we'll look at this next!)
2. It takes filters + user location
3. Returns listings array, loading state, and any errors
4. `...filters` spreads all filter properties (like unpacking a box)

**What does useSearch do?** Let's look:

---

## Step 2: The useSearch Hook

**File:** `app/src/hooks/useSearch.ts`

```tsx
import { useQuery } from '@tanstack/react-query';
import { listingService } from '../services/listing.service';

export function useSearch(params: SearchParams) {
  const { data, isLoading, error } = useQuery({
    // Cache key - used to cache results
    queryKey: ['listings', params],

    // Function to fetch data
    queryFn: () => listingService.searchListings(params),

    // Only fetch if we have location
    enabled: !!params.latitude && !!params.longitude,
  });

  return {
    listings: data || [],
    isLoading,
    error,
  };
}
```

**What's happening:**
1. `useQuery` is from React Query - it handles data fetching & caching
2. `queryKey` is unique identifier - if key changes, re-fetch data
3. `queryFn` is the function that actually fetches data
4. `enabled` only runs query if we have location (!! converts to boolean)
5. Returns listings (or empty array if loading), loading state, error

**What does listingService.searchListings do?** Let's look:

---

## Step 3: The Listing Service

**File:** `app/src/services/listing.service.ts`

```tsx
import { supabase } from '../lib/supabase';

export const listingService = {
  async searchListings(params: SearchParams) {
    try {
      // Start building the query
      let query = supabase
        .from('listings')           // From the listings table
        .select('*')                // Get all columns
        .eq('status', 'active');    // Where status = 'active'

      // Add location filter if provided
      if (params.latitude && params.longitude) {
        // Use PostGIS for geographic search
        query = query.rpc('listings_near_location', {
          lat: params.latitude,
          lng: params.longitude,
          radius_miles: params.radius || 50,
        });
      }

      // Add city filter
      if (params.city) {
        query = query.ilike('city', `%${params.city}%`);
        // ilike = case-insensitive search
        // % = wildcard (matches anything before/after)
      }

      // Add amenities filter
      if (params.amenities?.length > 0) {
        query = query.contains('amenities', params.amenities);
        // contains = array contains all these values
      }

      // Add bed availability filter
      if (params.bedsAvailable) {
        query = query.gt('available_beds', 0);
        // gt = greater than
      }

      // Execute the query
      const { data, error } = await query;

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error searching listings:', error);
      throw error;
    }
  },
};
```

**What's happening:**
1. Import supabase client
2. `supabase.from('listings')` starts a query on the listings table
3. `.select('*')` means "get all columns"
4. `.eq('status', 'active')` filters to only active listings
5. Build up more filters based on params
6. `await query` executes the query and waits for results
7. Return the data

**The query is sent to Supabase server, which runs SQL and returns results!**

---

## Step 4: Back to HomeScreen - Rendering Listings

**File:** `app/src/screens/Home/HomeScreen.tsx`

Now that we have listings, let's display them:

```tsx
// Line ~250 - Show loading state
{isLoading && <ActivityIndicator size="large" color={colors.gold} />}

// Line ~260 - Render map with markers
<MapView
  region={{
    latitude: userLocation?.latitude || 37.7749,
    longitude: userLocation?.longitude || -122.4194,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  }}
  onRegionChange={handleRegionChange}
>
  {listings.map((listing) => (
    <Marker
      key={listing.id}
      coordinate={{
        latitude: listing.latitude,
        longitude: listing.longitude,
      }}
      title={listing.title}
      onPress={() => handleMarkerPress(listing)}
    />
  ))}
</MapView>

// Line ~300 - Show list view of listings
<FlatList
  data={listings}
  renderItem={({ item }) => (
    <ListingCard
      listing={item}
      onPress={() => openDetails(item)}
    />
  )}
  keyExtractor={(item) => item.id}
/>
```

**What's happening:**
1. While loading, show a spinner
2. MapView shows the map centered on user location
3. `listings.map()` creates a Marker for each listing
4. FlatList shows a scrollable list of cards
5. Each card has an `onPress` handler

**When user taps, it calls `openDetails(item)`. Let's see what that does:**

```tsx
// Line ~421
const openDetails = useCallback(
  (listing: MarketplaceListing) => {
    navigation.navigate('ListingDetails', {
      listingId: listing.id,
      listing: listing,
    });
  },
  [navigation]
);
```

**What's happening:**
1. `useCallback` memoizes (remembers) this function so it doesn't get recreated on every render
2. `navigation.navigate` tells React Navigation to go to 'ListingDetails' screen
3. Second parameter is the data to pass to that screen
4. We pass both `listingId` and the full `listing` object

---

## Step 5: Navigation Happens

**File:** `app/src/navigation/RootNavigator.tsx`

React Navigation handles the transition:

```tsx
<Stack.Screen
  name="ListingDetails"
  component={ListingDetailsScreen}
  options={{ headerShown: false }}
/>
```

**What's happening:**
1. React Navigation looks up the "ListingDetails" route
2. It finds it's connected to `ListingDetailsScreen` component
3. It transitions to that screen with a slide animation
4. It passes the params (listingId, listing) to the screen

---

## Step 6: ListingDetailsScreen Loads

**File:** `app/src/screens/Listing/ListingDetailsScreen.tsx`

### Receiving the Data

```tsx
// Line ~140 - Get the route params
const route = useRoute();
const navigation = useNavigation();
const { listingId, listing } = route.params;

// Line ~145 - Get current user
const { user } = useAuth();
```

**What's happening:**
1. `useRoute()` gets info about current route, including params
2. Destructure `listingId` and `listing` from params
3. `useAuth()` gets current logged-in user from AuthProvider

### Fetching Additional Data

The screen already has the listing from params, but it fetches the latest data from database:

```tsx
// Line ~160 - Fetch fresh listing data
const { data: dbListing, isLoading: loadingDb } = useQuery({
  queryKey: ['listing', listingId],
  queryFn: () => listingService.getById(listingId),
  enabled: !!listingId,
});

// Line ~170 - Merge param listing with fresh data
const merged = useMemo(() => {
  // Prefer database data, fall back to param data
  return dbListing || listing;
}, [dbListing, listing]);
```

**What's happening:**
1. Fetch latest listing from database (in case data changed)
2. `useMemo` merges the data - prefer fresh DB data, but use param data as fallback
3. This prevents a blank screen while loading

### Checking if Listing is Saved

```tsx
// Line ~180 - Check if user saved this listing
const { data: isSaved, refetch: refetchSaved } = useQuery({
  queryKey: ['saved', listingId],
  queryFn: async () => {
    const { data } = await supabase
      .from('saved_listings')
      .select('id')
      .eq('listing_id', listingId)
      .eq('user_id', user?.id)
      .single();

    return !!data; // Convert to boolean
  },
  enabled: !!user && !!listingId,
});
```

**What's happening:**
1. Query the `saved_listings` table
2. Filter by listing_id and user_id
3. `.single()` returns one result (or error if none)
4. Convert result to boolean (!! operator)
5. Only run if we have user and listingId

### Preparing Image URLs

```tsx
// Line ~210 - Get image URLs
const imageUrls = useMemo(() => {
  if (!merged.images || merged.images.length === 0) {
    return [PLACEHOLDER_IMAGE];
  }

  return merged.images.map(imagePath => {
    // Check if it's already a full URL
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    // Otherwise, get signed URL from Supabase Storage
    const { data } = supabase.storage
      .from('listing-images')
      .getPublicUrl(imagePath);

    return data.publicUrl;
  });
}, [merged.images]);
```

**What's happening:**
1. `useMemo` only recalculates when `merged.images` changes
2. If no images, use placeholder
3. Map over images array to transform paths to URLs
4. Check if already full URL (starts with http)
5. Otherwise, get public URL from Supabase Storage bucket

---

## Step 7: Rendering the Screen

Now the screen has all the data it needs. Let's render it!

### Header Section

```tsx
// Line ~549 - Render the header
<View style={styles.header}>
  <Text style={styles.title}>{merged.title || "Listing"}</Text>

  <View style={styles.providerRow}>
    {/* Verified badge if listing is verified */}
    {merged.isVerified && (
      <Badge type="verified">Verified</Badge>
    )}

    {/* Community Resource badge if OSM listing */}
    {isOSMListing(merged.id) && (
      <Badge type="facility">Community Resource</Badge>
    )}

    {/* Provider name */}
    {!!merged.providerName && (
      <Text style={styles.providerName}>{merged.providerName}</Text>
    )}
  </View>
</View>
```

**What's happening:**
1. Show listing title (or "Listing" as fallback)
2. Conditionally render badges using `&&` operator
3. `isOSMListing` is a helper function that checks if ID starts with "osm_"
4. `!!` converts value to boolean (only show if not null/undefined/empty)

### Photo Carousel

```tsx
// Line ~561
<PhotoCarousel images={imageUrls} />
```

This renders the photo carousel component with the image URLs we prepared.

### Collapsible Sections

```tsx
// Line ~563 - Overview section
<CollapsibleSection title="Overview" defaultExpanded>
  {loadingDb ? (
    <ActivityIndicator />
  ) : (
    <View>
      <Text style={styles.description}>
        {merged.description || "No description available"}
      </Text>

      {/* Show amenities */}
      {amenities.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Amenities</Text>
          {amenities.map(amenity => (
            <View key={amenity} style={styles.amenityRow}>
              <Ionicons name="checkmark" size={20} color={colors.gold} />
              <Text>{amenity}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )}
</CollapsibleSection>
```

**What's happening:**
1. `CollapsibleSection` is a custom component that shows/hides content
2. While loading DB data, show spinner
3. Otherwise show description and amenities
4. Map over amenities array to create a row for each one

### Bottom Actions

```tsx
// Line ~760 - Bottom action buttons
<View style={styles.bottomActions}>
  {/* Save button */}
  <TouchableOpacity onPress={handleSave}>
    <Ionicons
      name={isSaved ? "bookmark" : "bookmark-outline"}
      size={24}
      color={colors.white}
    />
  </TouchableOpacity>

  {/* Message button - only for non-OSM listings */}
  {!isOSMListing(merged.id) && (
    <TouchableOpacity onPress={handleMessage}>
      <Text>Message</Text>
    </TouchableOpacity>
  )}

  {/* Apply button - only for non-OSM listings */}
  {!isOSMListing(merged.id) ? (
    <TouchableOpacity onPress={handleApply}>
      <Text>Apply Now</Text>
    </TouchableOpacity>
  ) : (
    <View style={styles.osmInfo}>
      <Text>Contact shelter directly</Text>
    </View>
  )}
</View>
```

**What's happening:**
1. Save button shows filled icon if saved, outline if not
2. Message and Apply buttons only show for non-OSM listings
3. OSM listings show info text instead
4. Each button has an `onPress` handler

---

## Step 8: User Interactions

### When User Taps "Save"

```tsx
// Line ~380
const handleSave = useCallback(async () => {
  if (!user) {
    Alert.alert('Login Required', 'Please log in to save listings');
    return;
  }

  try {
    if (isSaved) {
      // Unsave
      await listingService.unsaveListing(listingId);
    } else {
      // Save
      await listingService.saveListing(listingId);
    }

    // Refresh saved status
    refetchSaved();
  } catch (error) {
    Alert.alert('Error', 'Failed to save listing');
  }
}, [user, isSaved, listingId, refetchSaved]);
```

**What's happening:**
1. Check if user is logged in
2. If not logged in, show alert
3. If already saved, unsave it
4. Otherwise, save it
5. Refetch saved status to update UI
6. Show error if something fails

### When User Taps "Apply Now"

```tsx
// Line ~410
const handleApply = useCallback(async () => {
  if (!user) {
    navigation.navigate('Login');
    return;
  }

  // Check if already applied
  const { data: existingApp } = await supabase
    .from('applications')
    .select('id, status')
    .eq('listing_id', listingId)
    .eq('user_id', user.id)
    .single();

  if (existingApp) {
    Alert.alert(
      'Already Applied',
      `You already applied. Status: ${existingApp.status}`
    );
    return;
  }

  // Navigate to application wizard
  navigation.navigate('ApplicationWizard', {
    listingId,
    listing: merged,
  });
}, [user, listingId, merged, navigation]);
```

**What's happening:**
1. Check if user is logged in, navigate to login if not
2. Check database for existing application
3. If already applied, show alert with status
4. Otherwise, navigate to ApplicationWizard
5. Pass listingId and listing data to wizard

---

## Complete Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│ 1. HomeScreen.tsx                                            │
│    - useSearch hook fetches listings                         │
│    - Renders map and list                                    │
│    - User taps listing card                                  │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. openDetails() function called                             │
│    - navigation.navigate('ListingDetails', { params })       │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. React Navigation                                          │
│    - Transitions to ListingDetailsScreen                     │
│    - Passes params (listingId, listing)                      │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. ListingDetailsScreen.tsx - Data Loading Phase            │
│    - Gets params from route                                  │
│    - Fetches fresh listing data from DB                      │
│    - Checks if listing is saved                              │
│    - Prepares image URLs                                     │
│    - Parses amenities from JSON                              │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. ListingDetailsScreen.tsx - Rendering Phase               │
│    - Renders header with title and badges                    │
│    - Renders photo carousel                                  │
│    - Renders collapsible sections (Overview, Location, etc.) │
│    - Renders bottom actions (Save, Message, Apply)           │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. User Interactions                                         │
│    - Tap Save → handleSave → listingService.saveListing      │
│    - Tap Message → handleMessage → navigate to Messages      │
│    - Tap Apply → handleApply → navigate to ApplicationWizard │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

### 1. **Data Flow is Unidirectional**
```
User Action → Event Handler → Service → Supabase → Service → Hook → Component → UI
```

### 2. **Layers of Abstraction**
- **UI Layer** (Screens, Components) - What user sees
- **Logic Layer** (Hooks) - Reusable logic
- **Service Layer** (Services) - API calls
- **Data Layer** (Supabase) - Database

### 3. **React Patterns Used**
- `useState` - Local component state
- `useEffect` - Side effects (loading data)
- `useQuery` - Data fetching & caching
- `useCallback` - Memoize functions
- `useMemo` - Memoize calculated values
- Conditional rendering (`&&`, ternary)
- List rendering (`.map()`)

### 4. **Navigation Flow**
```
Screen A → navigation.navigate('ScreenB', params) → Screen B receives params via route.params
```

### 5. **Error Handling**
- Try/catch blocks around async operations
- Alert.alert() for user-facing errors
- console.error() for debugging

---

## Practice Exercise

**Try this yourself:**

1. Open `app/src/screens/Listing/ListingDetailsScreen.tsx`
2. Find the `handleSave` function
3. Add a `console.log` to see when it runs:
   ```tsx
   const handleSave = useCallback(async () => {
     console.log('User tapped save button!');
     console.log('Is currently saved?', isSaved);
     // ... rest of code
   }
   ```
4. Run the app, tap the save button, and watch the console!

---

**Congratulations!** You now understand exactly how clicking a listing works in your app. Every other feature follows similar patterns! 🎉
