import React, { createContext, ReactNode, useContext, useState } from 'react';

// Cart item type
export interface CartItem {
    productId: string;
    shopId: string;
    shopName: string;
    name: string;
    price: number;
    discountPrice?: number;
    imageUrl?: string;
    quantity: number;
}

// Cart context type
interface CartContextType {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (productId: string, shopId: string) => void;
    updateQuantity: (productId: string, shopId: string, quantity: number) => void;
    getItemQuantity: (productId: string, shopId: string) => number;
    getShopItems: (shopId: string) => CartItem[];
    getTotalItems: () => number;
    getTotalPrice: () => number;
    clearCart: () => void;
    clearShopCart: (shopId: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);

    const addItem = (item: Omit<CartItem, 'quantity'>) => {
        setItems(prev => {
            const existingIndex = prev.findIndex(
                i => i.productId === item.productId && i.shopId === item.shopId
            );

            if (existingIndex >= 0) {
                // Increment quantity
                const updated = [...prev];
                updated[existingIndex].quantity += 1;
                return updated;
            } else {
                // Add new item
                return [...prev, { ...item, quantity: 1 }];
            }
        });
    };

    const removeItem = (productId: string, shopId: string) => {
        setItems(prev => {
            const existingIndex = prev.findIndex(
                i => i.productId === productId && i.shopId === shopId
            );

            if (existingIndex >= 0) {
                const updated = [...prev];
                if (updated[existingIndex].quantity > 1) {
                    updated[existingIndex].quantity -= 1;
                    return updated;
                } else {
                    // Remove item completely
                    return prev.filter(i => !(i.productId === productId && i.shopId === shopId));
                }
            }
            return prev;
        });
    };

    const updateQuantity = (productId: string, shopId: string, quantity: number) => {
        if (quantity <= 0) {
            setItems(prev => prev.filter(i => !(i.productId === productId && i.shopId === shopId)));
        } else {
            setItems(prev => prev.map(i =>
                i.productId === productId && i.shopId === shopId
                    ? { ...i, quantity }
                    : i
            ));
        }
    };

    const getItemQuantity = (productId: string, shopId: string): number => {
        const item = items.find(i => i.productId === productId && i.shopId === shopId);
        return item?.quantity || 0;
    };

    const getShopItems = (shopId: string): CartItem[] => {
        return items.filter(i => i.shopId === shopId);
    };

    const getTotalItems = (): number => {
        return items.reduce((sum, item) => sum + item.quantity, 0);
    };

    const getTotalPrice = (): number => {
        return items.reduce((sum, item) => {
            const price = item.discountPrice || item.price;
            return sum + (price * item.quantity);
        }, 0);
    };

    const clearCart = () => {
        setItems([]);
    };

    const clearShopCart = (shopId: string) => {
        setItems(prev => prev.filter(i => i.shopId !== shopId));
    };

    return (
        <CartContext.Provider value={{
            items,
            addItem,
            removeItem,
            updateQuantity,
            getItemQuantity,
            getShopItems,
            getTotalItems,
            getTotalPrice,
            clearCart,
            clearShopCart,
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
