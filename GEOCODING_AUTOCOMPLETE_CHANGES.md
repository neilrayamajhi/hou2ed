# Geocoding Autocomplete - Manual Changes Required

I've created the `AddressAutocomplete` component for you! Now you need to make a few small changes to integrate it.

## ✅ Already Done
- Created `app/src/components/forms/AddressAutocomplete.tsx` - Mapbox autocomplete component

## 📝 Changes You Need to Make

### 1. Update `app/src/services/listing.service.ts`

**Find this interface (around line 16):**
```typescript
export interface CreateListingInput {
  title: string;
  address: string;
  city?: string;
  state?: string;
  zip_code?: string;
  totalBeds: number;
  availableBeds?: number;
  price?: number;
  description?: string;
  // New fields for amenities, services, rules, eligibility
  amenities?: string[];
  services?: string[];
  curfew?: string;
  visitorsPolicy?: string;
  petsPolicy?: "allowed" | "not_allowed" | "service_only";
  minAge?: number;
  maxAge?: number;
  eligibility?: string[];
}
```

**Add this field after `description`:**
```typescript
  // Optional: Pre-geocoded coordinates (skips geocoding if provided)
  coordinates?: {
    lat: number;
    lng: number;
  };
```

**Then find the `createListing` function (around line 333)** and update the geocoding section:

**Find this:**
```typescript
// Geocode the address to get coordinates
let lat = 34.0522; // Default LA coordinates as fallback
let lng = -118.2437;

const geocodeResult = await geocodeAddress({
  street: listingData.address,
  city: listingData.city || null,
  state: listingData.state || null,
  zip: listingData.zip_code || null,
});

if (geocodeResult) {
  lat = geocodeResult.lat;
  lng = geocodeResult.lng;
  console.log("✅ Geocoded address:", { address: listingData.address, lat, lng });
} else {
  console.warn("⚠️ Geocoding failed, using default LA coordinates");
}
```

**Replace with:**
```typescript
// Use provided coordinates or geocode the address
let lat: number;
let lng: number;

if (listingData.coordinates) {
  // Coordinates provided from autocomplete - no need to geocode!
  lat = listingData.coordinates.lat;
  lng = listingData.coordinates.lng;
  console.log("✅ Using pre-geocoded coordinates:", { lat, lng });
} else {
  // No coordinates provided, geocode the address
  lat = 34.0522; // Default LA coordinates as fallback
  lng = -118.2437;

  const geocodeResult = await geocodeAddress({
    street: listingData.address,
    city: listingData.city || null,
    state: listingData.state || null,
    zip: listingData.zip_code || null,
  });

  if (geocodeResult) {
    lat = geocodeResult.lat;
    lng = geocodeResult.lng;
    console.log("✅ Geocoded address:", { address: listingData.address, lat, lng });
  } else {
    console.warn("⚠️ Geocoding failed, using default LA coordinates");
  }
}
```

---

### 2. Update `app/src/screens/Provider/AddListing.tsx`

**At the top, add the import (after line 19):**
```typescript
import AddressAutocomplete, {
  type AddressData,
} from "../../components/forms/AddressAutocomplete";
```

**Replace the state for address (around line 29):**
```typescript
// OLD:
const [address, setAddress] = useState("");

// NEW:
const [addressData, setAddressData] = useState<AddressData | null>(null);
```

**Update the validation in `handleSave` (around line 67):**
```typescript
// OLD:
if (!propertyName || !address || !totalBeds) {

// NEW:
if (!propertyName || !addressData || !totalBeds) {
```

**Update the `mutationFn` in `useMutation` (around line 42):**
```typescript
// OLD:
return createListing(providerId, {
  title: propertyName.trim(),
  address: address.trim(),
  totalBeds: totalBedsNum,
  availableBeds: availableBedsNum,
  price: priceNum,
});

// NEW:
if (!addressData) throw new Error("Please select an address");

return createListing(providerId, {
  title: propertyName.trim(),
  address: addressData.street,
  city: addressData.city,
  state: addressData.state,
  zip_code: addressData.zipCode,
  totalBeds: totalBedsNum,
  availableBeds: availableBedsNum,
  price: priceNum,
  // Pass coordinates directly - no need to geocode!
  coordinates: {
    lat: addressData.latitude,
    lng: addressData.longitude,
  },
});
```

**Replace the Address input section (around line 119-132) with:**
```tsx
{/* Address with Autocomplete */}
<View style={styles.formGroup}>
  <Text style={styles.label}>
    Address <Text style={styles.required}>*</Text>
  </Text>
  <AddressAutocomplete
    onAddressSelect={setAddressData}
    placeholder="Search for an address..."
  />
  {addressData && (
    <View style={styles.addressPreview}>
      <Ionicons name="checkmark-circle" size={16} color={colors.green} />
      <View style={styles.addressPreviewText}>
        <Text style={styles.addressPreviewMain}>{addressData.street}</Text>
        <Text style={styles.addressPreviewSub}>
          {addressData.city}, {addressData.state} {addressData.zipCode}
        </Text>
      </View>
    </View>
  )}
</View>
```

**Update the info banner text (around line 99-101):**
```tsx
<Text style={styles.infoBannerText}>
  Start typing an address and select from the suggestions. Powered by Mapbox!
</Text>
```

**Add to the ScrollView props (around line 94):**
```tsx
<ScrollView
  style={styles.scrollView}
  contentContainerStyle={styles.scrollContent}
  showsVerticalScrollIndicator={false}
  keyboardShouldPersistTaps="handled"  // ADD THIS LINE
>
```

**Add these styles at the end of the StyleSheet (before the closing }):**
```typescript
addressPreview: {
  flexDirection: "row",
  alignItems: "flex-start",
  marginTop: spacing.sm,
  padding: spacing.sm,
  backgroundColor: colors.gray[800],
  borderRadius: radius.sm,
  gap: spacing.sm,
},
addressPreviewText: {
  flex: 1,
},
addressPreviewMain: {
  fontSize: typography.sizes.sm,
  fontWeight: "600",
  color: colors.gray[100],
},
addressPreviewSub: {
  fontSize: typography.sizes.xs,
  color: colors.gray[400],
  marginTop: 2,
},
```

---

## 🚀 How to Test

1. Make all the changes above
2. Restart your Expo server (stop and run `npm start` again)
3. Open the app and go to "Add Listing"
4. Start typing an address like "123 Main"
5. You should see autocomplete suggestions appear!
6. Select an address and it will auto-fill with coordinates

## ✨ What You'll Get

- **Search-as-you-type** address suggestions from Mapbox
- **Instant coordinates** - no extra API call needed
- **Structured data** - street, city, state, zip automatically parsed
- **Beautiful UX** - looks professional with dropdown and preview
- **Cache-friendly** - coordinates come with the address selection

Let me know if you need help with any of these changes!
