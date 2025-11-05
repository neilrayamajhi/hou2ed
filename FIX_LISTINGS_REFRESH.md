# Fix for Listings Not Refreshing on Account Switch

## Problem
When switching between provider and seeker accounts via logout/login:
- Seeker account would not see listings after logging out from provider account
- Provider account would not see their listings after logging out from seeker account
- Data would only appear after a manual app refresh
- This was due to stale cached data from the previous user session

## Root Causes
1. **HomeScreen (Seeker)**: Used local state and `useEffect` that didn't re-run when user changed
2. **ProviderDashboard**: React Query cache was keyed by user ID but wasn't invalidating properly
3. **No cache invalidation on login**: Login process didn't clear the React Query cache
4. **No refresh on screen focus**: Screens didn't reload data when gaining focus after account switch

## Solutions Applied

### 1. HomeScreen.tsx (Seeker View)
- Added `useAuthStore` to get current user
- Added `useFocusEffect` from React Navigation to reload data when screen gains focus
- Added `user?.id` as a dependency to `useEffect` to reload when user changes
- Converted `loadListings` to `useCallback` to avoid infinite loops

```typescript
// Get current user to detect account switches
const { user } = useAuthStore();

// Function to load listings
const loadListings = useCallback(async () => {
  console.log('🔄 Loading listings for user:', user?.email || 'guest');
  // ... loading logic
}, [quickFilters, location, listingLoadPerf]);

// Load listings when dependencies change
useEffect(() => {
  loadListings();
}, [quickFilters, location, user?.id]); // Added user.id

// Reload listings when screen gains focus
useFocusEffect(
  useCallback(() => {
    console.log('🎯 HomeScreen focused - reloading listings');
    loadListings();
  }, [loadListings])
);
```

### 2. ProviderDashboard.tsx (Provider View)
- Added `useFocusEffect` to refresh provider listings when screen gains focus
- This ensures fresh data after login/logout

```typescript
// Refresh listings when screen gains focus
useFocusEffect(
  useCallback(() => {
    console.log('🎯 ProviderDashboard focused - refreshing listings');
    refetch();
  }, [refetch])
);
```

### 3. auth.service.ts (Login Process)
- Added React Query cache invalidation after successful login
- Ensures the new user gets fresh data, not cached data from previous user

```typescript
if (data?.user) {
  console.log("Login successful for user:", data.user.id);
  const userData = transformUserData(data.user);

  // Clear React Query cache to ensure fresh data for the new user
  console.log("🔄 Clearing React Query cache after login");
  await queryClient.invalidateQueries();

  return {
    success: true,
    user: userData,
  };
}
```

### 4. useAuthStore.ts (Logout Process)
- Already had cache clearing on logout (line 70: `queryClient.clear()`)
- This was working correctly but needed the login side to also clear cache

## Testing the Fix

To verify the fix works correctly:

1. **Test Provider → Seeker Flow**:
   - Login as provider account
   - View provider dashboard listings
   - Logout
   - Login as seeker account
   - ✅ Should immediately see listings on home screen

2. **Test Seeker → Provider Flow**:
   - Login as seeker account
   - View listings on home screen
   - Logout
   - Login as provider account
   - ✅ Should immediately see provider's listings

3. **Test Screen Navigation**:
   - Switch between tabs/screens
   - Data should refresh when returning to listing screens
   - No stale data should appear

## Console Logs for Debugging

The following console logs will help verify the fix is working:

- `🔄 Loading listings for user: [email]` - When HomeScreen loads listings
- `🎯 HomeScreen focused - reloading listings` - When HomeScreen gains focus
- `🎯 ProviderDashboard focused - refreshing listings` - When ProviderDashboard gains focus
- `🔄 Clearing React Query cache after login` - When login is successful
- `✅ React Query cache cleared` - When logout happens

## Files Modified

1. `/app/src/screens/Home/HomeScreen.tsx` - Added user dependency and focus effect
2. `/app/src/screens/Provider/ProviderDashboard.tsx` - Added focus effect
3. `/app/src/services/auth.service.ts` - Added cache invalidation on login
4. `/app/src/state/useAuthStore.ts` - Already had cache clearing on logout

## Additional Benefits

- Listings now refresh automatically when returning to the screen
- Better user experience with immediate data updates
- No stale data displayed to wrong users
- Consistent behavior across account switches