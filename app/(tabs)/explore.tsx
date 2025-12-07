import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  background: '#FAF3E9',
  primary: '#DC6515',
  dark: '#4E3320',
  white: '#FFFFFF',
  inputBg: '#F5F5F5',
};

export default function ExploreScreen() {
  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = () => {
    // Here we will eventually connect to Firebase to push this data
    console.log("Adding Shop:", { shopName, description, address });
    Alert.alert("Success", "Shop has been submitted for review!");
    setShopName('');
    setDescription('');
    setAddress('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <Text style={styles.subTitle}>Register a new shop or hospital</Text>

        <View style={styles.formContainer}>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Makro Supermarket"
              value={shopName}
              onChangeText={setShopName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="What do they sell?"
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location/Address</Text>
            <View style={styles.locationInputWrapper}>
              <Ionicons name="location-outline" size={20} color={COLORS.dark} style={{ marginRight: 10 }} />
              <TextInput 
                style={{ flex: 1, height: '100%' }}
                placeholder="Select on map or type address"
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>Register Business</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>

        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.infoText}>
            This data will be uploaded to the SHOXA database. Ensure coordinates are accurate for the map view.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: 10,
  },
  subTitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 30,
  },
  formContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  locationInputWrapper: {
    backgroundColor: COLORS.inputBg,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 15,
    marginTop: 10,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  infoBox: {
    marginTop: 30,
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'rgba(220, 101, 21, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 10,
    color: COLORS.dark,
    flex: 1,
    fontSize: 13,
  },
});