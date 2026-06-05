# Complete HOU2ED Codebase Learning Guide

**For Coding Newbies - Learn How Your App Works From Scratch**

---

## Table of Contents

1. [The Big Picture - What Is This App?](#1-the-big-picture)
2. [Core Concepts You Need to Know](#2-core-concepts)
3. [How the App Starts](#3-how-the-app-starts)
4. [Architecture Overview](#4-architecture-overview)
5. [Understanding Components](#5-understanding-components)
6. [How Data Flows](#6-how-data-flows)
7. [Feature Deep Dives](#7-feature-deep-dives)
8. [Common Patterns](#8-common-patterns)
9. [Reading the Code](#9-reading-the-code)
10. [Debugging Guide](#10-debugging-guide)

---

## 1. The Big Picture

### What Is HOU2ED?

HOU2ED (Housed) is a mobile app that helps **homeless people find housing** by connecting them with **shelters and housing providers**.

Think of it like:
- **Airbnb** → for vacation rentals
- **HOU2ED** → for emergency/transitional housing

### Who Uses It?

**Two types of users:**

1. **Seekers** - People looking for housing
   - Search for shelters/housing on a map
   - Apply to listings
   - Message providers
   - Track applications

2. **Providers** - Shelters and organizations
   - Create listings for available beds
   - Manage applications
   - Review documents
   - Message seekers

### What Technology Stack?

```
┌─────────────────────────────────────┐
│   React Native App (Your Phone)    │
│   - Written in TypeScript           │
│   - Runs on iOS & Android           │
└─────────────────────────────────────┘
              ↕️ (talks to)
┌─────────────────────────────────────┐
│   Supabase (Backend Server)         │
│   - PostgreSQL Database             │
│   - Authentication                  │
│   - File Storage                    │
│   - Real-time Messaging             │
└─────────────────────────────────────┘
```

**You don't need to build a backend server!** Supabase handles all the server stuff for you.

---

## 2. Core Concepts You Need to Know

### 2.1 React & React Native

**What is React?**
React is a JavaScript library for building user interfaces using **components** (reusable building blocks).

**What is React Native?**
React Native lets you build **native mobile apps** (for iPhone & Android) using React.

**Key concept: Components**
```tsx
// A component is like a LEGO brick - reusable and composable
function Button() {
  return <Text>Click me!</Text>
}

// You can use it multiple times
<Button />
<Button />
<Button />
```

### 2.2 TypeScript

**What is TypeScript?**
JavaScript with **types** - it catches bugs BEFORE you run the code.

**Example:**
```typescript
// JavaScript (no type safety)
function add(a, b) {
  return a + b;
}
add(5, "hello")  // Oops! This will cause weird behavior

// TypeScript (with types)
function add(a: number, b: number): number {
  return a + b;
}
add(5, "hello")  // ❌ Error! TypeScript won't let you do this
```

### 2.3 JSX/TSX Syntax

**JSX** = JavaScript + HTML-like syntax
**TSX** = TypeScript + HTML-like syntax

```tsx
// This looks like HTML but it's actually JavaScript!
function Welcome() {
  const name = "Neil";

  return (
    <View>
      <Text>Hello, {name}!</Text>
    </View>
  );
}
```

**Key rules:**
- JSX must have **ONE parent element**
- Use `{}` to embed JavaScript expressions
- Use `className` in web, `style` in React Native

### 2.4 Props (Component Arguments)

Props are how you pass data to components (like function arguments).

```tsx
// Define what props this component accepts
interface GreetingProps {
  name: string;
  age: number;
}

// Use the props
function Greeting({ name, age }: GreetingProps) {
  return <Text>Hello {name}, you are {age} years old</Text>
}

// Call it with props
<Greeting name="Neil" age={25} />
```

### 2.5 State (Component Memory)

State is how components **remember** things.

```tsx
import { useState } from 'react';

function Counter() {
  // useState creates a state variable
  const [count, setCount] = useState(0);  // starts at 0

  return (
    <View>
      <Text>Count: {count}</Text>
      <Button
        title="Add 1"
        onPress={() => setCount(count + 1)}  // Update state
      />
    </View>
  );
}
```

**How it works:**
1. `useState(0)` creates a variable `count` starting at 0
2. `setCount` is a function to update `count`
3. When you call `setCount(5)`, React **re-renders** the component with new value
4. The screen updates automatically!

### 2.6 Hooks (Special React Functions)

Hooks are special functions that let you "hook into" React features.

**Common hooks:**
- `useState` - Remember values
- `useEffect` - Run code when something changes
- `useCallback` - Remember functions
- `useMemo` - Remember calculated values

**Example - useEffect:**
```tsx
function Profile() {
  const [user, setUser] = useState(null);

  // Run this code when component mounts
  useEffect(() => {
    fetchUser().then(data => setUser(data));
  }, []); // [] means "only run once when component first appears"

  return <Text>{user?.name}</Text>
}
```

### 2.7 Async/Await (Dealing with Delays)

When you fetch data from a server, it takes time. **Async/await** handles this.

```tsx
// Without async/await (callback hell)
function getUser() {
  fetchUser(userId, function(user) {
    fetchPosts(user.id, function(posts) {
      fetchComments(posts[0].id, function(comments) {
        // Nested callbacks - hard to read!
      });
    });
  });
}

// With async/await (clean!)
async function getUser() {
  const user = await fetchUser(userId);      // Wait for this
  const posts = await fetchPosts(user.id);   // Then this
  const comments = await fetchComments(posts[0].id); // Then this
}
```

**Key words:**
- `async` - This function contains async operations
- `await` - Wait for this to finish before continuing

---

## 3. How the App Starts

### The Startup Flow

```
User Opens App
      ↓
App.tsx loads
      ↓
Check if user is logged in?
      ↓
   ┌──────┴──────┐
   ↓             ↓
  YES            NO
   ↓             ↓
Show Main     Show Login
  App          Screen
```

Let me walk you through `App.tsx` (the entry point):

### App.tsx - Line by Line

```tsx
// app/App.tsx

// Import React and core libraries
import React from 'react';
import { StatusBar } from 'expo-status-bar';

// Import providers (wrappers that provide functionality)
import { AuthProvider } from './src/providers/AuthProvider';
import { QueryProvider } from './src/providers/QueryProvider';
import { ToastProvider } from './src/providers/ToastProvider';
import ErrorBoundary from './src/providers/ErrorBoundary';

// Import navigation
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    // ErrorBoundary catches crashes and shows error screen
    <ErrorBoundary>
      {/* QueryProvider manages data fetching and caching */}
      <QueryProvider>
        {/* AuthProvider manages user login state */}
        <AuthProvider>
          {/* ToastProvider shows popup messages */}
          <ToastProvider>
            {/* RootNavigator handles all screen navigation */}
            <RootNavigator />

            {/* StatusBar controls the phone's status bar appearance */}
            <StatusBar style="light" />
          </ToastProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
```

**What are these "Providers"?**

Providers are **wrappers** that give all child components access to certain features. Think of them like utility pipes:

```
┌─────────────────────────────────────────┐
│ ErrorBoundary (catches crashes)         │
│  ┌────────────────────────────────────┐ │
│  │ QueryProvider (data fetching)      │ │
│  │  ┌──────────────────────────────┐  │ │
│  │  │ AuthProvider (login state)   │  │ │
│  │  │  ┌────────────────────────┐  │  │ │
│  │  │  │ ToastProvider (popups) │  │  │ │
│  │  │  │  ┌──────────────────┐  │  │  │ │
│  │  │  │  │  Your Screens   │  │  │  │ │
│  │  │  │  └──────────────────┘  │  │  │ │
│  │  │  └────────────────────────┘  │  │ │
│  │  └──────────────────────────────┘  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

Any screen inside can access auth, data fetching, toasts, etc.

---

## 4. Architecture Overview

### 4.1 Folder Structure Explained

```
app/src/
├── screens/           # Each screen in the app
│   ├── Auth/         # Login, Signup screens
│   ├── Home/         # Map view, search
│   ├── Listing/      # Listing details
│   ├── Applications/ # Application flow
│   ├── Messages/     # Chat
│   └── Profile/      # User profile
│
├── components/       # Reusable UI pieces
│   ├── ui/          # Basic components (Button, Badge, Input)
│   └── patterns/    # Complex components (ListingCard, PhotoCarousel)
│
├── services/        # Business logic & API calls
│   ├── auth.service.ts        # Login, signup, logout
│   ├── listing.service.ts     # Fetch/create listings
│   ├── application.service.ts # Manage applications
│   └── message.service.ts     # Messaging
│
├── hooks/           # Reusable React logic
│   ├── useAuth.ts   # Access current user
│   ├── useSearch.ts # Search listings
│   └── useMessages.ts # Messaging logic
│
├── state/           # Global state (Zustand stores)
│   ├── useAuthStore.ts    # Authentication state
│   ├── useFilterStore.ts  # Search filters
│   └── useSavedStore.ts   # Saved items
│
├── navigation/      # Screen navigation setup
│   └── RootNavigator.tsx
│
├── types/           # TypeScript type definitions
│   └── index.ts
│
├── utils/           # Helper functions
│   └── constants.ts
│
├── lib/             # Third-party integrations
│   └── supabase.ts  # Supabase client
│
└── theme/           # Design system (colors, spacing)
    └── tokens.ts
```

### 4.2 The Layers

Your app has **layers** like an onion:

```
┌─────────────────────────────────────┐
│  SCREENS (what users see)           │
│  - HomeScreen                       │
│  - ListingDetailsScreen             │
└─────────────────────────────────────┘
              ↓ uses
┌─────────────────────────────────────┐
│  HOOKS (reusable logic)             │
│  - useSearch                        │
│  - useAuth                          │
└─────────────────────────────────────┘
              ↓ calls
┌─────────────────────────────────────┐
│  SERVICES (API calls)               │
│  - listingService.fetchListings()   │
│  - authService.login()              │
└─────────────────────────────────────┘
              ↓ talks to
┌─────────────────────────────────────┐
│  SUPABASE CLIENT                    │
│  - Database queries                 │
│  - Auth                             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  SUPABASE SERVER (PostgreSQL)       │
└─────────────────────────────────────┘
```

**Why layers?**
- **Separation of concerns** - Each layer has ONE job
- **Testability** - You can test services without touching screens
- **Reusability** - Multiple screens can use the same service

---

## 5. Understanding Components

### 5.1 Types of Components

**1. Screen Components** (full page views)
```tsx
// app/src/screens/Home/HomeScreen.tsx
export default function HomeScreen() {
  return (
    <View>
      <Text>This is a full screen</Text>
    </View>
  );
}
```

**2. UI Components** (small reusable pieces)
```tsx
// app/src/components/ui/Button.tsx
export default function Button({ title, onPress }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
}
```

**3. Pattern Components** (complex reusable sections)
```tsx
// app/src/components/patterns/ListingCard.tsx
export default function ListingCard({ listing }) {
  return (
    <View>
      <Image source={listing.image} />
      <Text>{listing.title}</Text>
      <Badge type="available" />
    </View>
  );
}
```

### 5.2 Component Lifecycle

Components have a **lifecycle** (birth, life, death):

```tsx
function MyComponent() {
  // 1. BIRTH - Component mounts (appears on screen)
  useEffect(() => {
    console.log('Component just appeared!');
    fetchData();
  }, []);  // Empty array = run only once when born

  // 2. LIFE - Component updates (state/props change)
  useEffect(() => {
    console.log('Something changed!');
  }, [someValue]);  // Run when someValue changes

  // 3. DEATH - Component unmounts (disappears from screen)
  useEffect(() => {
    return () => {
      console.log('Component is being removed!');
      cleanup();
    };
  }, []);

  return <View>...</View>
}
```

### 5.3 Real Example: Badge Component

Let's fully understand the Badge component:

```tsx
// app/src/components/ui/Badge.tsx

import React from "react";
import { View, Text, StyleSheet, ViewProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";

// 1. DEFINE THE INTERFACE (contract for what props this accepts)
interface BadgeProps extends ViewProps {
  type: "available" | "full" | "verified" | "facility";  // Required
  icon?: string;       // Optional
  label?: string;      // Optional
  children?: React.ReactNode;  // Optional
}

// 2. THE COMPONENT FUNCTION
export default function Badge({
  type,        // Destructure props
  icon,
  label,
  children,
  style,
  ...props     // Spread: captures any remaining props
}: BadgeProps) {

  // 3. HELPER FUNCTION - Decide which icon to show
  const getIconName = (): keyof typeof Ionicons.glyphMap | null => {
    switch (type) {
      case "verified":
        return "checkmark-circle";
      case "facility":
        return icon || "business";  // Use custom icon or default
      default:
        return null;  // No icon for available/full
    }
  };

  const iconName = getIconName();

  // 4. RENDER - Return JSX (what to display)
  return (
    <View
      style={[
        styles.base,      // Base styles for all badges
        styles[type],     // Type-specific styles (available, full, etc.)
        style             // Custom styles passed via props
      ]}
      accessibilityRole="text"  // For screen readers
      {...props}  // Spread remaining props onto View
    >
      {/* Conditionally render icon */}
      {iconName && (
        <Ionicons
          name={iconName}
          size={14}
          color={type === "full" || type === "available" ? "#FFFFFF" : "#000000"}
          style={styles.icon}
        />
      )}

      {/* Text content - fallback chain */}
      <Text style={[styles.text, styles[`${type}Text`]]}>
        {children || label || type.charAt(0).toUpperCase() + type.slice(1)}
      </Text>
    </View>
  );
}

// 5. STYLES - Define how it looks
const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    minHeight: 24,
  },
  available: {
    backgroundColor: "#21C55D",  // Green
  },
  full: {
    backgroundColor: "#374151",  // Gray
  },
  verified: {
    backgroundColor: "#D4AF37",  // Gold
  },
  facility: {
    backgroundColor: "#D4AF37",  // Gold
  },
  text: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  availableText: {
    color: "#FFFFFF",
  },
  fullText: {
    color: "#FFFFFF",
  },
  verifiedText: {
    color: "#000000",
  },
  facilityText: {
    color: "#000000",
  },
  icon: {
    marginRight: 4,
  },
});
```

**How to use it:**
```tsx
// In any screen or component:
<Badge type="verified">Verified</Badge>
<Badge type="available">5 Beds Today</Badge>
<Badge type="full">No Beds Available</Badge>
<Badge type="facility" icon="home">Shelter</Badge>
```

---

## 6. How Data Flows

### 6.1 The Complete Data Flow

Let's trace what happens when you **search for listings**:

```
USER ACTION: Type "San Francisco" in search
                    ↓
┌────────────────────────────────────────────┐
│ SearchScreen.tsx                           │
│ - User types in search input               │
│ - Updates local state                      │
└────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────┐
│ useFilterStore (Zustand global state)      │
│ - Stores search filters globally           │
│ - Other screens can access these filters   │
└────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────┐
│ HomeScreen.tsx                             │
│ - Reads filters from useFilterStore        │
│ - Calls useSearch hook                     │
└────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────┐
│ useSearch.ts (custom hook)                 │
│ - Combines filters with user location      │
│ - Calls listingService.searchListings()    │
└────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────┐
│ listingService.ts                          │
│ - Builds Supabase query                    │
│ - Adds filters (location, amenities, etc.) │
│ - Executes query                           │
└────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────┐
│ Supabase Client (lib/supabase.ts)         │
│ - Sends HTTP request to Supabase server    │
└────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────┐
│ Supabase Server (PostgreSQL Database)     │
│ - Runs SQL query                           │
│ - Filters by location, amenities, etc.    │
│ - Returns matching listings                │
└────────────────────────────────────────────┘
                    ↓ (results flow back up)
┌────────────────────────────────────────────┐
│ React Query (caching layer)               │
│ - Caches results for faster future loads   │
│ - Handles loading states                   │
└────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────┐
│ HomeScreen.tsx                             │
│ - Receives listings array                  │
│ - Maps over array to render ListingCards   │
└────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────┐
│ ListingCard.tsx                            │
│ - Displays each listing                    │
│ - Shows image, title, availability badge   │
└────────────────────────────────────────────┘
                    ↓
USER SEES: List of shelters in San Francisco
```

### 6.2 Code Example: Full Search Flow

**Step 1: User types in SearchScreen**

```tsx
// app/src/screens/Search/SearchScreen.tsx

export default function SearchScreen() {
  const setFilters = useFilterStore(state => state.setFilters);

  const handleCityChange = (city: string) => {
    // Update global filter store
    setFilters({ city });
  };

  return (
    <TextInput
      placeholder="Enter city"
      onChangeText={handleCityChange}
    />
  );
}
```

**Step 2: Filter store updates**

```tsx
// app/src/state/useFilterStore.ts

import create from 'zustand';

interface FilterState {
  filters: SearchFilters;
  setFilters: (filters: Partial<SearchFilters>) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  filters: {},

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
}));
```

**Step 3: HomeScreen reads filters and searches**

```tsx
// app/src/screens/Home/HomeScreen.tsx

export default function HomeScreen() {
  // Get filters from global store
  const filters = useFilterStore(state => state.filters);

  // Use custom hook to search
  const { listings, isLoading } = useSearch(filters);

  if (isLoading) return <ActivityIndicator />;

  return (
    <FlatList
      data={listings}
      renderItem={({ item }) => <ListingCard listing={item} />}
    />
  );
}
```

**Step 4: useSearch hook calls service**

```tsx
// app/src/hooks/useSearch.ts

import { useQuery } from '@tanstack/react-query';
import { listingService } from '../services/listing.service';

export function useSearch(filters: SearchFilters) {
  const { data, isLoading } = useQuery({
    queryKey: ['listings', filters],  // Cache key
    queryFn: () => listingService.searchListings(filters),
  });

  return {
    listings: data || [],
    isLoading,
  };
}
```

**Step 5: Service calls Supabase**

```tsx
// app/src/services/listing.service.ts

import { supabase } from '../lib/supabase';

export const listingService = {
  async searchListings(filters: SearchFilters) {
    // Build query
    let query = supabase
      .from('listings')
      .select('*')
      .eq('status', 'active');

    // Add filters
    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }

    if (filters.amenities?.length > 0) {
      query = query.contains('amenities', filters.amenities);
    }

    // Execute query
    const { data, error } = await query;

    if (error) throw error;
    return data;
  }
};
```

**Step 6: Results flow back to HomeScreen**

React Query caches the results and passes them back to `useSearch`, which returns them to `HomeScreen`, which renders them!

---

## 7. Feature Deep Dives

### 7.1 Authentication Flow

**How Login Works:**

```
User enters email + password
         ↓
LoginScreen.tsx
         ↓
authService.login(email, password)
         ↓
supabase.auth.signInWithPassword()
         ↓
Supabase checks credentials
         ↓
Returns JWT token + user data
         ↓
AuthProvider stores user in state
         ↓
RootNavigator sees user is logged in
         ↓
Shows Main App (not Login screen)
```

**Code walkthrough:**

```tsx
// app/src/screens/Auth/LoginScreen.tsx

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();  // From AuthProvider

  const handleLogin = async () => {
    setLoading(true);

    try {
      // Call signIn from AuthProvider
      await signIn(email, password);
      // If successful, AuthProvider updates state
      // RootNavigator automatically shows main app
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        title={loading ? "Logging in..." : "Login"}
        onPress={handleLogin}
        disabled={loading}
      />
    </View>
  );
}
```

```tsx
// app/src/providers/AuthProvider.tsx

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // User state updates automatically via onAuthStateChange
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // User state updates automatically via onAuthStateChange
  };

  // Provide these to all child components
  const value = {
    user,
    signIn,
    signOut,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth in any component
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

```tsx
// app/src/navigation/RootNavigator.tsx

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  // Show different screens based on auth state
  return (
    <NavigationContainer>
      {user ? (
        <MainTabNavigator />  // Logged in: show app
      ) : (
        <AuthStackNavigator />  // Not logged in: show login
      )}
    </NavigationContainer>
  );
}
```

### 7.2 Listing Search & Display

**How the map view works:**

```
User opens HomeScreen
         ↓
Get user's current location (GPS)
         ↓
Fetch listings near user (50 mile radius)
         ↓
Display listings as pins on map
         ↓
User taps a pin
         ↓
Show listing details in bottom sheet
         ↓
User taps "View Details"
         ↓
Navigate to ListingDetailsScreen
```

**Code walkthrough:**

```tsx
// app/src/screens/Home/HomeScreen.tsx

export default function HomeScreen() {
  const [region, setRegion] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const filters = useFilterStore(state => state.filters);

  // Get user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      });
    })();
  }, []);

  // Fetch listings
  const { listings, isLoading } = useSearch({
    ...filters,
    latitude: region?.latitude,
    longitude: region?.longitude,
    radius: 50, // miles
  });

  const handleMarkerPress = (listing) => {
    setSelectedListing(listing);
  };

  const handleViewDetails = () => {
    navigation.navigate('ListingDetails', {
      listingId: selectedListing.id,
      listing: selectedListing,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        region={region}
        onRegionChange={setRegion}
      >
        {listings.map(listing => (
          <Marker
            key={listing.id}
            coordinate={{
              latitude: listing.latitude,
              longitude: listing.longitude,
            }}
            onPress={() => handleMarkerPress(listing)}
          />
        ))}
      </MapView>

      {/* Bottom sheet with listing preview */}
      {selectedListing && (
        <View style={styles.bottomSheet}>
          <ListingCard listing={selectedListing} />
          <Button title="View Details" onPress={handleViewDetails} />
        </View>
      )}
    </View>
  );
}
```

### 7.3 Application Process

**How applying to a listing works:**

```
User clicks "Apply Now" on listing
         ↓
Navigate to ApplicationWizard
         ↓
Step 1: Personal Info (name, email, phone)
         ↓
Step 2: Eligibility (income, family size, etc.)
         ↓
Step 3: Upload Documents (ID, insurance, etc.)
         ↓
Step 4: Review & Submit
         ↓
Create application in database
         ↓
Upload documents to Supabase Storage
         ↓
Send notification to provider
         ↓
Show success message
         ↓
Navigate to ApplicationsScreen
```

**Code walkthrough:**

```tsx
// app/src/screens/Applications/ApplicationWizard.tsx

export default function ApplicationWizard({ route }) {
  const { listingId } = route.params;
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    personalInfo: {},
    eligibility: {},
    documents: [],
  });

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    try {
      // Create application
      const application = await applicationService.create({
        listingId,
        ...formData.personalInfo,
        ...formData.eligibility,
      });

      // Upload documents
      for (const doc of formData.documents) {
        await applicationService.uploadDocument(application.id, doc);
      }

      // Send notification
      await notificationService.notifyProvider(application.id);

      Alert.alert('Success', 'Application submitted!');
      navigation.navigate('Applications');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View>
      {currentStep === 1 && (
        <PersonalInfoStep
          data={formData.personalInfo}
          onChange={(data) => setFormData(prev => ({
            ...prev,
            personalInfo: data
          }))}
          onNext={handleNext}
        />
      )}

      {currentStep === 2 && (
        <EligibilityStep
          data={formData.eligibility}
          onChange={(data) => setFormData(prev => ({
            ...prev,
            eligibility: data
          }))}
          onNext={handleNext}
        />
      )}

      {currentStep === 3 && (
        <DocumentsStep
          documents={formData.documents}
          onChange={(docs) => setFormData(prev => ({
            ...prev,
            documents: docs
          }))}
          onNext={handleNext}
        />
      )}

      {currentStep === 4 && (
        <ReviewStep
          data={formData}
          onSubmit={handleSubmit}
        />
      )}
    </View>
  );
}
```

### 7.4 Messaging System

**How real-time messaging works:**

```
User clicks "Message" on listing
         ↓
Check if conversation exists
         ↓
If not, create new thread
         ↓
Navigate to MessageThreadScreen
         ↓
Subscribe to real-time updates (Supabase Realtime)
         ↓
Display existing messages
         ↓
User types message and sends
         ↓
Insert message into database
         ↓
Supabase broadcasts to all subscribers
         ↓
Other user receives message instantly
```

**Code walkthrough:**

```tsx
// app/src/screens/Messages/MessageThreadScreen.tsx

export default function MessageThreadScreen({ route }) {
  const { threadId } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const { user } = useAuth();

  // Fetch existing messages
  useEffect(() => {
    const fetchMessages = async () => {
      const data = await messageService.getMessages(threadId);
      setMessages(data);
    };

    fetchMessages();
  }, [threadId]);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel(`messages:thread_id=eq.${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          // New message received!
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [threadId]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      await messageService.sendMessage({
        threadId,
        senderId: user.id,
        content: newMessage,
      });

      setNewMessage('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isOwn={item.senderId === user.id}
          />
        )}
      />

      <View style={styles.inputContainer}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
        />
        <Button title="Send" onPress={handleSend} />
      </View>
    </View>
  );
}
```

---

## 8. Common Patterns

### 8.1 The Service Pattern

**Why?** Separates business logic from UI.

```tsx
// ❌ BAD - Logic mixed with UI
function HomeScreen() {
  const [listings, setListings] = useState([]);

  useEffect(() => {
    // Business logic in component - hard to test!
    supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .then(({ data }) => setListings(data));
  }, []);

  return <FlatList data={listings} />
}

// ✅ GOOD - Logic in service
function HomeScreen() {
  const { data: listings } = useQuery({
    queryKey: ['listings'],
    queryFn: listingService.getActive,  // Service handles logic
  });

  return <FlatList data={listings} />
}
```

### 8.2 The Custom Hook Pattern

**Why?** Reuse logic across multiple components.

```tsx
// app/src/hooks/useListings.ts

export function useListings(filters) {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () => listingService.search(filters),
  });
}

// Now any component can use it:
function HomeScreen() {
  const { data, isLoading } = useListings({ city: 'SF' });
}

function SearchScreen() {
  const { data, isLoading } = useListings({ amenities: ['pets'] });
}
```

### 8.3 The Render Prop Pattern

**Why?** Share component logic while keeping UI flexible.

```tsx
// Component that handles data fetching
function DataFetcher({ url, render }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, [url]);

  return render({ data, loading });
}

// Usage - you control the UI
<DataFetcher
  url="/api/listings"
  render={({ data, loading }) => (
    loading ? <Spinner /> : <ListingList listings={data} />
  )}
/>
```

### 8.4 Conditional Rendering Patterns

```tsx
// Pattern 1: && operator (if true, show)
{isLoggedIn && <ProfileButton />}

// Pattern 2: Ternary (if-else)
{isLoading ? <Spinner /> : <Content />}

// Pattern 3: Early return
function Component() {
  if (!user) return <LoginPrompt />;
  return <Dashboard />;
}

// Pattern 4: Switch for multiple cases
function StatusBadge({ status }) {
  switch (status) {
    case 'pending': return <Badge type="warning">Pending</Badge>;
    case 'approved': return <Badge type="success">Approved</Badge>;
    case 'rejected': return <Badge type="error">Rejected</Badge>;
    default: return null;
  }
}
```

---

## 9. Reading the Code

### 9.1 How to Read a Component

**Step-by-step approach:**

1. **Look at the interface/props**
   ```tsx
   interface ListingCardProps {
     listing: Listing;
     onPress?: () => void;
   }
   ```
   *"This component needs a listing object and optionally a press handler"*

2. **Check the state**
   ```tsx
   const [expanded, setExpanded] = useState(false);
   ```
   *"This tracks whether the card is expanded"*

3. **Look at useEffect**
   ```tsx
   useEffect(() => {
     fetchImages();
   }, [listing.id]);
   ```
   *"When the listing changes, fetch new images"*

4. **Find the event handlers**
   ```tsx
   const handlePress = () => {
     onPress?.();
   };
   ```
   *"When pressed, call the onPress function if it exists"*

5. **Read the JSX from top to bottom**
   ```tsx
   return (
     <TouchableOpacity onPress={handlePress}>
       <Image source={listing.image} />
       <Text>{listing.title}</Text>
     </TouchableOpacity>
   );
   ```
   *"Shows an image and title in a tappable container"*

### 9.2 Following a User Action

Let's trace: **User taps "Save" on a listing**

1. **Find the button**
   ```tsx
   // ListingDetailsScreen.tsx line 760
   <TouchableOpacity onPress={handleSave}>
     <Icon name="bookmark" />
   </TouchableOpacity>
   ```

2. **Find the handler**
   ```tsx
   // Look up in the file for handleSave
   const handleSave = async () => {
     await listingService.saveListing(listing.id);
     setIsSaved(true);
   };
   ```

3. **Go to the service**
   ```tsx
   // listing.service.ts
   saveListing: async (listingId) => {
     return await supabase
       .from('saved_listings')
       .insert({ listing_id: listingId });
   }
   ```

4. **Understand the database**
   ```sql
   -- supabase/migrations/xxx_create_saved_listings.sql
   CREATE TABLE saved_listings (
     id uuid PRIMARY KEY,
     user_id uuid REFERENCES auth.users,
     listing_id uuid REFERENCES listings,
     created_at timestamp DEFAULT now()
   );
   ```

Now you understand the full flow!

### 9.3 Understanding TypeScript Types

```tsx
// Basic types
const name: string = "Neil";
const age: number = 25;
const isActive: boolean = true;

// Arrays
const numbers: number[] = [1, 2, 3];
const strings: Array<string> = ["a", "b"];

// Objects (interfaces)
interface User {
  id: string;
  name: string;
  age?: number;  // ? = optional
}

const user: User = {
  id: "123",
  name: "Neil",
  // age is optional, can skip it
};

// Union types (OR)
type Status = "pending" | "approved" | "rejected";
const status: Status = "pending";  // ✅
const status: Status = "cancelled";  // ❌ Error!

// Utility types
type Partial<T> = { [P in keyof T]?: T[P] };  // Make all properties optional
type Required<T> = { [P in keyof T]-?: T[P] };  // Make all properties required
type Pick<T, K> = { [P in K]: T[P] };  // Pick certain properties

// Example
interface Listing {
  id: string;
  title: string;
  description: string;
}

type PartialListing = Partial<Listing>;  // All optional
type ListingPreview = Pick<Listing, 'id' | 'title'>;  // Only id and title
```

---

## 10. Debugging Guide

### 10.1 Common Error Messages

**"Cannot read property 'X' of undefined"**
```tsx
// Something is undefined when you expect it to have a value
const name = user.name;  // ❌ If user is undefined, crash!

// Fix: Add optional chaining
const name = user?.name;  // ✅ Returns undefined if user is undefined

// Or check first
if (user) {
  const name = user.name;
}
```

**"Objects are not valid as a React child"**
```tsx
// You tried to render an object directly
<Text>{user}</Text>  // ❌ user is an object!

// Fix: Render specific properties
<Text>{user.name}</Text>  // ✅
```

**"Maximum update depth exceeded"**
```tsx
// You're updating state in an infinite loop
useEffect(() => {
  setCount(count + 1);  // ❌ This runs every time count changes!
});

// Fix: Add dependency array
useEffect(() => {
  setCount(count + 1);
}, []);  // ✅ Only runs once
```

### 10.2 Debugging Tools

**Console.log debugging**
```tsx
function Component() {
  console.log('Component rendered');

  const { data, isLoading } = useQuery(...);
  console.log('Data:', data, 'Loading:', isLoading);

  useEffect(() => {
    console.log('Effect ran');
  }, []);

  return <View>...</View>
}
```

**React DevTools**
- Install React DevTools browser extension
- Inspect component tree
- View props and state
- Track re-renders

**Breakpoints**
```tsx
function handleSubmit() {
  debugger;  // Code pauses here in browser
  const result = processData();
  console.log(result);
}
```

### 10.3 Common Mistakes

**1. Mutating state directly**
```tsx
// ❌ WRONG - Mutating state
const handleAdd = () => {
  items.push(newItem);
  setItems(items);
};

// ✅ CORRECT - Create new array
const handleAdd = () => {
  setItems([...items, newItem]);
};
```

**2. Missing dependencies in useEffect**
```tsx
// ❌ WRONG
useEffect(() => {
  fetchUser(userId);
}, []);  // Missing userId!

// ✅ CORRECT
useEffect(() => {
  fetchUser(userId);
}, [userId]);  // Include all dependencies
```

**3. Not handling async errors**
```tsx
// ❌ WRONG
const fetchData = async () => {
  const data = await api.fetch();  // What if this fails?
};

// ✅ CORRECT
const fetchData = async () => {
  try {
    const data = await api.fetch();
  } catch (error) {
    console.error(error);
    Alert.alert('Error', error.message);
  }
};
```

---

## Next Steps for Learning

### Beginner Track
1. ✅ Read this guide
2. Pick ONE screen (e.g., LoginScreen)
3. Read through the code line by line
4. Change the text/colors and see what happens
5. Add a console.log to see when functions run
6. Try breaking something and fixing it

### Intermediate Track
1. Build a new simple screen from scratch
2. Create a custom hook for reusable logic
3. Add a new service method
4. Write tests for your code
5. Debug an issue without help

### Advanced Track
1. Understand the entire application flow
2. Refactor a complex component
3. Optimize performance (useCallback, useMemo)
4. Implement a new feature end-to-end
5. Review and improve others' code

---

## Quick Reference

### File Structure Cheat Sheet
```
screens/     → Full-page views
components/  → Reusable UI pieces
services/    → API calls & business logic
hooks/       → Reusable React logic
state/       → Global state (Zustand)
types/       → TypeScript definitions
utils/       → Helper functions
lib/         → Third-party integrations
theme/       → Colors, spacing, fonts
```

### React Hooks Cheat Sheet
```tsx
useState     → Remember values
useEffect    → Side effects (API calls, subscriptions)
useCallback  → Remember functions
useMemo      → Remember calculated values
useRef       → Reference DOM elements
useContext   → Access context values
```

### Supabase Cheat Sheet
```tsx
// Select
await supabase.from('table').select('*')

// Insert
await supabase.from('table').insert({ name: 'John' })

// Update
await supabase.from('table').update({ name: 'Jane' }).eq('id', 123)

// Delete
await supabase.from('table').delete().eq('id', 123)

// Filter
await supabase.from('table').select('*').eq('status', 'active')

// Join
await supabase.from('listings').select('*, profiles(*)')
```

---

**Congratulations!** You now have a comprehensive understanding of how your HOU2ED codebase works. Keep this guide handy as you continue learning and building! 🚀
