// Zerant - AI Mobile Browser Agent
// Main Application Entry Point
// Multi-Tab Support + Perplexity UI

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Components
import Header from './src/components/Header';
import ControlBar from './src/components/ControlBar';
import BrowserView, { BrowserViewRef } from './src/components/BrowserView';
import ActionLog from './src/components/ActionLog';
import StatusBadge from './src/components/StatusBadge';
import TabSwitcher from './src/components/TabSwitcher';
import SettingsModal from './src/components/SettingsModal';
import BottomToolbar from './src/components/BottomToolbar';

// Types
import {
  AppMode,
  StatusType,
  ActionLogEntry,
  PageContext,
  WebViewMessage,
  BrowserAction,
  COLORS,
  AgentProvider,
  Tab,
} from './src/types';

// Agents
import { analyzeWithClaude } from './src/agents/ClaudeAgent';
import { analyzeWithGemini } from './src/agents/GeminiAgent';
import { analyzeWithOpenAI } from './src/agents/OpenAIAgent';
import { analyzeWithOpenRouter } from './src/agents/OpenRouterAgent';
import { analyzeWithLux, analyzeWithLuxFallback } from './src/agents/LuxAgent';

// API Keys Utility
import { loadAPIKeys, APIKeys } from './src/utils/apiKeys';

// Constants
import { DEFAULT_URL, ACTION_DELAY, DEFAULT_SEARCH_ENGINE } from './src/utils/constants';

export default function App() {
  // =========================================
  // State
  // =========================================

  // API Keys (loaded from AsyncStorage)
  const [apiKeys, setApiKeys] = useState<APIKeys>({
    anthropic: '',
    gemini: '',
    openai: '',
    openrouter: '',
    lux: '',
    luxMode: 'actor',
  });

  // Tab Management
  const [tabs, setTabs] = useState<Tab[]>([{
    id: 'tab-1',
    url: DEFAULT_URL,
    title: 'New Tab',
    mode: 'browser',
    loading: false,
    actions: [],
    pageContext: null,
    query: '',
    statusType: 'idle',
    statusMessage: '',
  }]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [showTabSwitcher, setShowTabSwitcher] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Load API keys on mount
  useEffect(() => {
    loadAPIKeys().then(setApiKeys);
  }, []);

  // Reload keys when settings are updated
  const handleKeysUpdated = useCallback(() => {
    loadAPIKeys().then(setApiKeys);
  }, []);

  // Derived State (Active Tab)
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Refs
  const browserRef = useRef<BrowserViewRef>(null);
  const actionIdRef = useRef(0);

  // =========================================
  // Tab Helpers
  // =========================================

  const updateActiveTab = useCallback((updates: Partial<Tab>) => {
    setTabs(prev => prev.map(tab =>
      tab.id === activeTabId ? { ...tab, ...updates } : tab
    ));
  }, [activeTabId]);

  const createNewTab = useCallback(() => {
    const newTabId = `tab-${Date.now()}`;
    const newTab: Tab = {
      id: newTabId,
      url: DEFAULT_URL,
      title: 'New Tab',
      mode: 'browser',
      loading: false,
      actions: [],
      pageContext: null,
      query: '',
      statusType: 'idle',
      statusMessage: '',
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);
    setShowTabSwitcher(false);
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== id);
      if (newTabs.length === 0) {
        // Always keep one tab open
        return [{
          id: `tab-${Date.now()}`,
          url: DEFAULT_URL,
          title: 'New Tab',
          mode: 'browser',
          loading: false,
          actions: [],
          pageContext: null,
          query: '',
          statusType: 'idle',
          statusMessage: '',
        }];
      }
      return newTabs;
    });

    if (activeTabId === id) {
      // Switch to last available tab if active one closed
      setTabs(current => {
        setActiveTabId(current[current.length - 1].id);
        return current;
      });
    }
  }, [activeTabId]);

  // =========================================
  // Action Helpers
  // =========================================

  const addAction = useCallback((message: string, type: ActionLogEntry['type'] = 'info') => {
    const entry: ActionLogEntry = {
      id: `action-${++actionIdRef.current}`,
      message,
      type,
      timestamp: new Date(),
    };

    setTabs(prev => prev.map(tab =>
      tab.id === activeTabId
        ? { ...tab, actions: [...tab.actions, entry] }
        : tab
    ));
  }, [activeTabId]);

  const clearActions = useCallback(() => {
    updateActiveTab({ actions: [] });
  }, [updateActiveTab]);

  // =========================================
  // Browser Handlers
  // =========================================

  const handleUrlChange = useCallback((url: string) => {
    updateActiveTab({ url });
  }, [updateActiveTab]);

  const handleBrowserSearch = useCallback(async () => {
    const query = activeTab.query;
    if (!query.trim()) {
      Alert.alert('Empty Query', 'Please enter a search term or URL');
      return;
    }

    updateActiveTab({ loading: true, statusType: 'loading', statusMessage: 'Navigating...' });

    try {
      let targetUrl: string;
      if (query.includes('.') && !query.includes(' ')) {
        targetUrl = query.startsWith('http') ? query : `https://${query}`;
      } else {
        targetUrl = `${DEFAULT_SEARCH_ENGINE}${encodeURIComponent(query)}`;
      }

      updateActiveTab({ url: targetUrl });
      addAction(`🔍 Searching: "${query}"`, 'info');
      updateActiveTab({ statusType: 'success', statusMessage: 'Navigation complete' });

      setTimeout(() => {
        updateActiveTab({ statusType: 'idle', statusMessage: '' });
      }, 2000);

    } catch (error) {
      updateActiveTab({ statusType: 'error', statusMessage: 'Failed to navigate' });
    } finally {
      updateActiveTab({ loading: false, query: '' });
    }
  }, [activeTab.query, updateActiveTab, addAction]);

  // =========================================
  // Agent Handlers
  // =========================================

  const handleAgentTask = useCallback(async () => {
    const query = activeTab.query;
    if (!query.trim()) {
      Alert.alert('No Task', 'Please describe what you want me to do');
      return;
    }

    // Check for API keys
    if (!apiKeys.anthropic && !apiKeys.gemini && !apiKeys.openai && !apiKeys.openrouter && !apiKeys.lux) {
      Alert.alert(
        'API Keys Required',
        'Please add at least one AI provider API key in Settings to use Agent mode.'
      );
      return;
    }

    updateActiveTab({
      loading: true,
      actions: [],
      statusType: 'thinking',
      statusMessage: 'Agent analyzing...'
    });

    addAction('🤖 Starting agent task...', 'thinking');

    try {
      // Get context
      browserRef.current?.getPageContext();
      await new Promise(resolve => setTimeout(resolve, 1500));

      const context = activeTab.pageContext || {
        url: activeTab.url,
        title: 'Current Page',
        text: '',
        html: '',
        timestamp: new Date().toISOString(),
      };

      addAction(`📄 Analyzing: ${context.title}`, 'info');
      updateActiveTab({ statusMessage: 'Generating actions...' });

      // Select Provider - Lux first (best computer-use), then Gemini as fallback
      let response;
      if (apiKeys.lux) {
        addAction(`⚡ Using Lux AI (${apiKeys.luxMode} mode)`, 'info');
        response = await analyzeWithLux(query, context, apiKeys.lux, apiKeys.luxMode);
      } else if (apiKeys.gemini) {
        addAction('✨ Using Gemini 2.0 Flash', 'info');
        response = await analyzeWithGemini(query, context, apiKeys.gemini);
      } else if (apiKeys.openrouter) {
        addAction('🌐 Using OpenRouter', 'info');
        response = await analyzeWithOpenRouter(query, context, apiKeys.openrouter);
      } else if (apiKeys.openai) {
        addAction('🤖 Using OpenAI GPT-4o', 'info');
        response = await analyzeWithOpenAI(query, context, apiKeys.openai);
      } else if (apiKeys.anthropic) {
        addAction('🧠 Using Claude 3.5 Sonnet', 'info');
        response = await analyzeWithClaude(query, context, apiKeys.anthropic);
      } else {
        throw new Error('No valid API key found');
      }

      if (response.actions.length === 0) {
        throw new Error('No actions generated');
      }

      addAction(`✨ Generated ${response.actions.length} action(s)`, 'success');
      updateActiveTab({ statusType: 'executing', statusMessage: 'Executing actions...' });

      for (const action of response.actions) {
        addAction(`▶ ${action.reason}`, 'info');
        const script = `(function(){window.zerantAgent.executeAction(${JSON.stringify(action)});true;})();`;
        browserRef.current?.injectJavaScript(script);
        await new Promise(resolve => setTimeout(resolve, ACTION_DELAY));
      }

      updateActiveTab({ statusType: 'success', statusMessage: 'Task complete!' });
      addAction('✅ All actions executed', 'success');

    } catch (error) {
      console.error(error);
      addAction(`❌ Error: ${String(error).substring(0, 50)}`, 'error');
      updateActiveTab({ statusType: 'error', statusMessage: 'Task failed' });
    } finally {
      updateActiveTab({ loading: false, query: '' });
    }
  }, [activeTab, updateActiveTab, addAction]);

  // =========================================
  // WebView Message Handler
  // =========================================

  const handleWebViewMessage = useCallback((message: WebViewMessage) => {
    switch (message.type) {
      case 'context':
        updateActiveTab({ pageContext: message.data as PageContext });
        break;
      case 'action_executed':
        addAction(`✓ ${message.action?.reason || 'Action completed'}`, 'success');
        break;
      case 'action_error':
        addAction(`✗ ${message.action?.reason}: ${message.error}`, 'error');
        break;
      case 'extraction':
        const count = Array.isArray(message.data) ? message.data.length : 1;
        addAction(`📋 Extracted ${count} item(s)`, 'success');
        break;
    }
  }, [updateActiveTab, addAction]);

  // Toggle Mode
  const toggleMode = useCallback(() => {
    updateActiveTab({
      mode: activeTab.mode === 'browser' ? 'agent' : 'browser'
    });
  }, [activeTab.mode, updateActiveTab]);

  // Handle Control Submit
  const handleControlSubmit = useCallback(() => {
    if (activeTab.mode === 'agent') {
      handleAgentTask();
    } else {
      handleBrowserSearch();
    }
  }, [activeTab.mode, handleAgentTask, handleBrowserSearch]);

  // Browser Navigation Handlers
  const handleBack = useCallback(() => {
    browserRef.current?.goBack();
  }, []);

  const handleForward = useCallback(() => {
    browserRef.current?.goForward();
  }, []);

  // User Agent
  const userAgent = "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36";

  // =========================================
  // Render
  // =========================================

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />

        {/* Browser Layer - Full Screen */}
        <View style={styles.browserLayer}>
          {tabs.map(tab => (
            <View
              key={tab.id}
              style={[
                StyleSheet.absoluteFill,
                { display: tab.id === activeTabId ? 'flex' : 'none' }
              ]}
            >
              <BrowserView
                ref={tab.id === activeTabId ? browserRef : undefined}
                url={tab.url}
                active={tab.id === activeTabId}
                onUrlChange={(url) => updateActiveTab({ url })}
                onTitleChange={(title) => updateActiveTab({ title })}
                onLoadStart={() => updateActiveTab({ loading: true })}
                onLoadEnd={() => updateActiveTab({ loading: false })}
                onPageContext={(context) => updateActiveTab({ pageContext: context })}
                userAgent={userAgent}
                onMessage={(msg) => {
                  if (tab.id === activeTabId) handleWebViewMessage(msg);
                }}
              />
            </View>
          ))}
        </View>

        {/* UI Layer - Floating Elements */}
        <View style={styles.uiLayer} pointerEvents="box-none">
          {/* Top Area - Status & Logs Only (No Header) */}
          <View style={styles.topArea} pointerEvents="box-none">
            <StatusBadge
              type={activeTab.statusType}
              message={activeTab.statusMessage}
              visible={activeTab.statusType !== 'idle'}
            />
            <ActionLog actions={activeTab.actions} />
          </View>

          {/* Bottom Area - Address Bar & Toolbar */}
          <View style={styles.bottomArea} pointerEvents="box-none">
            <ControlBar
              mode={activeTab.mode}
              value={activeTab.query}
              onChangeText={(text) => updateActiveTab({ query: text })}
              onSubmit={handleControlSubmit}
              loading={activeTab.loading || activeTab.statusType !== 'idle'}
              onModeToggle={toggleMode}
            />

            <BottomToolbar
              canGoBack={true} // TODO: Track actual history state
              canGoForward={true}
              onBack={handleBack}
              onForward={handleForward}
              onShare={() => Alert.alert('Share', 'Share functionality coming soon')}
              onBookmarks={() => setShowSettings(true)} // Using Bookmarks for Settings for now
              onTabs={() => setShowTabSwitcher(true)}
            />
          </View>
        </View>

        {/* Modals */}
        <TabSwitcher
          tabs={tabs}
          activeTabId={activeTabId}
          onSwitchTab={setActiveTabId}
          onCloseTab={closeTab}
          onNewTab={createNewTab}
          visible={showTabSwitcher}
          onClose={() => setShowTabSwitcher(false)}
        />

        <SettingsModal
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          onKeysUpdated={handleKeysUpdated}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure Black
  },
  browserLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    paddingBottom: 80, // Space for bottom bars
  },
  uiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    justifyContent: 'space-between',
  },
  topArea: {
    paddingTop: 60,
    alignItems: 'center',
  },
  bottomArea: {
    justifyContent: 'flex-end',
  },
});
