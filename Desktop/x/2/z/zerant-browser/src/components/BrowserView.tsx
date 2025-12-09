// Zerant Browser - BrowserView Component

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    ActivityIndicator,
    Text,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { COLORS, WebViewMessage, PageContext } from '../types';
import { INJECTED_JAVASCRIPT } from '../browser/InjectedAgent';
import { DEFAULT_URL } from '../utils/constants';

interface BrowserViewProps {
    url: string;
    active: boolean; // New prop
    onUrlChange: (url: string) => void;
    onMessage: (message: WebViewMessage) => void;
    onLoadStart?: () => void;
    onLoadEnd?: () => void;
    userAgent?: string; // New prop
    onTitleChange?: (title: string) => void; // New prop
    onPageContext?: (context: PageContext) => void; // New prop
}

export interface BrowserViewRef {
    injectJavaScript: (script: string) => void;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    getPageContext: () => void;
}

const BrowserView = forwardRef<BrowserViewRef, BrowserViewProps>(
    ({ url, active, onUrlChange, onMessage, onLoadStart, onLoadEnd, userAgent, onTitleChange, onPageContext }, ref) => {
        const webViewRef = useRef<WebView>(null);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);

        useImperativeHandle(ref, () => ({
            injectJavaScript: (script: string) => {
                webViewRef.current?.injectJavaScript(script);
            },
            goBack: () => {
                webViewRef.current?.goBack();
            },
            goForward: () => {
                webViewRef.current?.goForward();
            },
            reload: () => {
                webViewRef.current?.reload();
            },
            getPageContext: () => {
                webViewRef.current?.injectJavaScript(`
          (function() {
            var context = window.zerantAgent.getContext();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'context',
              data: context
            }));
            true;
          })();
        `);
            },
        }));

        const handleMessage = (event: WebViewMessageEvent) => {
            try {
                const data = JSON.parse(event.nativeEvent.data) as WebViewMessage;
                onMessage(data);
            } catch (err) {
                console.error('[BrowserView] Failed to parse message:', err);
            }
        };

        const handleNavigationStateChange = (navState: any) => {
            if (navState.url && navState.url !== url) {
                onUrlChange(navState.url);
            }
        };

        const handleLoadStart = () => {
            setLoading(true);
            setError(null);
            onLoadStart?.();
        };

        const handleLoadEnd = () => {
            setLoading(false);
            onLoadEnd?.();
        };

        const handleError = (syntheticEvent: any) => {
            const { nativeEvent } = syntheticEvent;
            setError(nativeEvent.description || 'Failed to load page');
            setLoading(false);
        };

        return (
            <View style={styles.container}>
                {/* Loading Indicator */}
                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                )}

                {/* Error State */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorIcon}>⚠️</Text>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {/* WebView */}
                <WebView
                    ref={webViewRef}
                    source={{ uri: url }}
                    style={styles.webview}
                    injectedJavaScript={INJECTED_JAVASCRIPT}
                    onMessage={handleMessage}
                    onNavigationStateChange={handleNavigationStateChange}
                    onLoadStart={handleLoadStart}
                    onLoadEnd={handleLoadEnd}
                    onError={handleError}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={false}
                    scalesPageToFit={true}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                    mixedContentMode="always"
                    userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
                />
            </View>
        );
    }
);

BrowserView.displayName = 'BrowserView';

export default BrowserView;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    webview: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 10,
    },
    loadingText: {
        marginTop: 12,
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    errorContainer: {
        position: 'absolute',
        top: '40%',
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 5,
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 14,
        textAlign: 'center',
    },
});
