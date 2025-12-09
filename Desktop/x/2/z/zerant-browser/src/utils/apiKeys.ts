// Zerant - API Key Storage Utility
// Manages API keys with AsyncStorage fallback to .env

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    GEMINI_API_KEY as ENV_GEMINI,
} from '@env';

const STORAGE_KEYS = {
    GEMINI: '@zerant_gemini_key',
    LUX: '@zerant_lux_key',
};

export interface APIKeys {
    gemini: string;
    lux: string;
}

// Load API keys from AsyncStorage, fallback to .env
export async function loadAPIKeys(): Promise<APIKeys> {
    try {
        const [gemini, lux] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.GEMINI),
            AsyncStorage.getItem(STORAGE_KEYS.LUX),
        ]);

        return {
            gemini: gemini || ENV_GEMINI || '',
            lux: lux || '',
        };
    } catch (error) {
        console.error('Failed to load API keys from storage:', error);
        return {
            gemini: ENV_GEMINI || '',
            lux: '',
        };
    }
}

// Save a single API key
export async function saveAPIKey(
    provider: 'gemini' | 'lux',
    key: string
): Promise<void> {
    const storageKey = STORAGE_KEYS[provider.toUpperCase() as keyof typeof STORAGE_KEYS];
    await AsyncStorage.setItem(storageKey, key);
}

// Clear a single API key
export async function clearAPIKey(
    provider: 'gemini' | 'lux'
): Promise<void> {
    const storageKey = STORAGE_KEYS[provider.toUpperCase() as keyof typeof STORAGE_KEYS];
    await AsyncStorage.removeItem(storageKey);
}

// Clear all API keys
export async function clearAllAPIKeys(): Promise<void> {
    await Promise.all(
        Object.values(STORAGE_KEYS).map(key => AsyncStorage.removeItem(key))
    );
}
