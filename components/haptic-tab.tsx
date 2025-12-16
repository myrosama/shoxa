import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Animated, Platform } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = (ev: any) => {
    // Haptic feedback on iOS
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Scale down animation
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();

    props.onPressIn?.(ev);
  };

  const handlePressOut = (ev: any) => {
    // Bounce back with spring
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();

    props.onPressOut?.(ev);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
      <PlatformPressable
        {...props}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[props.style, { flex: 1 }]}
      />
    </Animated.View>
  );
}
