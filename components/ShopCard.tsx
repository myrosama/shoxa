import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/MapTheme';

export const ShopCard = ({ item }: { item: any }) => (
  <TouchableOpacity style={styles.container} activeOpacity={0.9}>
    <View style={styles.imageContainer}>
      <Image source={{ uri: item.image }} style={styles.image} />
      {/* Status Badge */}
      <View style={[styles.badge, { backgroundColor: item.status === 'Open' ? '#E8F5E9' : '#FFEBEE' }]}>
        <Text style={[styles.badgeText, { color: item.status === 'Open' ? '#2E7D32' : '#C62828' }]}>
          {item.status}
        </Text>
      </View>
    </View>

    <View style={styles.info}>
      <View>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.subtitle}>{item.type} • {item.distance}</Text>
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
    // Professional Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  badge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
    fontFamily: 'System', // On iOS this looks premium by default
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSub,
    fontWeight: '500',
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF5EC', // Light orange tint
    justifyContent: 'center',
    alignItems: 'center',
  }
});