// VideoRecordingService.ts
// This service handles video recording functionality for AgentBrowser
// In a real implementation, this would integrate with a native module
// or use an external library that supports screen recording

import { Camera, CameraType } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Permissions from 'expo-permissions';
import { Alert, Platform } from 'react-native';
import * as Application from 'expo-application';

interface VideoRecordingOptions {
  duration?: number; // Recording duration in seconds
  resolution?: string; // Video resolution (e.g., '720p')
  fps?: number; // Frames per second
  includeCamera?: boolean; // Whether to include camera PiP
}

interface RecordingStatus {
  isRecording: boolean;
  startTime: number | null;
  uri: string | null;
  options: VideoRecordingOptions | null;
}

class VideoRecordingService {
  private status: RecordingStatus = {
    isRecording: false,
    startTime: null,
    uri: null,
    options: null,
  };
  
  private readonly logger: Console;
  private readonly config = {
    MAX_DURATION: 15000, // 15 seconds in ms
    FILE_PREFIX: 'agentbrowser-recording',
    DEFAULT_RESOLUTION: '720p',
    DEFAULT_FPS: 30,
  };

  constructor() {
    this.logger = console;
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    try {
      // Ensure required permissions are available
      await this.checkAndRequestPermissions();
      this.logger.info('Video recording service initialized');
    } catch (error) {
      this.logger.error('Error initializing video recording service:', error);
    }
  }
  
  async startRecording(options: VideoRecordingOptions = {}): Promise<boolean> {
    try {
      // Validate options
      const validatedOptions = this.validateOptions(options);
      
      // Check permissions
      const permissions = await this.checkAndRequestPermissions();
      if (!permissions.mediaLibrary || !permissions.camera) {
        this.logger.error('Required permissions not granted for video recording');
        return false;
      }

      // Check if already recording
      if (this.status.isRecording) {
        this.logger.warn('Recording already in progress');
        return false;
      }

      // Initialize recording status
      this.status = {
        isRecording: true,
        startTime: Date.now(),
        uri: null,
        options: validatedOptions,
      };

      this.logger.info('Video recording started with options:', validatedOptions);
      return true;
    } catch (error) {
      this.logger.error('Error starting video recording:', error);
      this.resetStatus();
      return false;
    }
  }
  
  async stopRecording(): Promise<string | null> {
    try {
      if (!this.status.isRecording) {
        this.logger.warn('No active recording to stop');
        return null;
      }

      const recordingDuration = this.status.startTime ? Date.now() - this.status.startTime : 0;
      
      // Create a simulated video file (in a real implementation, this would be actual video data)
      const videoPath = await this.createVideoPlaceholder(recordingDuration);
      
      // Update status
      this.status.uri = videoPath;
      this.status.isRecording = false;
      this.status.startTime = null;

      this.logger.info(`Video recording stopped, saved to: ${videoPath}`);
      return videoPath;
    } catch (error) {
      this.logger.error('Error stopping video recording:', error);
      this.resetStatus();
      return null;
    }
  }
  
  async combineScreenAndCamera(screenUri: string, cameraUri: string, outputPath: string): Promise<boolean> {
    // This is a placeholder implementation - in a real implementation,
    // this would use a native module or external library to combine streams
    try {
      this.logger.info('Combining screen and camera recordings', { screenUri, cameraUri, outputPath });
      
      // In a real implementation, this would use a video processing library
      // to combine the screen recording and camera feed
      // For now, we just log the action
      return true;
    } catch (error) {
      this.logger.error('Error combining screen and camera recordings:', error);
      return false;
    }
  }
  
  isCurrentlyRecording(): boolean {
    return this.status.isRecording;
  }
  
  getCurrentRecordingUri(): string | null {
    return this.status.uri;
  }
  
  getRecordingStatus(): Omit<RecordingStatus, 'options'> {
    const { options, ...status } = this.status;
    return status;
  }
  
  async saveToGallery(videoUri: string): Promise<boolean> {
    try {
      if (!videoUri) {
        this.logger.error('No video URI provided to save to gallery');
        return false;
      }

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (!fileInfo.exists) {
        this.logger.error('Video file does not exist:', videoUri);
        return false;
      }

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(videoUri);
      
      if (asset) {
        // Add to a custom album if needed
        const album = await MediaLibrary.getAlbumAsync('AgentBrowser');
        if (!album) {
          await MediaLibrary.createAlbumAsync('AgentBrowser', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
        
        this.logger.info('Video saved to gallery:', asset.uri);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Error saving video to gallery:', error);
      return false;
    }
  }
  
  async checkPermissions(): Promise<{ mediaLibrary: boolean, camera: boolean }> {
    try {
      const [mediaStatus, cameraStatus] = await Promise.all([
        MediaLibrary.getPermissionsAsync(),
        Camera.getCameraPermissionsAsync()
      ]);
      
      return {
        mediaLibrary: mediaStatus.status === 'granted',
        camera: cameraStatus.status === 'granted'
      };
    } catch (error) {
      this.logger.error('Error checking permissions:', error);
      return {
        mediaLibrary: false,
        camera: false
      };
    }
  }

  private async checkAndRequestPermissions(): Promise<{ mediaLibrary: boolean, camera: boolean }> {
    try {
      // Request media library permission first
      let mediaStatus = await MediaLibrary.getPermissionsAsync();
      if (mediaStatus.status !== 'granted') {
        mediaStatus = await MediaLibrary.requestPermissionsAsync();
      }

      // Request camera permission
      let cameraStatus = await Camera.getCameraPermissionsAsync();
      if (cameraStatus.status !== 'granted') {
        cameraStatus = await Camera.requestCameraPermissionsAsync();
      }

      return {
        mediaLibrary: mediaStatus.status === 'granted',
        camera: cameraStatus.status === 'granted'
      };
    } catch (error) {
      this.logger.error('Error checking and requesting permissions:', error);
      return {
        mediaLibrary: false,
        camera: false
      };
    }
  }

  private validateOptions(options: VideoRecordingOptions): VideoRecordingOptions {
    const validated: VideoRecordingOptions = {};
    
    // Validate duration
    if (options.duration !== undefined) {
      validated.duration = Math.min(Math.max(options.duration, 1), 30); // Between 1-30 seconds
    } else {
      validated.duration = 15; // Default to 15 seconds
    }
    
    // Validate resolution
    if (options.resolution !== undefined) {
      // Only accept known good resolutions
      const validResolutions = ['480p', '720p', '1080p'];
      validated.resolution = validResolutions.includes(options.resolution) 
        ? options.resolution 
        : this.config.DEFAULT_RESOLUTION;
    } else {
      validated.resolution = this.config.DEFAULT_RESOLUTION;
    }
    
    // Validate FPS
    if (options.fps !== undefined) {
      validated.fps = Math.min(Math.max(options.fps, 15), 60); // Between 15-60 FPS
    } else {
      validated.fps = this.config.DEFAULT_FPS;
    }
    
    // Validate includeCamera
    validated.includeCamera = options.includeCamera ?? true;
    
    return validated;
  }

  private async createVideoPlaceholder(duration: number): Promise<string> {
    // Create a unique filename based on timestamp
    const timestamp = Date.now();
    const videoPath = `${FileSystem.documentDirectory}${this.config.FILE_PREFIX}-${timestamp}.mp4`;
    
    // In a real implementation, this would be actual video data
    // For now, create a JSON file with metadata that simulates video content
    const videoMetadata = {
      filename: `${this.config.FILE_PREFIX}-${timestamp}.mp4`,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      resolution: this.status.options?.resolution || this.config.DEFAULT_RESOLUTION,
      fps: this.status.options?.fps || this.config.DEFAULT_FPS,
      app_version: Application.nativeApplicationVersion || 'unknown',
      device_info: {
        platform: Platform.OS,
        model: Platform.Version?.toString() || 'unknown',
      }
    };
    
    await FileSystem.writeAsStringAsync(
      videoPath,
      JSON.stringify(videoMetadata, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );
    
    return videoPath;
  }

  private resetStatus(): void {
    this.status = {
      isRecording: false,
      startTime: null,
      uri: null,
      options: null,
    };
  }

  async cleanup(): Promise<void> {
    try {
      // Clean up any temporary files
      if (this.status.uri) {
        const fileInfo = await FileSystem.getInfoAsync(this.status.uri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(this.status.uri);
        }
      }
      
      this.resetStatus();
      this.logger.info('Video recording service cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }
  }
}

// Create and export singleton instance
const videoRecordingService = new VideoRecordingService();

// Add cleanup on app termination
if (typeof process !== 'undefined' && process.on) {
  process.on('exit', () => {
    videoRecordingService.cleanup();
  });
}

export default videoRecordingService;