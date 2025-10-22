import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
// Avoid importing react-native-maps on web (no web support)
let RNMapView: any = null;
let RNMarker: any = null;
let RN_PROVIDER_GOOGLE: any = null;
type RNMapViewProps = any;
type RNRegion = any;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Maps = require('react-native-maps');
  RNMapView = Maps.default;
  RNMarker = Maps.Marker;
  RN_PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
}

export type Region = RNRegion;

interface MapViewProps extends Partial<RNMapViewProps> {
  style?: any;
  customMapStyle?: any[];
  provider?: any;
  initialRegion?: Region;
  region?: Region;
  onRegionChange?: (region: Region) => void;
  onRegionChangeComplete?: (region: Region) => void;
  children?: React.ReactNode;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
}

// Use actual MapView on mobile, fallback on web
const MapViewComponent = Platform.select({
  web: React.forwardRef<any, MapViewProps>((props, ref) => {
    return (
      <View style={[styles.mapContainer, props.style]}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapText}>Map View</Text>
          <Text style={styles.mapSubtext}>Not available on Web</Text>
          <Text style={styles.mapSubtext}>Please use Expo Go or native app for map functionality</Text>
        </View>
      </View>
    );
  }),
  default: React.forwardRef<typeof RNMapView, MapViewProps>((props, ref) => {
    return (
      <RNMapView
        ref={ref}
        {...props}
      />
    );
  }),
});

export const MapView = MapViewComponent;

// Use actual Marker on mobile, null on web
export const Marker = Platform.select({
  web: ({ coordinate, children }: any) => null,
  default: RNMarker,
});

export const PROVIDER_GOOGLE = Platform.select({
  web: undefined,
  default: RN_PROVIDER_GOOGLE,
});

const styles = StyleSheet.create({
  mapContainer: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    padding: 20,
    alignItems: 'center',
  },
  mapText: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  mapSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default MapView;
