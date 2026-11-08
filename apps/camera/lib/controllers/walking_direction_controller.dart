import 'dart:async';
import 'dart:math';
import 'package:get/get.dart';
import 'package:sensors_plus/sensors_plus.dart';
import '../utils/logger_util.dart';

/// Controller for detecting forward/backward walking direction using accelerometer data
class WalkingDirectionController extends GetxController {
  // Sensor data streams
  StreamSubscription<UserAccelerometerEvent>? _accelerometerSubscription;
  StreamSubscription<AccelerometerEvent>? _rawAccelerometerSubscription;

  // Observable values
  final Rx<UserAccelerometerEvent> userAcceleration =
      Rx<UserAccelerometerEvent>(
        UserAccelerometerEvent(0, 0, 0, DateTime.now()),
      );

  final Rx<AccelerometerEvent> rawAcceleration = Rx<AccelerometerEvent>(
    AccelerometerEvent(0, 0, 0, DateTime.now()),
  );

  // Walking direction - simplified to forward/backward only
  final RxString walkingDirection = 'Stationary'.obs;

  // Motion detection
  final RxBool isWalking = false.obs;
  final RxDouble motionMagnitude = 0.0.obs;
  final RxDouble forwardBackwardAcceleration =
      0.0.obs; // Z-axis in both orientations

  // Smoothing and filtering
  final List<double> _xHistory = [];
  final List<double> _yHistory = [];
  final List<double> _zHistory = [];
  final int _historySize = 10; // Number of samples to average

  // Thresholds
  final double _walkingThreshold =
      0.5; // Minimum acceleration to detect walking
  final double _directionThreshold =
      0.3; // Minimum acceleration to determine direction

  // Phone orientation detection
  final RxString phoneOrientation = 'Unknown'.obs;
  final RxBool isLandscape = false.obs;

  @override
  void onInit() {
    super.onInit();
    startSensorListening();
  }

  @override
  void onClose() {
    stopSensorListening();
    super.onClose();
  }

  void startSensorListening() {
    try {
      // Listen to user accelerometer (gravity removed)
      _accelerometerSubscription = userAccelerometerEventStream().listen(
        (UserAccelerometerEvent event) {
          userAcceleration.value = event;
          _processAccelerationData(event);
        },
        onError: (error) {
          appLogger.e('User accelerometer error: $error');
        },
        cancelOnError: false,
      );

      // Listen to raw accelerometer (includes gravity)
      _rawAccelerometerSubscription = accelerometerEventStream().listen(
        (AccelerometerEvent event) {
          rawAcceleration.value = event;
          _detectPhoneOrientation(event);
        },
        onError: (error) {
          appLogger.e('Raw accelerometer error: $error');
        },
        cancelOnError: false,
      );

      appLogger.i('Walking direction sensors initialized');
    } catch (e) {
      appLogger.e('Failed to initialize walking direction sensors: $e');
    }
  }

  void stopSensorListening() {
    _accelerometerSubscription?.cancel();
    _rawAccelerometerSubscription?.cancel();
    _accelerometerSubscription = null;
    _rawAccelerometerSubscription = null;
    _xHistory.clear();
    _yHistory.clear();
    _zHistory.clear();
  }

  void _processAccelerationData(UserAccelerometerEvent event) {
    // Add to history for smoothing
    _xHistory.add(event.x);
    _yHistory.add(event.y);
    _zHistory.add(event.z);

    // Keep history size limited
    if (_xHistory.length > _historySize) {
      _xHistory.removeAt(0);
      _yHistory.removeAt(0);
      _zHistory.removeAt(0);
    }

    // Calculate smoothed values
    final smoothedX = _xHistory.reduce((a, b) => a + b) / _xHistory.length;
    final smoothedY = _yHistory.reduce((a, b) => a + b) / _yHistory.length;
    final smoothedZ = _zHistory.reduce((a, b) => a + b) / _zHistory.length;

    // Z-axis is always forward/backward when phone screen faces user (selfie position)
    // This is true for both landscape and portrait orientations
    forwardBackwardAcceleration.value = smoothedZ;

    // Calculate motion magnitude
    final magnitude = sqrt(
      smoothedX * smoothedX + smoothedY * smoothedY + smoothedZ * smoothedZ,
    );
    motionMagnitude.value = magnitude;

    // Detect if walking
    isWalking.value = magnitude > _walkingThreshold;

    // Determine forward/backward direction when phone is in correct position
    if (isWalking.value &&
        (phoneOrientation.value == 'Landscape Selfie' ||
            phoneOrientation.value == 'Portrait Selfie')) {
      _calculateForwardBackwardDirection(smoothedZ);
    } else if (!isWalking.value) {
      walkingDirection.value = 'Stationary';
    } else if (phoneOrientation.value != 'Landscape Selfie' &&
        phoneOrientation.value != 'Portrait Selfie') {
      walkingDirection.value = 'Hold Phone in Selfie Position';
    }
  }

  void _detectPhoneOrientation(AccelerometerEvent event) {
    // Using gravity to detect phone orientation
    // Landscape selfie: X ≈ ±9.8, Y ≈ 0, Z ≈ 0
    // Portrait selfie: X ≈ 0, Y ≈ ±9.8, Z ≈ 0
    // Phone flat: X ≈ 0, Y ≈ 0, Z ≈ ±9.8

    final absX = event.x.abs();
    final absY = event.y.abs();
    final absZ = event.z.abs();

    if (absX > 7.0 && absX > absY && absX > absZ) {
      // Phone is in landscape orientation (gravity on X-axis)
      phoneOrientation.value = 'Landscape Selfie';
      isLandscape.value = true;
    } else if (absY > 7.0 && absY > absX && absY > absZ) {
      // Phone is in portrait orientation (gravity on Y-axis)
      phoneOrientation.value = 'Portrait Selfie';
      isLandscape.value = false;
    } else if (absZ > 7.0 && absZ > absX && absZ > absY) {
      // Phone is flat
      phoneOrientation.value = 'Flat';
      isLandscape.value = false;
    } else {
      phoneOrientation.value = 'Other';
      isLandscape.value = false;
    }
  }

  void _calculateForwardBackwardDirection(double zAcceleration) {
    // Z-axis when screen faces user (selfie position):
    // Positive Z = moving forward (away from screen/toward rear camera)
    // Negative Z = moving backward (toward screen/away from rear camera)

    if (zAcceleration.abs() < _directionThreshold) {
      walkingDirection.value = 'Minimal Movement';
      return;
    }

    // Determine direction based on Z-axis acceleration
    if (zAcceleration > 0) {
      walkingDirection.value = 'Forward';
    } else {
      walkingDirection.value = 'Backward';
    }
  }

  void resetCalibration() {
    _xHistory.clear();
    _yHistory.clear();
    _zHistory.clear();
    walkingDirection.value = 'Stationary';
    isWalking.value = false;
    forwardBackwardAcceleration.value = 0.0;
  }
}
