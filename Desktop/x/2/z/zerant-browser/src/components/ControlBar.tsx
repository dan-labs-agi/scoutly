// Zerant - Control Bar Component
// Dia/Apple Style - Floating Glass Island

import React, { useState, useRef } from 'react';
import {
    View,
    Text as RNText,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Animated,
    Keyboard,
    Platform,
    Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, AppMode } from '../types';
import {
    Search,
    Sparkles,
    ArrowRight,
    X,
    Mic,
    Shield,
    RotateCw
} from 'lucide-react-native';

interface ControlBarProps {
    mode: 'browser' | 'agent';
    value: string;
    onChangeText: (text: string) => void;
    onSubmit: () => void;
    loading?: boolean;
    onModeToggle?: () => void; // New prop for mode switching
}

const { width } = Dimensions.get('window');

export default function ControlBar({
    mode,
    value,
    onChangeText,
    onSubmit,
    loading = false,
    onModeToggle,
}: ControlBarProps) {
    const [isFocused, setIsFocused] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const animateFocus = (focused: boolean) => {
        setIsFocused(focused);
        // Simple scale animation only - no width animation to avoid native driver issues
        Animated.spring(scaleAnim, {
            toValue: focused ? 1.02 : 1,
            friction: 8,
            useNativeDriver: true,
        }).start();
    };

    const handleSubmit = () => {
        onSubmit();
        Keyboard.dismiss();
    };

    return (
        <View style={styles.wrapper}>
            <Animated.View style={[
                styles.containerAnimated,
                { transform: [{ scale: scaleAnim }] }
            ]}>
                <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
                    <View style={[
                        styles.innerContainer,
                        mode === 'agent' && styles.innerContainerAgent
                    ]}>
                        {/* Mode Toggle Button (AA/AI) */}
                        <TouchableOpacity
                            style={[
                                styles.iconButtonLeft,
                                mode === 'agent' && styles.iconButtonLeftAgent
                            ]}
                            onPress={onModeToggle}
                        >
                            <RNText style={[
                                styles.aaText,
                                mode === 'agent' && styles.aaTextAgent
                            ]}>
                                {mode === 'agent' ? 'AI' : 'AA'}
                            </RNText>
                        </TouchableOpacity>

                        {/* Center: Lock + URL */}
                        <View style={styles.urlContainer}>
                            {mode === 'agent' ? (
                                <Sparkles size={12} color={COLORS.thinking} style={styles.lockIcon} />
                            ) : (
                                <Shield size={12} color={COLORS.textSecondary} style={styles.lockIcon} />
                            )}
                            <TextInput
                                style={styles.input}
                                value={value}
                                onChangeText={onChangeText}
                                placeholder={mode === 'agent' ? "Ask Zerant" : "Search or enter website name"}
                                placeholderTextColor={COLORS.textMuted}
                                returnKeyType={mode === 'agent' ? "send" : "go"}
                                onSubmitEditing={handleSubmit}
                                onFocus={() => animateFocus(true)}
                                onBlur={() => animateFocus(false)}
                                autoCapitalize="none"
                                autoCorrect={false}
                                selectionColor={COLORS.primary}
                                keyboardAppearance="dark"
                                selectTextOnFocus
                            />
                        </View>

                        {/* Trailing: Reload / Stop */}
                        <View style={styles.actions}>
                            {loading ? (
                                <TouchableOpacity style={styles.iconButtonRight}>
                                    <X size={16} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={onSubmit} // Reload logic usually here
                                    style={styles.iconButtonRight}
                                >
                                    <RotateCw size={16} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </BlurView>
            </Animated.View>
        </View>
    );
}

// ... imports

// ... existing code ...

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 90 : 76, // Above BottomToolbar
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 90,
        paddingHorizontal: 16,
    },
    containerAnimated: {
        width: '100%',
        borderRadius: 16, // Safari pill shape
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    blurContainer: {
        width: '100%',
        backgroundColor: 'rgba(50, 50, 50, 0.5)', // Darker Safari tint
    },
    innerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        paddingHorizontal: 4,
    },
    innerContainerAgent: {
        backgroundColor: 'rgba(191, 90, 242, 0.15)',
    },
    iconButtonLeft: {
        paddingLeft: 16,
        paddingRight: 8,
        justifyContent: 'center',
        height: '100%',
    },
    iconButtonLeftAgent: {
        backgroundColor: 'rgba(191, 90, 242, 0.3)', // Purple background in agent mode
        borderRadius: 6,
        marginLeft: 4,
        paddingHorizontal: 10,
    },
    aaText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    aaTextAgent: {
        color: '#bf5af2', // Purple text in agent mode
    },
    urlContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    lockIcon: {
        marginRight: 4,
    },
    input: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '400',
        textAlign: 'center',
        paddingVertical: 0,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 12,
    },
    iconButtonRight: {
        padding: 4,
    },
});
