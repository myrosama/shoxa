import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeColor = Colors[colorScheme ?? 'light'].tint;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          backgroundColor: '#ffffff'
        }
      }}>
      
      {/* 1. Amenities / Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? "grid" : "grid-outline"} color={color} />,
        }}
      />

      {/* 2. Feed */}
      <Tabs.Screen
        name="feed" // You will need to create app/(tabs)/feed.tsx later
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? "newspaper" : "newspaper-outline"} color={color} />,
        }}
      />

      {/* 3. Map (Center, Bold) */}
      <Tabs.Screen
        name="explore" // This maps to app/(tabs)/explore.tsx which is our Map view
        options={{
          title: '', // No title for the center button
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 56, height: 56, borderRadius: 28, 
              backgroundColor: '#C67C43', 
              justifyContent: 'center', alignItems: 'center',
              marginBottom: 20, // Push it up
              shadowColor: '#C67C43', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 5
            }}>
              <Ionicons name="map" size={28} color="white" />
            </View>
          ),
        }}
      />

      {/* 4. Cart */}
      <Tabs.Screen
        name="cart" // You will need to create app/(tabs)/cart.tsx later
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? "cart" : "cart-outline"} color={color} />,
        }}
      />

      {/* 5. Profile */}
      <Tabs.Screen
        name="profile" // You will need to create app/(tabs)/profile.tsx later
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? "person" : "person-outline"} color={color} />,
        }}
      />
    </Tabs>
  );
}