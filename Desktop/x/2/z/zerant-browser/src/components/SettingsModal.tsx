// Zerant - Settings Modal
// Shadcn/Base UI Style - With API Key Management

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Switch,
    TextInput,
    ScrollView,
    Alert,
} from 'react-native';
import { COLORS } from '../types';
import { X, Settings, Shield, Smartphone, Cpu, Key, Eye, EyeOff, Check, Zap, Brain, Target } from 'lucide-react-native';
import { loadAPIKeys, saveAPIKey, APIKeys } from '../utils/apiKeys';

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
    onKeysUpdated?: () => void; // Callback when keys are saved
}

export default function SettingsModal({ visible, onClose, onKeysUpdated }: SettingsModalProps) {
    const [apiKeys, setApiKeys] = useState<APIKeys>({
        gemini: '',
        lux: '',
    });
    const [showKeys, setShowKeys] = useState({
        gemini: false,
        lux: false,
    });
    const [hasChanges, setHasChanges] = useState(false);

    // Load keys when modal opens
    useEffect(() => {
        if (visible) {
            loadAPIKeys().then(keys => {
                setApiKeys(keys);
                setHasChanges(false);
            });
        }
    }, [visible]);

    const handleKeyChange = (provider: keyof APIKeys, value: string) => {
        setApiKeys(prev => ({ ...prev, [provider]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            await Promise.all([
                saveAPIKey('gemini', apiKeys.gemini),
                saveAPIKey('lux', apiKeys.lux),
            ]);

            Alert.alert('Success', 'API keys saved successfully!');
            setHasChanges(false);

            onKeysUpdated?.();
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to save API keys');
        }
    };

    const toggleShowKey = (provider: keyof typeof showKeys) => {
        setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
    };

    // Type for API key providers
    type ApiKeyProvider = 'gemini' | 'lux';

    const ApiKeyInput = ({
        label,
        provider,
        placeholder
    }: {
        label: string;
        provider: ApiKeyProvider;
        placeholder: string;
    }) => (
        <View style={styles.keyInputContainer}>
            <View style={styles.keyInputHeader}>
                <Key size={16} color={COLORS.primary} />
                <Text style={styles.keyLabel}>{label}</Text>
            </View>
            <View style={styles.keyInputWrapper}>
                <TextInput
                    style={styles.keyInput}
                    value={apiKeys[provider]}
                    onChangeText={(value) => handleKeyChange(provider, value)}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showKeys[provider]}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <TouchableOpacity
                    onPress={() => toggleShowKey(provider)}
                    style={styles.eyeButton}
                >
                    {showKeys[provider] ? (
                        <EyeOff size={18} color={COLORS.textSecondary} />
                    ) : (
                        <Eye size={18} color={COLORS.textSecondary} />
                    )}
                </TouchableOpacity>
            </View>
            {apiKeys[provider] && (
                <Text style={styles.keyStatus}>✓ Key configured</Text>
            )}
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.container} onStartShouldSetResponder={() => true}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Settings size={20} color={COLORS.textPrimary} />
                            <Text style={styles.title}>Settings</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* API Keys Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>AI Provider Keys</Text>
                            <View style={styles.card}>
                                <ApiKeyInput
                                    label="Gemini (Google)"
                                    provider="gemini"
                                    placeholder="AIzaSy..."
                                />
                                <View style={styles.divider} />
                                <ApiKeyInput
                                    label="Lux AI"
                                    provider="lux"
                                    placeholder="sk-..."
                                />
                            </View>
                            <Text style={styles.hint}>
                                💡 Keys are stored locally on your device.
                            </Text>
                        </View>

                        {/* Intelligence Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Intelligence</Text>
                            <View style={styles.card}>
                                <View style={styles.row}>
                                    <View style={styles.rowLeft}>
                                        <Cpu size={18} color={COLORS.primary} />
                                        <View>
                                            <Text style={styles.label}>Auto-Select Provider</Text>
                                            <Text style={styles.rowHint}>Use first available key</Text>
                                        </View>
                                    </View>
                                    <Switch value={true} disabled trackColor={{ true: COLORS.primary }} />
                                </View>
                            </View>
                        </View>

                        {/* Browser Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Browser</Text>
                            <View style={styles.card}>
                                <View style={styles.row}>
                                    <View style={styles.rowLeft}>
                                        <Shield size={18} color={COLORS.success} />
                                        <Text style={styles.label}>Block Ads</Text>
                                    </View>
                                    <Switch value={true} trackColor={{ true: COLORS.primary }} />
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.row}>
                                    <View style={styles.rowLeft}>
                                        <Smartphone size={18} color={COLORS.textSecondary} />
                                        <Text style={styles.label}>Desktop Mode</Text>
                                    </View>
                                    <Switch value={false} trackColor={{ true: COLORS.primary }} />
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer with Save Button */}
                    <View style={styles.footer}>
                        {hasChanges && (
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSave}
                                activeOpacity={0.8}
                            >
                                <Check size={18} color={COLORS.background} />
                                <Text style={styles.saveButtonText}>Save API Keys</Text>
                            </TouchableOpacity>
                        )}
                        <Text style={styles.version}>Zerant Beta v1.0.0</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '90%',
        backgroundColor: COLORS.background,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        maxHeight: 500,
    },
    section: {
        padding: 20,
        gap: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginLeft: 4,
    },
    card: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    keyInputContainer: {
        padding: 12,
        gap: 8,
    },
    keyInputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    keyLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    keyInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 12,
    },
    keyInput: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: 13,
        fontFamily: 'monospace',
        paddingVertical: 10,
    },
    eyeButton: {
        padding: 4,
    },
    keyStatus: {
        fontSize: 11,
        color: COLORS.success,
        marginLeft: 4,
    },
    hint: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 4,
        marginLeft: 4,
        lineHeight: 18,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    label: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    rowHint: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginLeft: 12,
    },
    footer: {
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        width: '100%',
        justifyContent: 'center',
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.background,
    },
    version: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    // Lux Mode Selector Styles
    luxModeContainer: {
        padding: 12,
        gap: 12,
    },
    luxModeLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    luxModeButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    luxModeButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 4,
    },
    luxModeButtonActive: {
        backgroundColor: COLORS.thinking,
        borderColor: COLORS.thinking,
    },
    luxModeButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    luxModeButtonTextActive: {
        color: COLORS.background,
    },
    luxModeHint: {
        fontSize: 10,
        color: COLORS.textMuted,
    },
});
