import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

const COLORS = {
    background: '#FDF6E3',
    primary: '#C67C43',
    primaryLight: '#F5D6BA',
    dark: '#333333',
    gray: '#888888',
    lightGray: '#E0E0E0',
    white: '#FFFFFF',
};

// Default location (Tashkent)
const DEFAULT_LOCATION = {
    latitude: 41.2995,
    longitude: 69.2401,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
};

export default function LocationPickerScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);
    const geocodeTimeout = useRef<NodeJS.Timeout | null>(null);

    const [region, setRegion] = useState(DEFAULT_LOCATION);
    const [centerCoords, setCenterCoords] = useState({
        latitude: DEFAULT_LOCATION.latitude,
        longitude: DEFAULT_LOCATION.longitude,
    });
    const [address, setAddress] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        getCurrentLocation();
        return () => {
            if (geocodeTimeout.current) {
                clearTimeout(geocodeTimeout.current);
            }
        };
    }, []);

    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setIsLoading(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const newRegion = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };

            setRegion(newRegion);
            setCenterCoords({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            // Reverse geocode to get address
            await reverseGeocode(location.coords.latitude, location.coords.longitude);
            setIsLoading(false);
        } catch (error) {
            console.error('Error getting location:', error);
            setIsLoading(false);
        }
    };

    const reverseGeocode = async (lat: number, lng: number) => {
        setIsGeocoding(true);
        try {
            const result = await Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: lng,
            });

            if (result.length > 0) {
                const addr = result[0];
                const formattedAddress = [
                    addr.street,
                    addr.streetNumber,
                    addr.district,
                    addr.city,
                ].filter(Boolean).join(', ');
                setAddress(formattedAddress || 'Address not found');
            }
        } catch (error) {
            console.error('Error reverse geocoding:', error);
            setAddress('Address not found');
        } finally {
            setIsGeocoding(false);
        }
    };

    // Debounced geocoding - only geocode after user stops moving for 500ms
    const debouncedGeocode = useCallback((lat: number, lng: number) => {
        if (geocodeTimeout.current) {
            clearTimeout(geocodeTimeout.current);
        }
        geocodeTimeout.current = setTimeout(() => {
            reverseGeocode(lat, lng);
        }, 500);
    }, []);

    // Smooth region change - don't geocode during movement
    const handleRegionChange = () => {
        setIsDragging(true);
    };

    // After map stops moving, geocode the center location with debounce
    const handleRegionChangeComplete = (newRegion: typeof region) => {
        setIsDragging(false);
        setRegion(newRegion);
        setCenterCoords({
            latitude: newRegion.latitude,
            longitude: newRegion.longitude,
        });
        // Debounced geocode
        debouncedGeocode(newRegion.latitude, newRegion.longitude);
    };

    const handleConfirmLocation = () => {
        if (!address) {
            return;
        }

        // Navigate to address details with the selected location
        router.push({
            pathname: '/onboarding/address-details',
            params: {
                latitude: centerCoords.latitude.toString(),
                longitude: centerCoords.longitude.toString(),
                address: address,
            },
        });
    };

    const handleRecenter = async () => {
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const newRegion = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };

            if (mapRef.current) {
                mapRef.current.animateToRegion(newRegion, 500);
            }
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Hide the stack header */}
            <Stack.Screen options={{ headerShown: false }} />

            {/* Map - smooth scrolling enabled */}
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={region}
                onRegionChange={handleRegionChange}
                onRegionChangeComplete={handleRegionChangeComplete}
                showsUserLocation
                showsMyLocationButton={false}
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={false}
                rotateEnabled={false}
            />

            {/* Centered Pin - Always at middle of screen */}
            <View style={styles.centerPinWrapper} pointerEvents="none">
                <View style={[styles.centerPin, isDragging && styles.centerPinDragging]}>
                    <View style={[styles.pinHead, isDragging && styles.pinHeadDragging]}>
                        <Ionicons name="location" size={22} color={COLORS.white} />
                    </View>
                    <View style={[styles.pinPointer, isDragging && styles.pinPointerDragging]} />
                </View>
                {/* Shadow under pin */}
                <View style={[styles.pinShadow, isDragging && styles.pinShadowDragging]} />
            </View>

            {/* Top Bar */}
            <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color={COLORS.dark} />
                </TouchableOpacity>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={18} color={COLORS.gray} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search for address..."
                        placeholderTextColor={COLORS.gray}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Recenter Button */}
            <TouchableOpacity style={styles.recenterBtn} onPress={handleRecenter}>
                <Ionicons name="locate" size={24} color={COLORS.primary} />
            </TouchableOpacity>

            {/* Bottom Sheet */}
            <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 20 }]}>
                <Text style={styles.sheetTitle}>Delivery Location</Text>

                <View style={styles.addressRow}>
                    <Ionicons name="location" size={20} color={COLORS.primary} />
                    <Text style={styles.addressText} numberOfLines={2}>
                        {isDragging ? 'Move the map...' : (isGeocoding ? 'Finding address...' : (address || 'Move the map to select location'))}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.confirmBtn, (!address || isGeocoding || isDragging) && styles.confirmBtnDisabled]}
                    onPress={handleConfirmLocation}
                    disabled={!address || isGeocoding || isDragging}
                >
                    <Text style={styles.confirmBtnText}>Confirm Location</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: COLORS.gray,
    },
    map: {
        flex: 1,
    },
    // Centered pin that stays in the middle of screen
    centerPinWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        // Offset to account for bottom sheet height
        marginBottom: 100,
    },
    centerPin: {
        alignItems: 'center',
    },
    centerPinDragging: {
        transform: [{ translateY: -10 }],
    },
    pinHead: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    pinHeadDragging: {
        transform: [{ scale: 1.1 }],
    },
    pinPointer: {
        width: 0,
        height: 0,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderTopWidth: 16,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: COLORS.primary,
        marginTop: -3,
    },
    pinPointerDragging: {
        opacity: 0.7,
    },
    pinShadow: {
        width: 14,
        height: 6,
        borderRadius: 7,
        backgroundColor: 'rgba(0,0,0,0.2)',
        marginTop: 4,
    },
    pinShadowDragging: {
        width: 20,
        height: 8,
        marginTop: 14,
        opacity: 0.5,
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingBottom: 15,
    },
    closeBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        marginLeft: 10,
        paddingHorizontal: 15,
        height: 44,
        borderRadius: 22,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: COLORS.dark,
    },
    recenterBtn: {
        position: 'absolute',
        right: 20,
        bottom: 220,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 15,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F5F0',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
    },
    addressText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        color: COLORS.dark,
        lineHeight: 22,
    },
    confirmBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    confirmBtnDisabled: {
        opacity: 0.6,
    },
    confirmBtnText: {
        color: COLORS.white,
        fontSize: 17,
        fontWeight: 'bold',
    },
});
