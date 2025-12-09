// Zerant - Action Log
// Dia/Apple Style - Minimal Floating Pill

import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, ActionLogEntry } from '../types';
import { CheckCircle2, XCircle, BrainCircuit, ArrowRight } from 'lucide-react-native';

interface ActionLogProps {
    actions: ActionLogEntry[];
    maxHeight?: number;
}

function ActionItem({ entry, index }: { entry: ActionLogEntry; index: number }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            delay: index * 50,
            useNativeDriver: true,
        }).start();
    }, []);

    const getIcon = () => {
        switch (entry.type) {
            case 'success': return <CheckCircle2 size={14} color={COLORS.success} />;
            case 'error': return <XCircle size={14} color={COLORS.error} />;
            case 'thinking': return <BrainCircuit size={14} color={COLORS.thinking} />;
            default: return <ArrowRight size={14} color={COLORS.textMuted} />;
        }
    };

    return (
        <Animated.View style={[styles.itemContainer, { opacity: fadeAnim }]}>
            <View style={styles.iconWrapper}>
                {getIcon()}
            </View>
            <Text style={styles.itemText} numberOfLines={2}>{entry.message}</Text>
        </Animated.View>
    );
}

export default function ActionLog({ actions, maxHeight = 150 }: ActionLogProps) {
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [actions.length]);

    if (actions.length === 0) return null;

    return (
        <View style={styles.wrapper}>
            <BlurView intensity={60} tint="dark" style={[styles.container, { maxHeight }]}>
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {actions.map((action, index) => (
                        <ActionItem key={action.id} entry={action} index={index} />
                    ))}
                </ScrollView>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 110, // Above ControlBar
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 90,
    },
    container: {
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    scrollView: {
        width: '100%',
    },
    scrollContent: {
        padding: 16,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
        gap: 10,
    },
    iconWrapper: {
        marginTop: 2,
    },
    itemText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 18,
        fontFamily: 'System', // Use system font
    },
});
