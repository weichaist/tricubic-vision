import 'package:camerawesome/pigeon.dart';
import 'package:flutter/material.dart';
import 'package:camerawesome/camerawesome_plugin.dart';
import 'package:get/get.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'package:tricubic_vision_camera/controllers/background_upload_controller.dart';
import 'dart:async';

import 'package:tricubic_vision_camera/utils/logger_util.dart';
import 'package:tricubic_vision_camera/controllers/awesome_camera_controller.dart';
import 'package:tricubic_vision_camera/controllers/sensor_controller.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

class AwesomeCameraPage extends StatefulWidget {
  const AwesomeCameraPage({super.key});

  @override
  State<AwesomeCameraPage> createState() => _AwesomeCameraPageState();
}

class _AwesomeCameraPageState extends State<AwesomeCameraPage> {
  // Configuration for video segments
  final int _segmentDurationSeconds = 60;
  // Get controller instances
  late AwesomeCameraController controller;
  late SensorController sensorController;

  // Timer for 60-second recording segments
  Timer? _recordingTimer;
  // Track the current segment number
  int _currentSegment = 1;
  // Track recording duration
  int _recordingDurationSeconds = 0;

  // Flag to determine if recording is currently in progress
  bool _isRecording = false;

  // Flag to determine if we should automatically restart recording
  bool _shouldRestartRecording = false;

  // Variable to store the last known state type for debugging
  String _lastStateType = '';
  @override
  void initState() {
    super.initState();
    WakelockPlus.enable();
    controller = Get.find<AwesomeCameraController>();
    sensorController = Get.find<SensorController>();
    // Permissions are now handled by the controller
  }

  @override
  void dispose() {
    WakelockPlus.disable();
    _stopRecordingTimer();

    super.dispose();
  }

  // Start a timer to track recording duration
  void _startRecordingTimer() {
    // Reset recording duration but DON'T reset segment number
    // unless this is a brand new recording (checked in onMediaCaptureEvent)
    _recordingDurationSeconds = 0;

    // Cancel any existing timer
    _recordingTimer?.cancel();

    // Create a timer that fires every second to track recording duration
    _recordingTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _recordingDurationSeconds++;

        // The segment number is incremented in the middleContentBuilder
        // when recording is stopped and restarted
      });
    });
  }

  // Stop the recording timer
  void _stopRecordingTimer() {
    _recordingTimer?.cancel();
    _recordingTimer = null;
    // Reset duration counter
    _recordingDurationSeconds = 0;
    // Note: We don't reset _currentSegment here anymore to preserve segment numbering
  }

  // Reset all counters (called when completely stopping recording)
  void _resetAllCounters() {
    _recordingDurationSeconds = 0;
    _currentSegment = 1;
  }

  // Permission handling moved to AwesomeCameraController

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        body: Stack(
          children: [
            CameraAwesomeBuilder.awesome(
              // Listen for media capture events to manage our timer
              onMediaCaptureEvent: (event) {
                if (event.isVideo) {
                  if (event.status == MediaCaptureStatus.capturing) {
                    // Recording started
                    setState(() {
                      _isRecording = true;
                    });
                    _startRecordingTimer();
                    appLogger.i('Recording started - timer started');
                    _shouldRestartRecording =
                        false; // Reset flag when recording starts
                  } else if (event.status == MediaCaptureStatus.success) {
                    // Recording successfully completed
                    setState(() {
                      _isRecording = false;
                    });
                    appLogger.i(
                      'Recording completed successfully - processing file',
                    );

                    // Get the file path and add it to the upload queue automatically
                    try {
                      String filePath = '';
                      filePath = event.captureRequest.path!;

                      if (filePath.isNotEmpty) {
                        // Auto-upload the newly saved video file
                        final uploadService =
                            Get.find<BackgroundUploadController>();
                        final dateTime = DateTime.now();
                        final timestamp =
                            '${dateTime.year}${dateTime.month.toString().padLeft(2, '0')}${dateTime.day.toString().padLeft(2, '0')}_'
                            '${dateTime.hour.toString().padLeft(2, '0')}${dateTime.minute.toString().padLeft(2, '0')}';
                        final title =
                            'TricubicVision_${timestamp}_seg${_currentSegment.toString().padLeft(2, '0')}';

                        uploadService.addToUploadQueue(filePath, title: title);
                        appLogger.i(
                          'Auto-added video to upload queue: $filePath',
                        );
                      }
                    } catch (e) {
                      appLogger.e('Error auto-uploading video: $e');
                    }

                    // Continue with normal timer logic
                    appLogger.i('Recording stopped - timer stopped');

                    // When recording stops, check what caused it to stop
                    if (_recordingDurationSeconds > 0 &&
                        _recordingDurationSeconds % _segmentDurationSeconds ==
                            0) {
                      // If it stopped due to our segment logic, we'll let the timer continue
                      appLogger.i(
                        'Recording stopped due to segment end - keeping timer running',
                      );
                      // Just stop the timer but don't reset segment counter
                      _stopRecordingTimer();

                      // Set flag to restart recording
                      _shouldRestartRecording = true;
                      appLogger.i(
                        'Set flag to restart recording: $_shouldRestartRecording',
                      );
                    } else {
                      // If it was manually stopped, reset everything
                      _stopRecordingTimer();
                      _resetAllCounters();
                      _shouldRestartRecording = false;
                      appLogger.i('Manual stop - resetting all counters');
                    }
                  } else if (event.status == MediaCaptureStatus.failure) {
                    // Recording failed
                    setState(() {
                      _isRecording = false;
                    });
                    appLogger.e('Recording failed');
                    _stopRecordingTimer();
                    _resetAllCounters();
                    _shouldRestartRecording = false;
                  }
                }
              },
              sensorConfig: SensorConfig.single(
                sensor: Sensor.position(SensorPosition.front),
                zoom: 0.0,
              ),

              saveConfig: SaveConfig.video(
                pathBuilder: _videoPathBuilder,
                videoOptions: VideoOptions(
                  enableAudio: true,
                  quality: VideoRecordingQuality.hd,
                  ios: CupertinoVideoOptions(),
                  android: AndroidVideoOptions(
                    bitrate: 3000000,
                    fallbackStrategy: QualityFallbackStrategy.lower,
                  ),
                ),
              ),
              previewFit: CameraPreviewFit.contain,
              topActionsBuilder:
                  (state) => AwesomeTopActions(
                    padding: EdgeInsets.zero,
                    state: state,
                    children: [
                      // Show recording timer and segment info
                      Visibility(
                        visible: false,
                        child: SizedBox(
                          width: Get.size.width,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              // if (_recordingDurationSeconds > 0)
                              Padding(
                                padding: const EdgeInsets.all(8.0),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    // Recording duration
                                    Text(
                                      '${(_recordingDurationSeconds ~/ 60).toString().padLeft(2, '0')}:${(_recordingDurationSeconds % 60).toString().padLeft(2, '0')}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 16,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    // Segment indicator
                                    Text(
                                      'セグメント: $_currentSegment',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
              middleContentBuilder: (state) {
                // Debug the current state
                _lastStateType = state.runtimeType.toString();
                appLogger.i(
                  'Current state: $_lastStateType, Recording seconds: $_recordingDurationSeconds',
                );

                // Create a button widget to return for the middle content
                Widget buttonWidget = GestureDetector(
                  onTap: () {
                    // Handle the tap action based on the current state
                    state.when(
                      onVideoRecordingMode: (recordingState) {
                        appLogger.i('Stopping recording manually');
                        _shouldRestartRecording =
                            false; // Make sure we don't auto-restart
                        recordingState.stopRecording();
                      },
                      onVideoMode: (videoState) {
                        appLogger.i('Starting recording manually');
                        videoState.startRecording();
                      },
                      onPhotoMode: (photoState) {
                        appLogger.i('Cannot record in photo mode');
                      },
                      onPreparingCamera: (preparingState) {
                        appLogger.i('Camera is preparing - wait until ready');
                      },
                    );
                  },
                  child: SizedBox.shrink(),
                );

                // Check if we need to create a new segment
                if (_recordingDurationSeconds > 0 &&
                    _recordingDurationSeconds % _segmentDurationSeconds == 0) {
                  appLogger.d('Creating new video segment: $_currentSegment');

                  // Use the state.when pattern to handle different camera states
                  state.when(
                    onVideoRecordingMode: (recordingState) {
                      appLogger.i(
                        'Camera is in recording mode - stopping recording for segment',
                      );
                      _lastStateType = 'VideoRecordingCameraState';

                      // Increment the segment number before stopping recording
                      _currentSegment++;
                      appLogger.i('Incrementing to segment: $_currentSegment');

                      // Stop the current recording
                      recordingState.stopRecording();

                      appLogger.i(
                        'Segment ${_currentSegment - 1} completed and saved',
                      );
                      _shouldRestartRecording = true;
                      appLogger.i(
                        'Set flag to restart recording: $_shouldRestartRecording',
                      );
                    },
                    // Other states don't need special handling for segment creation
                    onVideoMode: (_) {},
                    onPhotoMode: (_) {},
                    onPreparingCamera: (_) {},
                  );
                }

                // Check if we need to restart recording
                if (_shouldRestartRecording) {
                  state.when(
                    onVideoMode: (videoState) {
                      appLogger.i('Auto-restarting recording for next segment');
                      _shouldRestartRecording = false; // Reset the flag
                      videoState.startRecording();
                    },
                    // Don't do anything in other states
                    onVideoRecordingMode: (_) {},
                    onPhotoMode: (_) {},
                    onPreparingCamera: (_) {},
                  );
                }

                return buttonWidget;
              },
              bottomActionsBuilder:
                  (state) => AwesomeBottomActions(
                    state: state,
                    left: AwesomeOrientedWidget(
                      child: Obx(() {
                        // Get upload service to check if uploads are in progress
                        final uploadService =
                            Get.find<BackgroundUploadController>();
                        final bool isUploading =
                            uploadService.isUploading.value;
                        final int uploadProgress =
                            uploadService.uploadProgress.value;
                        final bool hasItemsInQueue =
                            uploadService.uploadQueue.isNotEmpty;

                        if (isUploading || hasItemsInQueue || _isRecording) {
                          // Show upload indicator instead of back button
                          return Container(
                            padding: const EdgeInsets.all(8.0),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.cloud_upload,
                                  color: Colors.amber,
                                  size: 24,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '$uploadProgress%',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          );
                        } else {
                          // Regular back button when no uploads are in progress
                          return IconButton(
                            icon: const Icon(
                              Icons.arrow_back,
                              color: Colors.white,
                            ),
                            onPressed: () => Get.back(),
                          );
                        }
                      }),
                    ),
                    right: AwesomeCameraSwitchButton(
                      state: state,
                      onSwitchTap: (state) {
                        state.switchCameraSensor(
                          aspectRatio: state.sensorConfig.aspectRatio,
                        );
                      },
                    ),
                  ),
            ),

            // Acceleration display widget in top-left corner
            Positioned(
              top: 45,
              left: 18,
              child: Obx(() {
                final accel = sensorController.userAccelerometer.value;
                final magnitude = sensorController.calculateMagnitudeXYZ(
                  accel.x,
                  accel.y,
                  accel.z,
                );
                final isSignificant =
                    sensorController.isSignificantMotion.value;

                return GestureDetector(
                  onLongPress: () {
                    // Show dialog to edit threshold
                    showDialog(
                      context: context,
                      builder: (BuildContext context) {
                        final TextEditingController textController =
                            TextEditingController(
                              text:
                                  sensorController.motionThreshold.value
                                      .toString(),
                            );

                        return AlertDialog(
                          title: const Text('閾値を編集'),
                          content: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text(
                                '加速度の閾値を設定します。\n値が小さいほど敏感になります（12前後が推奨）',
                                style: TextStyle(fontSize: 14),
                              ),
                              const SizedBox(height: 16),
                              TextField(
                                controller: textController,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                      decimal: true,
                                    ),
                                decoration: const InputDecoration(
                                  labelText: '閾値',
                                  hintText: '9.0',
                                  border: OutlineInputBorder(),
                                ),
                              ),
                            ],
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Get.back(),
                              child: const Text('キャンセル'),
                            ),
                            TextButton(
                              onPressed: () {
                                // Try to parse input
                                try {
                                  final newValue = double.parse(
                                    textController.text,
                                  );
                                  sensorController.setMotionThreshold(newValue);
                                  Get.back();
                                  Get.snackbar(
                                    '閾値が更新されました',
                                    '加速度閾値: $newValue',
                                    snackPosition: SnackPosition.BOTTOM,
                                    duration: const Duration(seconds: 2),
                                  );
                                } catch (e) {
                                  Get.snackbar(
                                    'エラー',
                                    '有効な数値を入力してください',
                                    snackPosition: SnackPosition.BOTTOM,
                                  );
                                }
                              },
                              child: const Text('保存'),
                            ),
                          ],
                        );
                      },
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color:
                          isSignificant
                              ? Colors.red.withValues(alpha: 0.7)
                              : Colors.black.withValues(alpha: 0.7),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color:
                            isSignificant
                                ? Colors.red
                                : Colors.white.withValues(alpha: 0.3),
                        width: 1,
                      ),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          '加速度 ',
                          style: TextStyle(color: Colors.white, fontSize: 12),
                        ),
                        Text(
                          '${magnitude.round()}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 30,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  // Custom path for saving videos - simplified to only save to Movies directory with single sensor
  Future<CaptureRequest> _videoPathBuilder(List<Sensor> sensors) async {
    try {
      // For Android, directly use the Movies directory
      Directory videoDir;

      if (Platform.isAndroid) {
        // Use Movies directory for Android
        videoDir = Directory('/storage/emulated/0/Movies');
        await videoDir.create(recursive: true);
      } else {
        // For iOS, use application documents directory
        videoDir = await getApplicationDocumentsDirectory();
      }

      // Create the TricubicVision subdirectory
      final String dirPath = '${videoDir.path}/TricubicVision';
      final videosDir = await Directory(dirPath).create(recursive: true);

      // Generate timestamp for unique filenames
      final dateTime = DateTime.now();
      final dateStr =
          '${dateTime.year}${dateTime.month.toString().padLeft(2, '0')}${dateTime.day.toString().padLeft(2, '0')}';
      final timeStr =
          '${dateTime.hour.toString().padLeft(2, '0')}${dateTime.minute.toString().padLeft(2, '0')}${dateTime.second.toString().padLeft(2, '0')}';

      // Add segment number to filename
      final segmentStr = _currentSegment.toString().padLeft(2, '0');

      // Always use single camera recording
      final String filePath =
          '${videosDir.path}/TricubicVision_${dateStr}_${timeStr}_seg$segmentStr.mp4';

      // Store the path in the controller if available
      try {
        controller.addSegmentPath(filePath);
      } catch (e) {
        // Ignore if controller is not available
      }

      // Return single capture request with the first sensor
      return SingleCaptureRequest(filePath, sensors.first);
    } catch (e) {
      // Simple fallback to temporary directory
      final tempDir = await getTemporaryDirectory();
      final dirPath = '${tempDir.path}/TricubicVision';
      await Directory(dirPath).create(recursive: true);

      final dateTime = DateTime.now();
      final timestamp =
          '${dateTime.year}${dateTime.month.toString().padLeft(2, '0')}${dateTime.day.toString().padLeft(2, '0')}_'
          '${dateTime.hour.toString().padLeft(2, '0')}${dateTime.minute.toString().padLeft(2, '0')}${dateTime.second.toString().padLeft(2, '0')}';
      final segmentStr = _currentSegment.toString().padLeft(2, '0');

      final String filePath =
          '$dirPath/TricubicVision_${timestamp}_seg$segmentStr.mp4';
      return SingleCaptureRequest(filePath, sensors.first);
    }
  }
}
