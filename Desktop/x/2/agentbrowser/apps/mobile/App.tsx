import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  TextInput, 
  Button, 
  StyleSheet, 
  Platform, 
  TouchableOpacity, 
  Text, 
  Alert, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  PermissionsAndroid
} from 'react-native';
import { WebView } from 'expo-webview';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Camera, CameraType } from 'expo-camera';
import VideoRecordingService from './src/services/VideoRecordingService';

// Configuration - could be in a separate config file
const APP_CONFIG = {
  WS_URL: process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:9223/stream',
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9223/task',
  DEFAULT_USER_AGENT: `Mozilla/5.0 (${Platform.OS}) AgentBrowser-Mobile/1.0`,
  MAX_PROMPT_LENGTH: 1000,
  MAX_RECORDING_DURATION: 15000, // 15 seconds
  DEFAULT_WEBVIEW_URL: 'https://www.google.com',
};

// Type definitions
type TaskStatus = 
  | 'idle' 
  | 'starting' 
  | 'running' 
  | 'completed' 
  | 'error' 
  | 'recording' 
  | 'recording-stopped';

interface WebSocketMessage {
  type: 'screenshot' | 'action' | 'status';
  data: any;
}

interface VideoRecordingOptions {
  duration?: number;
  resolution?: string;
  fps?: number;
  includeCamera?: boolean;
}

const App = () => {
  // Refs
  const webViewRef = useRef<any>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // State
  const [prompt, setPrompt] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [microphonePermission, setMicrophonePermission] = useState<boolean | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('Ready to execute tasks');
  const [error, setError] = useState<string | null>(null);

  // Dimensions
  const { width: screenWidth } = Dimensions.get('window');

  // Initialize permissions and WebSocket
  useEffect(() => {
    initializeApp();
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      ws?.close();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Request initial permissions
      const [cameraStatus, audioStatus] = await Promise.all([
        Camera.requestCameraPermissionsAsync(),
        Audio.requestPermissionsAsync()
      ]);
      
      setCameraPermission(cameraStatus.status === 'granted');
      setMicrophonePermission(audioStatus.status === 'granted');
      
      // Initialize WebSocket connection
      initializeWebSocket();
    } catch (error) {
      console.error('Error initializing app:', error);
      setError('Failed to initialize app');
      setStatusMessage('Initialization error');
    }
  };

  const initializeWebSocket = () => {
    try {
      const socket = new WebSocket(APP_CONFIG.WS_URL);
      
      socket.onopen = () => {
        console.log('WebSocket connected');
        setStatusMessage('Connected to agent server');
      };
      
      socket.onmessage = (e) => {
        try {
          const msg: WebSocketMessage = JSON.parse(e.data);
          handleWebSocketMessage(msg);
        } catch (parseError) {
          console.error('Error parsing WebSocket message:', parseError);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatusMessage('WebSocket connection error');
      };
      
      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setStatusMessage('Disconnected from agent server');
        // Attempt to reconnect after a delay
        setTimeout(initializeWebSocket, 5000);
      };
      
      setWs(socket);
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      setError('Failed to connect to server');
      setStatusMessage('Connection error');
    }
  };

  const handleWebSocketMessage = (msg: WebSocketMessage) => {
    switch (msg.type) {
      case 'screenshot':
        // Screenshot updates handled by WebView
        break;
      case 'status':
        setStatusMessage(msg.data as string);
        break;
      case 'action':
        // Handle action updates if needed
        break;
      default:
        console.warn('Unknown message type:', msg.type);
    }
  };

  const executeTask = async () => {
    if (!prompt.trim() || isTaskRunning || taskStatus === 'running') {
      if (!prompt.trim()) {
        setStatusMessage('Please enter a task prompt');
        speechFeedback('Please enter a task prompt');
      }
      return;
    }

    if (prompt.length > APP_CONFIG.MAX_PROMPT_LENGTH) {
      const truncatedPrompt = prompt.substring(0, APP_CONFIG.MAX_PROMPT_LENGTH) + '...';
      setPrompt(truncatedPrompt);
      setStatusMessage(`Prompt truncated to ${APP_CONFIG.MAX_PROMPT_LENGTH} characters`);
    }

    setIsTaskRunning(true);
    setTaskStatus('starting');
    setStatusMessage('Starting task...');

    try {
      const response = await fetch(APP_CONFIG.API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          key: process.env.EXPO_PUBLIC_LLM_KEY || '',
          userAgent: APP_CONFIG.DEFAULT_USER_AGENT
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.taskId) {
        setTaskStatus('running');
        speechFeedback(`Task ${data.taskId} started`);
        setStatusMessage(`Task running: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Error executing task:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setTaskStatus('error');
      setStatusMessage(`Error: ${errorMessage}`);
      speechFeedback('Error executing task');
    } finally {
      setIsTaskRunning(false);
    }
  };

  const startVoiceCommand = async () => {
    if (!microphonePermission) {
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          showPermissionAlert('Microphone permission is needed for voice commands');
          return;
        }
        setMicrophonePermission(granted);
      } catch (error) {
        console.error('Error requesting microphone permission:', error);
        setError('Failed to get microphone permission');
        return;
      }
    }

    try {
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setStatusMessage('Recording voice command...');
      speechFeedback('Recording voice command');
    } catch (error) {
      console.error('Error starting voice recording:', error);
      setError('Failed to start voice recording');
      setStatusMessage('Error starting voice recording');
    }
  };

  const stopVoiceCommand = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        
        // Send to backend
        await fetch(APP_CONFIG.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: base64, 
            voice: true,
            key: process.env.EXPO_PUBLIC_LLM_KEY || '' 
          }),
        });
        
        setStatusMessage('Voice command sent for processing');
        speechFeedback('Voice command sent');
      }
    } catch (error) {
      console.error('Error stopping voice recording:', error);
      setError('Failed to stop voice recording');
      setStatusMessage('Error processing voice command');
    } finally {
      setRecording(null);
    }
  };

  const startVideoRecording = async () => {
    if (!cameraPermission) {
      try {
        const { granted } = await Camera.requestCameraPermissionsAsync();
        if (!granted) {
          showPermissionAlert('Camera permission is needed for video recording');
          return;
        }
        setCameraPermission(granted);
      } catch (error) {
        console.error('Error requesting camera permission:', error);
        setError('Failed to get camera permission');
        return;
      }
    }

    try {
      setTaskStatus('recording');
      
      // Start recording with 15-second duration, include camera PiP
      const recordingOptions: VideoRecordingOptions = {
        duration: 15,  // 15 seconds
        resolution: '720p',
        fps: 30,
        includeCamera: true
      };
      
      const success = await VideoRecordingService.startRecording(recordingOptions);
      
      if (success) {
        setIsVideoRecording(true);
        setStatusMessage('Recording video of task execution...');
        speechFeedback('Recording video started');
        
        // Set timeout to automatically stop recording
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current);
        }
        recordingTimeoutRef.current = setTimeout(stopVideoRecording, APP_CONFIG.MAX_RECORDING_DURATION);
      } else {
        Alert.alert('Recording failed', 'Could not start video recording');
        setTaskStatus('idle');
      }
    } catch (error) {
      console.error('Error starting video recording:', error);
      setError('Failed to start video recording');
      setStatusMessage('Error starting video recording');
      setTaskStatus('error');
    }
  };

  const stopVideoRecording = async () => {
    try {
      const uri = await VideoRecordingService.stopRecording();
      
      if (uri) {
        setIsVideoRecording(false);
        setVideoUri(uri);
        setTaskStatus('recording-stopped');
        setStatusMessage('Video recording completed');
        speechFeedback('Video recording stopped');
        
        // Save to gallery
        const saved = await VideoRecordingService.saveToGallery(uri);
        if (saved) {
          setStatusMessage('Video saved to gallery');
        } else {
          setStatusMessage('Video recorded but not saved to gallery');
        }
      } else {
        setTaskStatus('idle');
        setStatusMessage('Video recording stopped without saving');
      }
      
      // Clear timeout if set
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping video recording:', error);
      setError('Failed to stop video recording');
      setTaskStatus('error');
      setStatusMessage('Error stopping video recording');
    }
  };

  const shareVideo = async () => {
    if (!videoUri) {
      showNoVideoAlert();
      return;
    }

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(videoUri);
        setStatusMessage('Video shared successfully');
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
        setStatusMessage('Sharing not available');
      }
    } catch (error) {
      console.error('Error sharing video:', error);
      setError('Failed to share video');
      setStatusMessage('Error sharing video');
    }
  };

  const toggleCamera = () => {
    if (!cameraPermission) {
      showPermissionAlert('Camera permission is needed for video recording');
      return;
    }
    setIsCameraActive(!isCameraActive);
  };

  const speechFeedback = useCallback((message: string) => {
    if (Platform.OS === 'android') {
      // On Android, we need to account for TTS engine availability
      Speech.speak(message, {
        onStart: () => console.log('Speech started'),
        onDone: () => console.log('Speech finished'),
      });
    } else {
      Speech.speak(message);
    }
  }, []);

  const showPermissionAlert = useCallback((message: string) => {
    Alert.alert('Permission Required', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Settings', onPress: () => {
          // Open app settings
          if (Platform.OS === 'android') {
            // For Android
            PermissionsAndroid.openSettings('app-settings:');
          }
        }
      }
    ]);
  }, []);

  const showNoVideoAlert = useCallback(() => {
    Alert.alert('No Video to Share', 'Please record a video first', [
      { text: 'OK', style: 'default' }
    ]);
  }, []);

  const canPerformActions = useMemo(() => {
    return taskStatus !== 'running' && !isTaskRunning && taskStatus !== 'recording';
  }, [taskStatus, isTaskRunning]);

  // Render methods
  const renderStatusIndicator = () => {
    let color = '#333';
    switch (taskStatus) {
      case 'running': color = '#4CAF50'; break;
      case 'error': color = '#F44336'; break;
      case 'recording': color = '#FF9800'; break;
      default: color = '#333';
    }

    return (
      <View style={styles.statusIndicatorContainer}>
        {isTaskRunning && <ActivityIndicator size="small" color={color} />}
        <Text style={[styles.statusText, { color }]}>
          {statusMessage}
        </Text>
      </View>
    );
  };

  const renderControls = () => (
    <View style={styles.controls}>
      <TextInput
        style={styles.input}
        value={prompt}
        onChangeText={setPrompt}
        placeholder="Enter task prompt (e.g. 'Book my Uber')"
        multiline
        numberOfLines={2}
        maxLength={APP_CONFIG.MAX_PROMPT_LENGTH}
        editable={canPerformActions}
        selectTextOnFocus={canPerformActions}
      />
      
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[
            styles.button, 
            !canPerformActions && styles.disabledButton,
            isTaskRunning && styles.runningButton
          ]} 
          onPress={executeTask}
          disabled={!canPerformActions}
        >
          <Text style={styles.buttonText}>
            {isTaskRunning ? 'Running...' : 'Execute Task'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.button, 
            recording && styles.recordingButton,
            !canPerformActions && styles.disabledButton
          ]} 
          onPress={recording ? stopVoiceCommand : startVoiceCommand}
          disabled={!canPerformActions}
        >
          <Text style={styles.buttonText}>
            {recording ? 'Stop Voice' : 'Voice'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[
            styles.button, 
            isVideoRecording && styles.recordingButton,
            !canPerformActions && styles.disabledButton
          ]} 
          onPress={isVideoRecording ? stopVideoRecording : startVideoRecording}
          disabled={!canPerformActions}
        >
          <Text style={styles.buttonText}>
            {isVideoRecording ? 'Stop Recording' : 'Record Video'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.button, 
            { backgroundColor: isCameraActive ? '#228B22' : '#8B0000' },
            !canPerformActions && styles.disabledButton
          ]} 
          onPress={toggleCamera}
          disabled={!canPerformActions}
        >
          <Text style={styles.buttonText}>
            {isCameraActive ? 'Hide Camera' : 'Show Camera'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {videoUri && (
        <View style={styles.videoPreviewContainer}>
          <Text style={styles.videoLabel}>Recorded Video:</Text>
          <TouchableOpacity 
            onPress={shareVideo} 
            style={styles.shareButton}
            disabled={!canPerformActions}
          >
            <Text style={styles.shareButtonText}>Share Video</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#f5f5f5" 
      />
      
      <View style={styles.webviewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: APP_CONFIG.DEFAULT_WEBVIEW_URL }}
          style={styles.webview}
          userAgent={APP_CONFIG.DEFAULT_USER_AGENT}
          javaScriptEnabled
          domStorageEnabled
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            setError(`WebView error: ${nativeEvent.description}`);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('HTTP error:', nativeEvent);
            setError(`HTTP error: ${nativeEvent.statusCode} ${nativeEvent.url}`);
          }}
        />
        
        {/* Camera overlay for PiP when recording */}
        {isCameraActive && cameraPermission && (
          <View style={styles.cameraOverlay}>
            <Camera 
              style={styles.camera} 
              type={CameraType.front}
              ratio={'1:1'}
            />
          </View>
        )}
      </View>
      
      {renderStatusIndicator()}
      {renderControls()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  webviewContainer: {
    flex: 1,
  },
  webview: { 
    flex: 1 
  },
  cameraOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 10,
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  statusIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  controls: { 
    padding: 10, 
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    padding: 12, 
    marginBottom: 10, 
    backgroundColor: '#fff',
    borderRadius: 8,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#4630eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  runningButton: {
    backgroundColor: '#4CAF50',
  },
  recordingButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  videoPreviewContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  videoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  shareButton: {
    backgroundColor: '#4630eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 120,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  errorContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default App;
