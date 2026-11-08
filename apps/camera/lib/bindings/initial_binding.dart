import 'package:get/get.dart';
import '../controllers/auth_controller.dart';

class InitialBinding implements Bindings {
  @override
  void dependencies() {
    // Controllers
    Get.put(AuthController());
  }
}
