// Zerant - Header Component
// Dia/Apple Style - Minimal & Transparent

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, AppMode } from '../types';
import {
    MoreHorizontal,
    Layers,
    Globe,
    Sparkles
} from 'lucide-react-native';

interface HeaderProps {
    mode: AppMode;
    onModeToggle: () => void;
    onTabsPress: () => void;
    onSettingsPress: () => void;
    tabCount: number;
}

export default function Header({
    mode,
    onModeToggle,
    onTabsPress,
    onSettingsPress,
    tabCount
}: HeaderProps) {
    return (
        <View style={styles.wrapper}>
            <BlurView intensity={50} tint="dark" style={styles.container}>
                {/* Left: Mode Switcher (Minimal) */}
                <TouchableOpacity
                    onPress={onModeToggle}
                    activeOpacity={0.7}
                    style={styles.modeButton}
                >
                    {mode === 'agent' ? (
                        <View style={[styles.modePill, styles.modePillAgent]}>
                            <Sparkles size={14} color="#fff" />
                            <Text style={styles.modeText}>Agent</Text>
                        </View>
                    ) : (
                        <View style={styles.modePill}>
                            <Globe size={14} color="#fff" />
                            <Text style={styles.modeText}>Web</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Right: Controls */}
                <View style={styles.rightControls}>
                    <TouchableOpacity
                        onPress={onTabsPress}
                        style={styles.iconButton}
                        activeOpacity={0.7}
                    >
                        <View style={styles.tabIconWrapper}>
                            <Layers size={22} color={COLORS.textPrimary} strokeWidth={1.5} />
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{tabCount}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onSettingsPress}
                        style={styles.iconButton}
                        activeOpacity={0.7}
                    >
                        <MoreHorizontal size={22} color={COLORS.textPrimary} strokeWidth={1.5} />
                    </TouchableOpacity>
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        overflow: 'hidden', // Clip blur
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end', // Align to bottom of status bar area
        paddingHorizontal: 20,
        paddingBottom: 12,
        height: Platform.OS === 'ios' ? 100 : 80, // Taller for status bar
    },
    modeButton: {
        marginBottom: 2,
    },
    modePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    modePillAgent: {
        backgroundColor: 'rgba(191, 90, 242, 0.2)', // Purple tint
        borderWidth: 1,
        borderColor: 'rgba(191, 90, 242, 0.3)',
    },
    modeText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    rightControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabIconWrapper: {
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        bottom: -2,
        right: -4,
        backgroundColor: COLORS.textPrimary,
        width: 14,
        height: 14,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#000',
    },
});
