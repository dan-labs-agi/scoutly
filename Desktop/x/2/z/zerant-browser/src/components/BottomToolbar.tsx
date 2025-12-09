// Zerant - Bottom Toolbar
// Safari Style - Navigation Controls

import React from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '../types';
import {
    ChevronLeft,
    ChevronRight,
    Share,
    Book,
    Copy // Using Copy icon to represent Tabs (two squares)
} from 'lucide-react-native';

interface BottomToolbarProps {
    canGoBack: boolean;
    canGoForward: boolean;
    onBack: () => void;
    onForward: () => void;
    onShare: () => void;
    onBookmarks: () => void;
    onTabs: () => void;
}

export default function BottomToolbar({
    canGoBack,
    canGoForward,
    onBack,
    onForward,
    onShare,
    onBookmarks,
    onTabs,
}: BottomToolbarProps) {
    return (
        <View style={styles.wrapper}>
            <BlurView intensity={80} tint="dark" style={styles.container}>
                <TouchableOpacity
                    onPress={onBack}
                    disabled={!canGoBack}
                    style={styles.button}
                >
                    <ChevronLeft
                        size={26}
                        color={canGoBack ? COLORS.primary : '#3a3a3c'}
                        strokeWidth={2.5} // Thicker for chevron
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onForward}
                    disabled={!canGoForward}
                    style={styles.button}
                >
                    <ChevronRight
                        size={26}
                        color={canGoForward ? COLORS.primary : '#3a3a3c'}
                        strokeWidth={2.5}
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={onShare} style={styles.button}>
                    <Share size={22} color={COLORS.primary} strokeWidth={2} />
                </TouchableOpacity>

                <TouchableOpacity onPress={onBookmarks} style={styles.button}>
                    <Book size={22} color={COLORS.primary} strokeWidth={2} />
                </TouchableOpacity>

                <TouchableOpacity onPress={onTabs} style={styles.button}>
                    <Copy size={22} color={COLORS.primary} strokeWidth={2} />
                </TouchableOpacity>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Home indicator safe area
        backgroundColor: 'rgba(28, 28, 30, 0.8)', // Fallback
    },
    button: {
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
    },
});
