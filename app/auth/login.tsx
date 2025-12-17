import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
    background: '#FDF6E3',
    primary: '#C67C43',
    primaryLight: '#F5D6BA',
    primaryDark: '#A05A2C',
    dark: '#333333',
    gray: '#888888',
    lightGray: '#E0E0E0',
    white: '#FFFFFF',
    green: '#4CAF50',
    red: '#E53935',
};

type AuthMode = 'input' | 'signin' | 'signup';

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { signInWithEmail, signUpWithEmail, isLoading: authLoading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [mode, setMode] = useState<AuthMode>('input');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Check if input is email
    const isEmailFormat = (text: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
    };

    // Handle continue with email
    const handleContinue = async () => {
        if (!email.trim()) {
            setError('Please enter your email');
            return;
        }

        if (!isEmailFormat(email)) {
            setError('Please enter a valid email');
            return;
        }

        setError('');

        // Animate transition
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // For now, assume new user - in production, check email existence
            setMode('signup');
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        });
    };

    // Handle sign in
    const handleSignIn = async () => {
        if (!password) {
            setError('Please enter your password');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await signInWithEmail(email, password);
            router.back();
        } catch (err: any) {
            setError(err.message || 'Sign in failed');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle sign up
    const handleSignUp = async () => {
        if (!displayName.trim()) {
            setError('Please enter your name');
            return;
        }
        if (!password || password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await signUpWithEmail(email, password, displayName);
            router.back();
        } catch (err: any) {
            // If user exists, switch to sign in mode
            if (err.message.includes('already in use')) {
                setMode('signin');
                setError('Account exists. Please sign in.');
            } else {
                setError(err.message || 'Sign up failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle social login
    const handleGoogleSignIn = () => {
        // TODO: Implement Google Sign In
        setError('Google Sign In coming soon!');
    };

    const handleAppleSignIn = () => {
        // TODO: Implement Apple Sign In  
        setError('Apple Sign In coming soon!');
    };

    // Switch between signin/signup
    const toggleMode = () => {
        setError('');
        setMode(mode === 'signin' ? 'signup' : 'signin');
    };

    // Go back to email input
    const goBack = () => {
        if (mode !== 'input') {
            setMode('input');
            setPassword('');
            setDisplayName('');
            setError('');
        } else {
            router.back();
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
                style={[styles.container, { paddingTop: insets.top }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                        <Ionicons name={mode === 'input' ? "close" : "arrow-back"} size={28} color={COLORS.dark} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Logo Area */}
                    <View style={styles.logoArea}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('@/assets/logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.title}>
                            {mode === 'input' ? 'Welcome to SHOXA' :
                                mode === 'signin' ? 'Welcome Back!' : 'Create Account'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {mode === 'input'
                                ? 'Follow your favorite shops and get personalized updates'
                                : mode === 'signin'
                                    ? 'Sign in to access your account'
                                    : 'Join SHOXA to follow shops and discover local businesses'}
                        </Text>
                    </View>

                    <Animated.View style={[styles.formArea, { opacity: fadeAnim }]}>
                        {/* Email Input - Always shown */}
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>Email</Text>
                            <View style={[styles.inputContainer, mode !== 'input' && styles.inputDisabled]}>
                                <Ionicons name="mail-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    placeholderTextColor={COLORS.gray}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        setError('');
                                    }}
                                    editable={mode === 'input'}
                                />
                                {mode !== 'input' && (
                                    <TouchableOpacity onPress={() => setMode('input')} style={styles.editBtn}>
                                        <Ionicons name="pencil" size={16} color={COLORS.primary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Name Input - Only for signup */}
                        {mode === 'signup' && (
                            <View style={styles.inputSection}>
                                <Text style={styles.inputLabel}>Full Name</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="person-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your name"
                                        placeholderTextColor={COLORS.gray}
                                        value={displayName}
                                        onChangeText={(text) => {
                                            setDisplayName(text);
                                            setError('');
                                        }}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Password Input - For signin/signup */}
                        {mode !== 'input' && (
                            <View style={styles.inputSection}>
                                <Text style={styles.inputLabel}>Password</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={mode === 'signup' ? 'Create password (6+ chars)' : 'Enter password'}
                                        placeholderTextColor={COLORS.gray}
                                        secureTextEntry
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            setError('');
                                        }}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Error Message */}
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={16} color={COLORS.red} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Continue/Submit Button */}
                        <TouchableOpacity
                            style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
                            onPress={mode === 'input' ? handleContinue : mode === 'signin' ? handleSignIn : handleSignUp}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.primaryBtnText}>
                                    {mode === 'input' ? 'Continue' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Toggle signin/signup */}
                        {mode !== 'input' && (
                            <TouchableOpacity style={styles.toggleBtn} onPress={toggleMode}>
                                <Text style={styles.toggleText}>
                                    {mode === 'signin'
                                        ? "Don't have an account? "
                                        : "Already have an account? "}
                                    <Text style={styles.toggleLink}>
                                        {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                                    </Text>
                                </Text>
                            </TouchableOpacity>
                        )}
                    </Animated.View>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or continue with</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Social Login Buttons */}
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
                                <Ionicons name="logo-apple" size={22} color={COLORS.white} />
                                <Text style={[styles.socialBtnText, styles.appleBtnText]}>Apple</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Guest Button */}
                    <TouchableOpacity style={styles.guestBtn} onPress={() => router.back()}>
                        <Text style={styles.guestBtnText}>Continue as Guest</Text>
                    </TouchableOpacity>

                    {/* Terms */}
                    <Text style={styles.termsText}>
                        By continuing, you agree to our{' '}
                        <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                        <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
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
        marginTop: 20,
        marginBottom: 30,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 30,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    logo: {
        width: 70,
        height: 70,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.gray,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    formArea: {
        marginBottom: 20,
    },
    inputSection: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: COLORS.lightGray,
        paddingHorizontal: 14,
        height: 54,
    },
    inputDisabled: {
        backgroundColor: '#F9F9F9',
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: COLORS.dark,
    },
    editBtn: {
        padding: 6,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 16,
    },
    errorText: {
        color: COLORS.red,
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    primaryBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryBtnDisabled: {
        opacity: 0.7,
    },
    primaryBtnText: {
        color: COLORS.white,
        fontSize: 17,
        fontWeight: 'bold',
    },
    toggleBtn: {
        marginTop: 16,
        alignItems: 'center',
    },
    toggleText: {
        fontSize: 14,
        color: COLORS.gray,
    },
    toggleLink: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.lightGray,
    },
    dividerText: {
        paddingHorizontal: 15,
        color: COLORS.gray,
        fontSize: 13,
    },
    socialButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 20,
    },
    socialBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: COLORS.lightGray,
        backgroundColor: COLORS.white,
        gap: 8,
    },
    socialIcon: {
        width: 20,
        height: 20,
    },
    socialBtnText: {
        fontSize: 15,
        fontWeight: '600',
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
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        marginBottom: 20,
    },
    guestBtnText: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    termsText: {
        fontSize: 12,
        color: COLORS.gray,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 18,
        paddingHorizontal: 10,
    },
    termsLink: {
        color: COLORS.primary,
        fontWeight: '500',
    },
});
