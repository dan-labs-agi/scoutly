// Zerant - Status Badge
// Dia/Apple Style - Glowing Pill

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, StatusType } from '../types';
import { Loader2, Sparkles, Play, CheckCircle2, AlertCircle } from 'lucide-react-native';

interface StatusBadgeProps {
    type: StatusType;
    message: string;
    visible: boolean;
}

export default function StatusBadge({ type, message, visible }: StatusBadgeProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    if (!visible && type === 'idle') return null;

    const getConfig = () => {
        switch (type) {
            case 'loading':
                return {
                    color: COLORS.textSecondary,
                    icon: <Loader2 size={14} color={COLORS.textSecondary} />
                };
            case 'thinking':
                return {
                    color: COLORS.thinking,
                    icon: <Sparkles size={14} color={COLORS.thinking} />
                };
            case 'executing':
                return {
                    color: COLORS.executing,
                    icon: <Play size={14} color={COLORS.executing} />
                };
            case 'success':
                return {
                    color: COLORS.success,
                    icon: <CheckCircle2 size={14} color={COLORS.success} />
                };
            case 'error':
                return {
                    color: COLORS.error,
                    icon: <AlertCircle size={14} color={COLORS.error} />
                };
            default:
                return {
                    color: COLORS.textSecondary,
                    icon: null
                };
        }
    };

    const { color, icon } = getConfig();

    return (
        <Animated.View style={[
            styles.wrapper,
            {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
            }
        ]}>
            <BlurView intensity={80} tint="dark" style={styles.container}>
                {icon}
                <Text style={[styles.text, { color }]}>{message}</Text>
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        top: 110, // Below Header
        alignSelf: 'center',
        zIndex: 80,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    text: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
});
