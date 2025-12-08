import { Tabs } from 'expo-router';
import React from 'react';
import { View, Platform } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
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
          position: 'absolute', 
          bottom: 25, // Lifted up
          left: 20, 
          right: 20, // Floating with margins
          height: 70,
          borderRadius: 35, // Fully rounded ends
          paddingBottom: 0, // Centered icons
          paddingTop: 0,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          backgroundColor: '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarShowLabel: false, // Cleaner look without labels (optional, based on photo)
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "grid" : "grid-outline"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "newspaper" : "newspaper-outline"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 60, height: 60, borderRadius: 30, 
              backgroundColor: '#C67C43', 
              justifyContent: 'center', alignItems: 'center',
              marginBottom: 40, // Pop out effect
              shadowColor: '#C67C43', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, elevation: 8,
              borderWidth: 4, borderColor: '#FDF6E3' // Ring effect
            }}>
              <Ionicons name="map" size={28} color="white" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "cart" : "cart-outline"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "person" : "person-outline"} color={color} />,
        }}
      />
    </Tabs>
  );
}