// components/LocationMap.web.tsx
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

// A "Fake" Map for the website to prevent crashing
export const MapView = (props: any) => {
  return (
    <View style={[styles.container, props.style]}>
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000' }} 
        style={styles.image}
      />
      <View style={styles.overlay}>
        <Text style={styles.text}>SHOXA Map</Text>
        <Text style={styles.subText}>(Interactive Map available on Mobile)</Text>
      </View>
      {/* This ensures markers don't crash the web version */}
      {props.children} 
    </View>
  );
};

// Return null for markers on web
export const Marker = () => null; 
export const PROVIDER_GOOGLE = 'google';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eee', position: 'relative' },
  image: { width: '100%', height: '100%', opacity: 0.5 },
  overlay: { position: 'absolute', top: '40%', width: '100%', alignItems: 'center' },
  text: { fontSize: 24, fontWeight: 'bold', color: '#444' },
  subText: { fontSize: 14, color: '#ec7813' },
});