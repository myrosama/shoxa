import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const [region, setRegion] = useState(DEFAULT_LOCATION);
    const [selectedLocation, setSelectedLocation] = useState({
        latitude: DEFAULT_LOCATION.latitude,
        longitude: DEFAULT_LOCATION.longitude,
    });
    const [address, setAddress] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        getCurrentLocation();
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
            setSelectedLocation({
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
        }
    };

    const handleMapPress = async (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setSelectedLocation({ latitude, longitude });
        await reverseGeocode(latitude, longitude);
    };

    const handleConfirmLocation = () => {
        if (!address) {
            Alert.alert('Error', 'Please select a location');
            return;
        }

        // Navigate to address details with the selected location
        router.push({
            pathname: '/onboarding/address-details',
            params: {
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
                address: address,
            },
        });
    };

    const handleRecenter = () => {
        getCurrentLocation();
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Map */}
            <MapView
                style={styles.map}
                region={region}
                onRegionChangeComplete={setRegion}
                onPress={handleMapPress}
                showsUserLocation
                showsMyLocationButton={false}
            >
                <Marker
                    coordinate={selectedLocation}
                    draggable
                    onDragEnd={(e) => {
                        setSelectedLocation(e.nativeEvent.coordinate);
                        reverseGeocode(
                            e.nativeEvent.coordinate.latitude,
                            e.nativeEvent.coordinate.longitude
                        );
                    }}
                >
                    <View style={styles.markerContainer}>
                        <View style={styles.marker}>
                            <Ionicons name="home" size={20} color={COLORS.white} />
                        </View>
                        <View style={styles.markerPointer} />
                    </View>
                </Marker>
            </MapView>

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
                        {address || 'Tap on map to select location'}
                    </Text>
                </View>

                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmLocation}>
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
        width: 40,
        height: 40,
        borderRadius: 20,
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
        height: 45,
        borderRadius: 12,
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
    markerContainer: {
        alignItems: 'center',
    },
    marker: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    markerPointer: {
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 12,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: COLORS.primary,
        marginTop: -2,
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
    confirmBtnText: {
        color: COLORS.white,
        fontSize: 17,
        fontWeight: 'bold',
    },
});
