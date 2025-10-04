# Video Recording Implementation Notes

This document outlines what would be needed to implement full video recording functionality in AgentBrowser, since Expo doesn't provide built-in screen recording capabilities.

## Current Status

The `VideoRecordingService` provides a placeholder implementation that simulates the video recording functionality. For a complete implementation, we would need to use one of the following approaches:

## Approach 1: Expo Screen Capture (Future Implementation)

Expo does not currently support screen recording directly. However, in the future, if Expo adds this capability, we could use it like this:

```typescript
import { captureScreen } from 'expo-screen-capture';

// This is hypothetical - Expo doesn't currently have this functionality
const screenRecording = await captureScreen({
  format: 'mp4',
  resolution: '720p',
  fps: 30,
  duration: 15
});
```

## Approach 2: Expo Development Client with Custom Native Module (Recommended)

For a production implementation, you would need to:

1. Create a custom native module for iOS and Android that handles screen recording
2. Use the Expo development client to include the custom module
3. Integrate with the existing VideoRecordingService interface

### iOS Implementation
- Use `ReplayKit` for screen recording
- Combine with camera feed using `AVFoundation`
- Export using `AVAssetExportSession`

### Android Implementation
- Use `MediaProjection` API for screen recording
- Combine with camera feed using `Camera2` API
- Process with `MediaCodec` for combined output

## Approach 3: Third-Party Libraries

Some possible third-party solutions:
- `react-native-view-shot` + custom video combining
- `react-native-videos` with screen capture libraries
- `react-native-screcorder` (community libraries)

## Implementation Requirements

For a complete video recording feature that meets the project requirements:

1. **Screen Recording**: Capture the WebView content during task execution
2. **Camera Overlay**: Picture-in-picture overlay of user's face
3. **Video Format**: 15 seconds, 720×1280, 30fps, H.264 format
4. **File Management**: Save to device gallery and enable sharing
5. **Performance**: Keep APK size under 20 MB

## API Interface

The `VideoRecordingService` already implements the interface that a complete implementation would use:

```typescript
interface VideoRecordingOptions {
  duration?: number; // Recording duration in seconds
  resolution?: string; // Video resolution (e.g., '720p')
  fps?: number; // Frames per second
  includeCamera?: boolean; // Whether to include camera PiP
}

startRecording(options: VideoRecordingOptions): Promise<boolean>
stopRecording(): Promise<string | null>
combineScreenAndCamera(screenUri: string, cameraUri: string, outputPath: string): Promise<boolean>
saveToGallery(videoUri: string): Promise<boolean>
```

## Next Steps

To complete the video recording functionality:
1. Implement the native modules for iOS and Android
2. Integrate with the existing service interface
3. Test cross-platform compatibility
4. Optimize for performance and APK size