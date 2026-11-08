import 'package:get/get.dart';
import 'sensor_controller.dart';

/// Controller for the AwesomeCameraPage that handles camera operations and uploads
class AwesomeCameraController extends GetxController {
  // Reference to the SensorController
  late SensorController sensorController;

  // Recording state
  final RxInt recordingDurationSeconds = 0.obs;
  final RxInt currentSegment = 1.obs;
  final RxBool isUploading = false.obs;
  final RxList<String> segmentPaths = <String>[].obs;

  @override
  void onInit() {
    super.onInit();
    // Get reference to the SensorController
    sensorController = Get.find<SensorController>();
  }



  /// Add a video segment path to the list
  void addSegmentPath(String path) {
    segmentPaths.add(path);
  }

  /// Reset segment paths
  void resetSegmentPaths() {
    segmentPaths.clear();
  }

  /// Increment segment counter
  void incrementSegment() {
    currentSegment.value++;
  }

  /// Reset segment counter
  void resetSegment() {
    currentSegment.value = 1;
  }
}
