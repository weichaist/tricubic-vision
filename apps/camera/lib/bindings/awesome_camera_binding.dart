import 'package:get/get.dart';
import '../controllers/sensor_controller.dart';
import '../controllers/background_upload_controller.dart';
import '../controllers/awesome_camera_controller.dart';

class AwesomeCameraBinding implements Bindings {
  @override
  void dependencies() {
    // Register SensorController first
    Get.put(SensorController());

    // Register BackgroundUploadController for video processing
    Get.put(BackgroundUploadController());
    Get.put(AwesomeCameraController());
  }
}
