import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import RNMapView, {
  Marker as RNMarker,
  PROVIDER_GOOGLE as RN_PROVIDER_GOOGLE,
  MapViewProps as RNMapViewProps,
  Region as RNRegion
} from 'react-native-maps';

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
  default: React.forwardRef<RNMapView, MapViewProps>((props, ref) => {
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