// Zerant - Tab Switcher
// Dia/Apple Style - Vertical Cards with Blur

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Dimensions,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, Tab } from '../types';
import { X, Plus, Globe, Sparkles } from 'lucide-react-native';

interface TabSwitcherProps {
    tabs: Tab[];
    activeTabId: string;
    onSwitchTab: (id: string) => void;
    onCloseTab: (id: string) => void;
    onNewTab: () => void;
    visible: boolean;
    onClose: () => void;
}

const { width } = Dimensions.get('window');

export default function TabSwitcher({
    tabs,
    activeTabId,
    onSwitchTab,
    onCloseTab,
    onNewTab,
    visible,
    onClose,
}: TabSwitcherProps) {
    if (!visible) return null;

    return (
        <BlurView intensity={95} tint="dark" style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            <ScrollView contentContainerStyle={styles.list}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[
                            styles.tabCard,
                            tab.id === activeTabId && styles.activeTabCard
                        ]}
                        onPress={() => {
                            onSwitchTab(tab.id);
                            onClose();
                        }}
                        activeOpacity={0.9}
                    >
                        {/* Tab Header */}
                        <View style={styles.tabHeader}>
                            <View style={styles.favicon}>
                                {tab.mode === 'agent' ? (
                                    <Sparkles size={14} color="#fff" />
                                ) : (
                                    <Globe size={14} color="#fff" />
                                )}
                            </View>
                            <Text style={styles.tabTitle} numberOfLines={1}>
                                {tab.title || 'New Tab'}
                            </Text>
                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onCloseTab(tab.id);
                                }}
                                style={styles.closeTabBtn}
                            >
                                <X size={16} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Tab Content Placeholder */}
                        <View style={styles.tabPreview}>
                            <Text style={styles.urlText} numberOfLines={1}>
                                {tab.url}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Bottom Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity onPress={onNewTab} style={styles.newTabButton}>
                    <Plus size={24} color={COLORS.textPrimary} />
                    <Text style={styles.newTabText}>New Tab</Text>
                </TouchableOpacity>
            </View>
        </BlurView>
    );
}

// ... styles
const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 200,
        backgroundColor: '#000000', // Safari uses black background for switcher
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
    },
    closeButton: {
        padding: 8,
    },
    doneText: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.primary,
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 100,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between', // Grid layout
    },
    tabCard: {
        width: (width - 48) / 2, // 2 columns with spacing
        height: 220, // Taller aspect ratio
        backgroundColor: '#1c1c1e',
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 0, // No border usually
    },
    activeTabCard: {
        borderWidth: 2,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    tabHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: '#2c2c2e',
        gap: 6,
        height: 36,
    },
    favicon: {
        width: 18,
        height: 18,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabTitle: {
        flex: 1,
        fontSize: 11,
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    closeTabBtn: {
        padding: 2,
        backgroundColor: '#3a3a3c',
        borderRadius: 10,
    },
    tabPreview: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff', // White page background simulation
    },
    urlText: {
        fontSize: 10,
        color: '#000',
        opacity: 0.5,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: Platform.OS === 'ios' ? 80 : 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
        backgroundColor: '#1c1c1e', // Toolbar color
        borderTopWidth: 0.5,
        borderTopColor: '#38383a',
    },
    newTabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    newTabText: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.primary,
    },
});
