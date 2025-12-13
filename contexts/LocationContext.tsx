import * as Location from 'expo-location';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

// Types
interface Coordinates {
    latitude: number;
    longitude: number;
}

interface LocationContextType {
    userLocation: Coordinates | null;
    locationError: string | null;
    isLoading: boolean;
    permissionStatus: Location.PermissionStatus | null;
    requestLocationPermission: () => Promise<boolean>;
    getCurrentLocation: () => Promise<Coordinates | null>;
    calculateDistance: (targetLat: number, targetLng: number) => string;
    calculateDistanceKm: (targetLat: number, targetLng: number) => number | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Haversine formula to calculate distance between two coordinates
const haversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
};

interface LocationProviderProps {
    children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);

    // Request location permission
    const requestLocationPermission = useCallback(async (): Promise<boolean> => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setPermissionStatus(status);
            return status === Location.PermissionStatus.GRANTED;
        } catch (error) {
            console.error('Error requesting location permission:', error);
            setLocationError('Failed to request location permission');
            return false;
        }
    }, []);

    // Get current location
    const getCurrentLocation = useCallback(async (): Promise<Coordinates | null> => {
        try {
            setIsLoading(true);
            setLocationError(null);

            // Check permission first
            const { status } = await Location.getForegroundPermissionsAsync();
            setPermissionStatus(status);

            if (status !== Location.PermissionStatus.GRANTED) {
                setLocationError('Location permission not granted');
                setIsLoading(false);
                return null;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const coords: Coordinates = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            setUserLocation(coords);
            setIsLoading(false);
            return coords;
        } catch (error) {
            console.error('Error getting location:', error);
            setLocationError('Failed to get current location');
            setIsLoading(false);
            return null;
        }
    }, []);

    // Calculate distance and return formatted string
    const calculateDistance = useCallback(
        (targetLat: number, targetLng: number): string => {
            if (!userLocation) {
                return '--';
            }

            const distance = haversineDistance(
                userLocation.latitude,
                userLocation.longitude,
                targetLat,
                targetLng
            );

            if (distance < 1) {
                // Less than 1 km, show in meters
                return `${Math.round(distance * 1000)} m`;
            } else {
                // Show in km with 1 decimal
                return `${distance.toFixed(1)} km`;
            }
        },
        [userLocation]
    );

    // Calculate distance and return raw km value
    const calculateDistanceKm = useCallback(
        (targetLat: number, targetLng: number): number | null => {
            if (!userLocation) {
                return null;
            }

            return haversineDistance(
                userLocation.latitude,
                userLocation.longitude,
                targetLat,
                targetLng
            );
        },
        [userLocation]
    );

    // Initialize location on mount
    useEffect(() => {
        const initLocation = async () => {
            const hasPermission = await requestLocationPermission();
            if (hasPermission) {
                await getCurrentLocation();
            } else {
                setIsLoading(false);
            }
        };

        initLocation();
    }, []);

    const value: LocationContextType = {
        userLocation,
        locationError,
        isLoading,
        permissionStatus,
        requestLocationPermission,
        getCurrentLocation,
        calculateDistance,
        calculateDistanceKm,
    };

    return (
        <LocationContext.Provider value={value}>
            {children}
        </LocationContext.Provider>
    );
}

// Hook to use location context
export function useLocation() {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
}
