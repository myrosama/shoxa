import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
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

const LOCATION_TYPES = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'work', icon: 'briefcase', label: 'Work' },
    { id: 'other', icon: 'location', label: 'Other' },
];

export default function AddressDetailsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{
        latitude: string;
        longitude: string;
        address: string;
    }>();

    const [locationType, setLocationType] = useState('home');
    const [addressName, setAddressName] = useState('Uy');
    const [entrance, setEntrance] = useState('');
    const [floor, setFloor] = useState('');
    const [apartment, setApartment] = useState('');
    const [courierNote, setCourierNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveAddress = async () => {
        if (!addressName.trim()) {
            Alert.alert('Error', 'Please enter an address name');
            return;
        }

        setIsSaving(true);

        try {
            const newAddress = {
                id: Date.now().toString(),
                type: locationType,
                name: addressName,
                address: params.address,
                latitude: parseFloat(params.latitude || '0'),
                longitude: parseFloat(params.longitude || '0'),
                entrance,
                floor,
                apartment,
                courierNote,
                createdAt: new Date().toISOString(),
            };

            // Get existing addresses
            const existingAddresses = await AsyncStorage.getItem('savedAddresses');
            const addresses = existingAddresses ? JSON.parse(existingAddresses) : [];

            // Add new address
            addresses.push(newAddress);

            // Save to AsyncStorage
            await AsyncStorage.setItem('savedAddresses', JSON.stringify(addresses));

            // Mark onboarding as complete
            await AsyncStorage.setItem('onboardingComplete', 'true');

            Alert.alert(
                'Address Saved!',
                'Your delivery address has been saved successfully.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.replace('/(tabs)'),
                    },
                ]
            );
        } catch (error) {
            console.error('Error saving address:', error);
            Alert.alert('Error', 'Failed to save address. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[styles.container, { paddingTop: insets.top }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Address Details</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Address Display */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Address</Text>
                            <View style={styles.addressDisplay}>
                                <Ionicons name="location" size={22} color={COLORS.primary} />
                                <Text style={styles.addressText} numberOfLines={2}>
                                    {params.address || 'Address not available'}
                                </Text>
                            </View>
                        </View>

                        {/* Location Type */}
                        <View style={styles.section}>
                            <View style={styles.locationTypeRow}>
                                <View style={styles.locationTypeSelector}>
                                    {LOCATION_TYPES.map((type) => (
                                        <TouchableOpacity
                                            key={type.id}
                                            style={[
                                                styles.locationTypeBtn,
                                                locationType === type.id && styles.locationTypeBtnActive,
                                            ]}
                                            onPress={() => {
                                                setLocationType(type.id);
                                                setAddressName(type.label === 'Home' ? 'Uy' : type.label === 'Work' ? 'Ish' : '');
                                            }}
                                        >
                                            <Ionicons
                                                name={type.icon as any}
                                                size={18}
                                                color={locationType === type.id ? COLORS.white : COLORS.primary}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Address Name Input */}
                                <View style={styles.addressNameContainer}>
                                    <Text style={styles.inputLabel}>Address Name</Text>
                                    <TextInput
                                        style={styles.addressNameInput}
                                        placeholder="e.g., Uy"
                                        placeholderTextColor={COLORS.gray}
                                        value={addressName}
                                        onChangeText={setAddressName}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Detail Fields */}
                        <View style={styles.detailFieldsRow}>
                            <View style={styles.detailField}>
                                <Text style={styles.inputLabel}>Entrance</Text>
                                <TextInput
                                    style={styles.detailInput}
                                    placeholder="1"
                                    placeholderTextColor={COLORS.gray}
                                    value={entrance}
                                    onChangeText={setEntrance}
                                    keyboardType="number-pad"
                                />
                            </View>
                            <View style={styles.detailField}>
                                <Text style={styles.inputLabel}>Floor</Text>
                                <TextInput
                                    style={styles.detailInput}
                                    placeholder="2"
                                    placeholderTextColor={COLORS.gray}
                                    value={floor}
                                    onChangeText={setFloor}
                                    keyboardType="number-pad"
                                />
                            </View>
                            <View style={styles.detailField}>
                                <Text style={styles.inputLabel}>Apt/Room</Text>
                                <TextInput
                                    style={styles.detailInput}
                                    placeholder="15"
                                    placeholderTextColor={COLORS.gray}
                                    value={apartment}
                                    onChangeText={setApartment}
                                />
                            </View>
                        </View>

                        {/* Courier Note */}
                        <View style={styles.section}>
                            <Text style={styles.inputLabel}>Note for courier</Text>
                            <TextInput
                                style={styles.noteInput}
                                placeholder="Any special instructions for delivery..."
                                placeholderTextColor={COLORS.gray}
                                value={courierNote}
                                onChangeText={setCourierNote}
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </ScrollView>

                    {/* Save Button */}
                    <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                        <TouchableOpacity
                            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                            onPress={handleSaveAddress}
                            disabled={isSaving}
                        >
                            <Text style={styles.saveBtnText}>
                                {isSaving ? 'Saving...' : 'Save Address'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
        backgroundColor: COLORS.white,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: 10,
    },
    addressDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
    },
    addressText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        color: COLORS.dark,
        lineHeight: 22,
    },
    locationTypeRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 15,
    },
    locationTypeSelector: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
    },
    locationTypeBtn: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationTypeBtnActive: {
        backgroundColor: COLORS.primary,
    },
    addressNameContainer: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        color: COLORS.gray,
        marginBottom: 6,
    },
    addressNameInput: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 15,
        paddingVertical: 14,
        borderRadius: 12,
        fontSize: 15,
        color: COLORS.dark,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
    },
    detailFieldsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    detailField: {
        flex: 1,
    },
    detailInput: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 15,
        paddingVertical: 14,
        borderRadius: 12,
        fontSize: 15,
        color: COLORS.dark,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
        textAlign: 'center',
    },
    noteInput: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 15,
        paddingVertical: 14,
        borderRadius: 12,
        fontSize: 15,
        color: COLORS.dark,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 15,
        backgroundColor: COLORS.background,
    },
    saveBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    saveBtnDisabled: {
        opacity: 0.7,
    },
    saveBtnText: {
        color: COLORS.white,
        fontSize: 17,
        fontWeight: 'bold',
    },
});
