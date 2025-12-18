import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
    background: '#FFFFFF',
    primary: '#C67C43',
    primaryLight: '#F5D6BA',
    primaryDark: '#A05A2C',
    dark: '#333333',
    gray: '#888888',
    lightGray: '#F5F5F5',
    border: '#E8E8E8',
    white: '#FFFFFF',
    red: '#E53935',
};

type InputMode = 'phone' | 'email';
type AuthStep = 'input' | 'password' | 'otp';

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { signInWithEmail, signUpWithEmail, isLoading: authLoading } = useAuth();

    const [inputMode, setInputMode] = useState<InputMode>('phone');
    const [step, setStep] = useState<AuthStep>('input');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Animation for content shift on keyboard
    const contentShift = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(1)).current;

    // Keyboard listeners
    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardVisible(true);
                Animated.parallel([
                    Animated.timing(contentShift, {
                        toValue: -SCREEN_HEIGHT * 0.12,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(logoScale, {
                        toValue: 0.7,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        );

        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
                Animated.parallel([
                    Animated.timing(contentShift, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(logoScale, {
                        toValue: 1,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        );

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    // Format phone number for display
    const formatPhoneDisplay = (num: string) => {
        const cleaned = num.replace(/\D/g, '');
        if (cleaned.length <= 2) return cleaned;
        if (cleaned.length <= 5) return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
        if (cleaned.length <= 7) return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
        return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)}`;
    };

    // Handle continue with phone
    const handlePhoneContinue = () => {
        const cleaned = phoneNumber.replace(/\D/g, '');
        if (cleaned.length < 9) {
            setError('Please enter a valid phone number');
            return;
        }
        setError('');
        // TODO: Implement OTP flow
        setError('SMS verification coming soon!');
    };

    // Handle continue with email
    const handleEmailContinue = async () => {
        if (!email.trim() || !email.includes('@')) {
            setError('Please enter a valid email');
            return;
        }
        setError('');
        setStep('password');
    };

    // Handle sign in/up with password
    const handlePasswordSubmit = async () => {
        if (!password || password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await signInWithEmail(email, password);
            router.back();
        } catch (err: any) {
            // If user doesn't exist, try sign up
            if (err.message.includes('user-not-found') || err.message.includes('invalid-credential')) {
                try {
                    await signUpWithEmail(email, password, email.split('@')[0]);
                    router.back();
                } catch (signUpErr: any) {
                    setError(signUpErr.message || 'Authentication failed');
                }
            } else {
                setError(err.message || 'Sign in failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Social login handlers
    const handleGoogleSignIn = () => {
        setError('Google Sign In coming soon!');
    };

    const handleAppleSignIn = () => {
        setError('Apple Sign In coming soon!');
    };

    // Toggle between phone and email
    const toggleInputMode = () => {
        setInputMode(inputMode === 'phone' ? 'email' : 'phone');
        setError('');
        setStep('input');
    };

    // Go back
    const handleBack = () => {
        if (step !== 'input') {
            setStep('input');
            setPassword('');
            setError('');
        } else {
            router.back();
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Close Button - Fixed at top */}
                <TouchableOpacity
                    style={[styles.closeBtn, { top: insets.top + 8 }]}
                    onPress={handleBack}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons
                        name={step === 'input' ? "close" : "arrow-back"}
                        size={26}
                        color={COLORS.dark}
                    />
                </TouchableOpacity>

                <KeyboardAvoidingView
                    style={styles.keyboardView}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <Animated.View
                        style={[
                            styles.content,
                            { transform: [{ translateY: contentShift }] }
                        ]}
                    >
                        {/* Logo - Clean, no background */}
                        <Animated.View
                            style={[
                                styles.logoArea,
                                { transform: [{ scale: logoScale }] }
                            ]}
                        >
                            <Image
                                source={require('@/assets/logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </Animated.View>

                        {/* Title */}
                        <Text style={styles.title}>SHOXA'ga kiring</Text>
                        <Text style={styles.subtitle}>
                            {step === 'input'
                                ? 'Sevimli do\'konlaringizni kuzating'
                                : 'Parolingizni kiriting'}
                        </Text>

                        {/* Input Section */}
                        <View style={styles.formArea}>
                            {step === 'input' && inputMode === 'phone' && (
                                <>
                                    {/* Phone Input */}
                                    <View style={styles.phoneRow}>
                                        <View style={styles.countryCode}>
                                            <Text style={styles.countryFlag}>🇺🇿</Text>
                                            <Text style={styles.countryCodeText}>+998</Text>
                                        </View>
                                        <TextInput
                                            style={styles.phoneInput}
                                            placeholder="90 123 45 67"
                                            placeholderTextColor={COLORS.gray}
                                            keyboardType="phone-pad"
                                            value={formatPhoneDisplay(phoneNumber)}
                                            onChangeText={(text) => {
                                                setPhoneNumber(text.replace(/\D/g, '').slice(0, 9));
                                                setError('');
                                            }}
                                            maxLength={12}
                                        />
                                    </View>

                                    {/* Toggle to email */}
                                    <TouchableOpacity onPress={toggleInputMode} style={styles.toggleLink}>
                                        <Text style={styles.toggleText}>
                                            Email orqali kirish
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {step === 'input' && inputMode === 'email' && (
                                <>
                                    {/* Email Input */}
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="mail-outline" size={20} color={COLORS.gray} />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Email manzilingiz"
                                            placeholderTextColor={COLORS.gray}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            value={email}
                                            onChangeText={(text) => {
                                                setEmail(text);
                                                setError('');
                                            }}
                                        />
                                    </View>

                                    {/* Toggle to phone */}
                                    <TouchableOpacity onPress={toggleInputMode} style={styles.toggleLink}>
                                        <Text style={styles.toggleText}>
                                            Telefon raqam orqali kirish
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {step === 'password' && (
                                <>
                                    {/* Show email */}
                                    <View style={[styles.inputContainer, styles.inputDisabled]}>
                                        <Ionicons name="mail" size={20} color={COLORS.primary} />
                                        <Text style={styles.emailDisplay}>{email}</Text>
                                        <TouchableOpacity onPress={() => setStep('input')}>
                                            <Ionicons name="pencil" size={18} color={COLORS.primary} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Password Input */}
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Parol (6+ belgi)"
                                            placeholderTextColor={COLORS.gray}
                                            secureTextEntry
                                            value={password}
                                            onChangeText={(text) => {
                                                setPassword(text);
                                                setError('');
                                            }}
                                        />
                                    </View>
                                </>
                            )}

                            {/* Error Message */}
                            {error ? (
                                <View style={styles.errorBox}>
                                    <Ionicons name="alert-circle" size={16} color={COLORS.red} />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}

                            {/* Continue Button */}
                            <TouchableOpacity
                                style={[styles.continueBtn, isLoading && styles.continueBtnDisabled]}
                                onPress={
                                    step === 'password'
                                        ? handlePasswordSubmit
                                        : inputMode === 'phone'
                                            ? handlePhoneContinue
                                            : handleEmailContinue
                                }
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={COLORS.white} />
                                ) : (
                                    <Text style={styles.continueBtnText}>Davom etish</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Terms Text */}
                        <Text style={styles.termsText}>
                            Davom etish orqali siz{' '}
                            <Text style={styles.termsLink}>Foydalanish shartlari</Text> va{' '}
                            <Text style={styles.termsLink}>Maxfiylik siyosati</Text>ga rozilik bildirasiz
                        </Text>
                    </Animated.View>

                    {/* Bottom Section - Social Login */}
                    {!keyboardVisible && (
                        <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>yoki</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <View style={styles.socialButtons}>
                                <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleSignIn}>
                                    <Image
                                        source={{ uri: 'https://www.google.com/favicon.ico' }}
                                        style={styles.socialIcon}
                                    />
                                    <Text style={styles.socialBtnText}>Google</Text>
                                </TouchableOpacity>

                                {Platform.OS === 'ios' && (
                                    <TouchableOpacity style={[styles.socialBtn, styles.appleBtn]} onPress={handleAppleSignIn}>
                                        <Ionicons name="logo-apple" size={20} color={COLORS.white} />
                                        <Text style={[styles.socialBtnText, styles.appleBtnText]}>Apple</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <TouchableOpacity style={styles.guestBtn} onPress={() => router.back()}>
                                <Text style={styles.guestBtnText}>Mehmon sifatida davom etish</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    closeBtn: {
        position: 'absolute',
        left: 16,
        zIndex: 100,
        padding: 4,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
    },
    logoArea: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logo: {
        width: 100,
        height: 100,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: COLORS.dark,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.gray,
        textAlign: 'center',
        marginBottom: 32,
    },
    formArea: {
        gap: 12,
    },
    phoneRow: {
        flexDirection: 'row',
        gap: 10,
    },
    countryCode: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.lightGray,
        paddingHorizontal: 14,
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    countryFlag: {
        fontSize: 18,
    },
    countryCodeText: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.dark,
    },
    phoneInput: {
        flex: 1,
        backgroundColor: COLORS.lightGray,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 12,
        fontSize: 18,
        fontWeight: '500',
        color: COLORS.dark,
        letterSpacing: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.lightGray,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 12,
        gap: 12,
    },
    inputDisabled: {
        backgroundColor: '#F9F5F1',
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.dark,
    },
    emailDisplay: {
        flex: 1,
        fontSize: 16,
        color: COLORS.dark,
        fontWeight: '500',
    },
    toggleLink: {
        alignSelf: 'center',
        paddingVertical: 8,
    },
    toggleText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        gap: 8,
    },
    errorText: {
        color: COLORS.red,
        fontSize: 13,
        flex: 1,
    },
    continueBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    continueBtnDisabled: {
        opacity: 0.7,
    },
    continueBtnText: {
        color: COLORS.white,
        fontSize: 17,
        fontWeight: '600',
    },
    termsText: {
        fontSize: 12,
        color: COLORS.gray,
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 18,
        paddingHorizontal: 20,
    },
    termsLink: {
        color: COLORS.primary,
    },
    bottomSection: {
        paddingHorizontal: 24,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    dividerText: {
        paddingHorizontal: 16,
        color: COLORS.gray,
        fontSize: 13,
    },
    socialButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    socialBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        gap: 8,
    },
    socialIcon: {
        width: 20,
        height: 20,
    },
    socialBtnText: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.dark,
    },
    appleBtn: {
        backgroundColor: COLORS.dark,
        borderColor: COLORS.dark,
    },
    appleBtnText: {
        color: COLORS.white,
    },
    guestBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    guestBtnText: {
        color: COLORS.primary,
        fontSize: 15,
        fontWeight: '500',
    },
});
