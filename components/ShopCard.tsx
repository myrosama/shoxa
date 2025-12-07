import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/MapTheme';

export const ShopCard = ({ item }: { item: any }) => (
  <TouchableOpacity style={styles.container} activeOpacity={0.9}>
    <View style={styles.imageContainer}>
      <Image 
        source={{ uri: item.image || 'https://via.placeholder.com/150' }} 
        style={styles.image} 
      />
      <View style={[styles.badge, { backgroundColor: item.isOpen ? '#E8F5E9' : '#FFEBEE' }]}>
        <Text style={[styles.badgeText, { color: item.isOpen ? '#2E7D32' : '#C62828' }]}>
          {item.isOpen ? 'Open' : 'Closed'}
        </Text>
      </View>
    </View>

    <View style={styles.info}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.subtitle}>{item.category} • {item.distance || 'Nearby'}</Text>
        <Text style={styles.address} numberOfLines={1}>{item.address || 'Tashkent, Uzbekistan'}</Text>
      </View>
      <View style={styles.arrowBtn}>
        <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginBottom: 16,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: { position: 'relative' },
  image: { width: 80, height: 80, borderRadius: 16, backgroundColor: '#f0f0f0' },
  badge: {
    position: 'absolute', bottom: 6, left: 6,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  info: { flex: 1, paddingLeft: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textMain, marginBottom: 2 },
  subtitle: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginBottom: 2 },
  address: { fontSize: 12, color: COLORS.textSub },
  arrowBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFF5EC', justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  }
});