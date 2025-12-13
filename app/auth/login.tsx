import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
    background: '#FDF6E3',
    primary: '#C67C43',
    primaryLight: '#F5D6BA',
    dark: '#333333',
    gray: '#888888',
    lightGray: '#E0E0E0',
    white: '#FFFFFF',
};

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleContinue = () => {
        if (phoneNumber.length < 9) {
            Alert.alert('Invalid Number', 'Please enter a valid phone number');
            return;
        }

        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            Alert.alert('Coming Soon', 'OTP verification will be implemented soon!');
        }, 1000);
    };

    const handleContinueAsGuest = () => {
        router.back();
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="close" size={28} color={COLORS.dark} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Logo Area */}
                <View style={styles.logoArea}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="leaf" size={50} color={COLORS.primary} />
                    </View>
                    <Text style={styles.title}>Welcome to SHOXA</Text>
                    <Text style={styles.subtitle}>
                        Sign in to track orders, save addresses, and get personalized recommendations
                    </Text>
                </View>

                {/* Phone Input */}
                <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <View style={styles.phoneInputContainer}>
                        <View style={styles.countryCode}>
                            <Text style={styles.countryCodeText}>🇺🇿 +998</Text>
                        </View>
                        <TextInput
                            style={styles.phoneInput}
                            placeholder="90 123 45 67"
                            placeholderTextColor={COLORS.gray}
                            keyboardType="phone-pad"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            maxLength={12}
                        />
                    </View>
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                    style={[styles.continueBtn, isLoading && styles.continueBtnDisabled]}
                    onPress={handleContinue}
                    disabled={isLoading}
                >
                    <Text style={styles.continueBtnText}>
                        {isLoading ? 'Please wait...' : 'Continue'}
                    </Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Guest Button */}
                <TouchableOpacity style={styles.guestBtn} onPress={handleContinueAsGuest}>
                    <Text style={styles.guestBtnText}>Continue as Guest</Text>
                </TouchableOpacity>

                {/* Terms */}
                <Text style={styles.termsText}>
                    By continuing, you agree to our{' '}
                    <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    backBtn: {
        padding: 5,
    },
    content: {
        flex: 1,
        paddingHorizontal: 25,
    },
    logoArea: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 40,
    },
    logoContainer: {
        width: 90,
        height: 90,
        borderRadius: 25,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.gray,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    inputSection: {
        marginBottom: 25,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: 10,
    },
    phoneInputContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
        overflow: 'hidden',
    },
    countryCode: {
        paddingHorizontal: 15,
        paddingVertical: 16,
        backgroundColor: '#F5F5F5',
        borderRightWidth: 1,
        borderRightColor: COLORS.lightGray,
    },
    countryCodeText: {
        fontSize: 16,
        color: COLORS.dark,
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: 15,
        paddingVertical: 16,
        fontSize: 16,
        color: COLORS.dark,
    },
    continueBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    continueBtnDisabled: {
        opacity: 0.7,
    },
    continueBtnText: {
        color: COLORS.white,
        fontSize: 17,
        fontWeight: 'bold',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 25,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.lightGray,
    },
    dividerText: {
        paddingHorizontal: 15,
        color: COLORS.gray,
        fontSize: 14,
    },
    guestBtn: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.primary,
    },
    guestBtnText: {
        color: COLORS.primary,
        fontSize: 17,
        fontWeight: '600',
    },
    termsText: {
        fontSize: 13,
        color: COLORS.gray,
        textAlign: 'center',
        marginTop: 30,
        lineHeight: 20,
        paddingHorizontal: 10,
    },
    termsLink: {
        color: COLORS.primary,
        fontWeight: '500',
    },
});
