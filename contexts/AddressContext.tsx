import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// Types
export interface SavedAddress {
    id: string;
    name: string;
    address: string;
    type: 'home' | 'work' | 'other';
    latitude: number;
    longitude: number;
    entrance?: string;
    floor?: string;
    apartment?: string;
    courierNote?: string;
}

interface AddressContextType {
    addresses: SavedAddress[];
    selectedAddress: SavedAddress | null;
    isLoading: boolean;
    addAddress: (address: Omit<SavedAddress, 'id'>) => Promise<void>;
    updateAddress: (id: string, updates: Partial<SavedAddress>) => Promise<void>;
    deleteAddress: (id: string) => Promise<void>;
    selectAddress: (id: string) => void;
    refreshAddresses: () => Promise<void>;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

const ADDRESSES_STORAGE_KEY = '@shoxa_saved_addresses';
const SELECTED_ADDRESS_KEY = '@shoxa_selected_address';

interface AddressProviderProps {
    children: ReactNode;
}

export function AddressProvider({ children }: AddressProviderProps) {
    const [addresses, setAddresses] = useState<SavedAddress[]>([]);
    const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load addresses from storage on mount
    useEffect(() => {
        loadAddresses();
    }, []);

    const loadAddresses = async () => {
        try {
            setIsLoading(true);
            const storedAddresses = await AsyncStorage.getItem(ADDRESSES_STORAGE_KEY);
            const storedSelectedId = await AsyncStorage.getItem(SELECTED_ADDRESS_KEY);

            if (storedAddresses) {
                const parsedAddresses: SavedAddress[] = JSON.parse(storedAddresses);
                setAddresses(parsedAddresses);

                // Set selected address
                if (storedSelectedId && parsedAddresses.length > 0) {
                    const selected = parsedAddresses.find(a => a.id === storedSelectedId);
                    setSelectedAddress(selected || parsedAddresses[0]);
                } else if (parsedAddresses.length > 0) {
                    setSelectedAddress(parsedAddresses[0]);
                }
            }
        } catch (error) {
            console.error('Error loading addresses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveAddresses = async (newAddresses: SavedAddress[]) => {
        try {
            await AsyncStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(newAddresses));
        } catch (error) {
            console.error('Error saving addresses:', error);
        }
    };

    const addAddress = async (addressData: Omit<SavedAddress, 'id'>) => {
        const newAddress: SavedAddress = {
            ...addressData,
            id: Date.now().toString(),
        };

        const updatedAddresses = [...addresses, newAddress];
        setAddresses(updatedAddresses);
        await saveAddresses(updatedAddresses);

        // Auto-select if first address
        if (updatedAddresses.length === 1) {
            selectAddress(newAddress.id);
        }
    };

    const updateAddress = async (id: string, updates: Partial<SavedAddress>) => {
        const updatedAddresses = addresses.map(addr =>
            addr.id === id ? { ...addr, ...updates } : addr
        );
        setAddresses(updatedAddresses);
        await saveAddresses(updatedAddresses);

        // Update selected if it was updated
        if (selectedAddress?.id === id) {
            setSelectedAddress({ ...selectedAddress, ...updates });
        }
    };

    const deleteAddress = async (id: string) => {
        const updatedAddresses = addresses.filter(addr => addr.id !== id);
        setAddresses(updatedAddresses);
        await saveAddresses(updatedAddresses);

        // Update selected if deleted
        if (selectedAddress?.id === id) {
            setSelectedAddress(updatedAddresses[0] || null);
            if (updatedAddresses[0]) {
                await AsyncStorage.setItem(SELECTED_ADDRESS_KEY, updatedAddresses[0].id);
            } else {
                await AsyncStorage.removeItem(SELECTED_ADDRESS_KEY);
            }
        }
    };

    const selectAddress = async (id: string) => {
        const address = addresses.find(a => a.id === id);
        if (address) {
            setSelectedAddress(address);
            await AsyncStorage.setItem(SELECTED_ADDRESS_KEY, id);
        }
    };

    const refreshAddresses = async () => {
        await loadAddresses();
    };

    const value: AddressContextType = {
        addresses,
        selectedAddress,
        isLoading,
        addAddress,
        updateAddress,
        deleteAddress,
        selectAddress,
        refreshAddresses,
    };

    return (
        <AddressContext.Provider value={value}>
            {children}
        </AddressContext.Provider>
    );
}

export function useAddresses() {
    const context = useContext(AddressContext);
    if (context === undefined) {
        throw new Error('useAddresses must be used within an AddressProvider');
    }
    return context;
}
