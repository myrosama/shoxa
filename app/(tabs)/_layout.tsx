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
        tabBarInactiveTintColor: '#9E9E9E',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          height: 65,
          borderRadius: 35,
          paddingBottom: 0,
          paddingTop: 0,
          borderTopWidth: 0,
          elevation: 15,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
          backgroundColor: '#ffffff',
        },
        tabBarShowLabel: false,
        tabBarItemStyle: {
          height: 65,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}>

      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? "grid" : "grid-outline"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? "newspaper" : "newspaper-outline"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#C67C43',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'absolute',
              bottom: 15,
              shadowColor: '#C67C43',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 10,
              borderWidth: 3,
              borderColor: '#FDF6E3'
            }}>
              <Ionicons name="map" size={26} color="white" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? "cart" : "cart-outline"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? "person" : "person-outline"} color={color} />,
        }}
      />
    </Tabs>
  );
}