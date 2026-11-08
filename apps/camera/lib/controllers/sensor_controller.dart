import 'dart:async';
import 'dart:math';
import 'package:get/get.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../config/app_config.dart';
import '../controllers/auth_controller.dart';
import '../utils/logger_util.dart';

/// Controller responsible for handling sensor data and motion detection
class SensorController extends GetxController {
  static SensorController get to => Get.find<SensorController>();

  // Sensor data
  final Rx<UserAccelerometerEvent> userAccelerometer =
      Rx<UserAccelerometerEvent>(
        UserAccelerometerEvent(0, 0, 0, DateTime.now()),
      );
  final RxBool isSensorActive = false.obs;
  final RxDouble motionThreshold =
      12.0.obs; // Threshold for significant motion detection
  final RxBool isSignificantMotion =
      false.obs; // Flag for significant motion detection

  // Shared preferences key
  static const String _motionThresholdKey = 'motion_threshold';

  // Error handling
  final Rx<String?> errorMessage = Rx<String?>(null);

  // Stream subscriptions for sensors
  StreamSubscription<UserAccelerometerEvent>? _userAccelerometerSubscription;

  // Cooldown for alert uploads to prevent flooding
  final RxBool _alertCooldown = false.obs;
  final int _alertCooldownMs = 3000; // 3 seconds between alerts

  @override
  void onInit() {
    super.onInit();
    _loadSavedThreshold();
    initSensors();
  }

  @override
  void onClose() {
    disposeSensors();
    super.onClose();
  }

  /// Initialize sensor listener for user accelerometer only
  void initSensors() {
    try {
      isSensorActive.value = true;

      // Initialize user accelerometer subscription (gravity removed)
      _userAccelerometerSubscription = userAccelerometerEventStream().listen(
        (UserAccelerometerEvent event) {
          userAccelerometer.value = event;

          // Check for significant motion based on threshold
          final double magnitude = calculateMagnitudeXYZ(
            event.x,
            event.y,
            event.z,
          );

          // Update the significant motion flag
          final bool wasSignificantMotion = isSignificantMotion.value;
          isSignificantMotion.value = magnitude > motionThreshold.value;

          // If motion just became significant, create an alert
          if (isSignificantMotion.value &&
              !wasSignificantMotion &&
              !_alertCooldown.value) {
            _createAlert(magnitude, event);
          }

          // Acceleration data is displayed in the UI
        },
        onError: (error) {
          appLogger.e('User accelerometer error: $error');
          // Continue despite errors - the sensor might be temporarily unavailable
        },
        cancelOnError: false,
      );

      appLogger.i('Sensor initialized successfully');
    } catch (e) {
      appLogger.e('Failed to initialize sensors: $e');
      errorMessage.value =
          'センサーの初期化に失敗しました: $e'; // Failed to initialize sensors
    }
  }

  /// Dispose sensor listener
  void disposeSensors() {
    try {
      _userAccelerometerSubscription?.cancel();
      _userAccelerometerSubscription = null;

      isSensorActive.value = false;
      appLogger.d('Sensor disposed');
    } catch (e) {
      appLogger.e('Error disposing sensors: $e');
    }
  }

  /// Pause sensor listener
  void pauseSensors() {
    try {
      if (isSensorActive.value) {
        _userAccelerometerSubscription?.pause();

        isSensorActive.value = false;
        appLogger.d('Sensor paused');
      }
    } catch (e) {
      appLogger.e('Error pausing sensors: $e');
    }
  }

  /// Resume sensor listener
  void resumeSensors() {
    try {
      if (!isSensorActive.value) {
        _userAccelerometerSubscription?.resume();

        isSensorActive.value = true;
        appLogger.d('Sensor resumed');
      }
    } catch (e) {
      appLogger.e('Error resuming sensors: $e');
    }
  }

  /// Calculate magnitude of a 3D vector
  double calculateMagnitudeXYZ(double x, double y, double z) {
    return sqrt(x * x + y * y + z * z);
  }

  /// Load saved motion threshold from shared preferences
  Future<void> _loadSavedThreshold() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedThreshold = prefs.getDouble(_motionThresholdKey);
      if (savedThreshold != null) {
        motionThreshold.value = savedThreshold;
        appLogger.i('Loaded saved motion threshold: $savedThreshold');
      }
    } catch (e) {
      appLogger.e('Error loading motion threshold: $e');
    }
  }

  /// Save motion threshold to shared preferences
  Future<void> saveMotionThreshold(double value) async {
    try {
      motionThreshold.value = value;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setDouble(_motionThresholdKey, value);
      appLogger.i('Saved motion threshold: $value');
    } catch (e) {
      appLogger.e('Error saving motion threshold: $e');
      errorMessage.value = 'Failed to save settings';
    }
  }

  /// Set the motion threshold
  void setMotionThreshold(double threshold) {
    saveMotionThreshold(threshold);
    appLogger.i('Motion threshold set to: $threshold');
  }

  /// Create an alert via cloud function
  Future<void> _createAlert(
    double magnitude,
    UserAccelerometerEvent event,
  ) async {
    try {
      // Set cooldown to prevent flooding the cloud function with alerts
      _alertCooldown.value = true;

      // Get the current user from AuthController
      final authController = Get.find<AuthController>();
      final currentUser = authController.currentUser.value;

      if (currentUser == null) {
        appLogger.w('Cannot create alert: No user logged in');
        return;
      }

      // Determine the type of motion based on accelerometer values
      String alertName = '急加速！危険'; // Default: Dangerous acceleration!
      String motionType = 'acceleration';

      // Find the dominant axis of motion
      final absX = event.x.abs();
      final absY = event.y.abs();
      final absZ = event.z.abs();

      // Determine which axis had the most significant change
      if (absZ > absX && absZ > absY) {
        // Z-axis is dominant (forward/backward acceleration)
        if (event.z < 0) {
          alertName = '急発進！'; // Sudden start!
          motionType = 'sudden_start';
        } else {
          alertName = '急停止！'; // Sudden stop!
          motionType = 'sudden_stop';
        }
      } else if (absX > absY) {
        // X-axis is dominant (turning motion)
        alertName = '急旋回！'; // Sudden turn!
        motionType = 'sudden_turn';
      }

      appLogger.d(
        'Motion detected: $motionType (x: ${event.x.toStringAsFixed(2)}, '
        'y: ${event.y.toStringAsFixed(2)}, z: ${event.z.toStringAsFixed(2)})',
      );

      // Create alert details as JSON
      final Map<String, dynamic> details = {
        'magnitude': magnitude.toStringAsFixed(2),
        'threshold': motionThreshold.value.toStringAsFixed(2),
        'timestamp': DateTime.now().toIso8601String(),
        'x': event.x.toStringAsFixed(2),
        'y': event.y.toStringAsFixed(2),
        'z': event.z.toStringAsFixed(2),
        'motion_type': motionType,
      };

      // Call cloud function to create the alert
      final FirebaseFunctions functionsRegion = FirebaseFunctions.instanceFor(
        region: AppConfig.functionsRegion,
      );
      final HttpsCallable callable = functionsRegion.httpsCallable(
        'writeAlertToSupabase',
      );
      await callable.call({
        'name': alertName,
        'details': details,
        'user_uid': currentUser.uid,
        'location_uid': currentUser.locationUid,
        'company_uid': currentUser.companyUid,
        'rule_uid': AppConfig.accelerationAlertRuleUidOrNull,
      });

      appLogger.i('Alert created via cloud function: Magnitude $magnitude');

      // Reset cooldown after delay
      Future.delayed(Duration(milliseconds: _alertCooldownMs), () {
        _alertCooldown.value = false;
      });
    } catch (e) {
      appLogger.e('Error creating alert via cloud function: $e');
      // Reset cooldown on error
      _alertCooldown.value = false;
    }
  }
}
