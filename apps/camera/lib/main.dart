import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'firebase_options.dart';
import 'package:flutter_smart_dialog/flutter_smart_dialog.dart';
// Pages
import 'pages/login_page.dart';
import 'pages/monitor_page.dart';
import 'pages/awesome_camera_page.dart';
import 'pages/permissions_page.dart';
import 'pages/profile_page.dart';
import 'pages/walking_direction_test_page.dart';

// Bindings
import 'bindings/initial_binding.dart';
import 'bindings/awesome_camera_binding.dart';

// Controllers
import 'controllers/auth_controller.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // Firebase is initialized with default settings

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      title: 'Tricubic Vision',
      debugShowCheckedModeBanner: false,
      navigatorObservers: [FlutterSmartDialog.observer],
      builder: FlutterSmartDialog.init(),
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.amber),
        textTheme: GoogleFonts.notoSansJpTextTheme(),
        useMaterial3: true,
      ),
      initialBinding: InitialBinding(),
      initialRoute: '/',
      getPages: [
        GetPage(name: '/', page: () => const RootPage()),
        GetPage(name: '/login', page: () => const LoginPage()),
        GetPage(name: '/monitor', page: () => const MonitorPage()),
        GetPage(name: '/profile', page: () => const ProfilePage()),
        GetPage(name: '/permissions', page: () => const PermissionsPage()),
        GetPage(
          name: '/camera',
          binding: AwesomeCameraBinding(),
          page: () => const AwesomeCameraPage(),
        ),
        GetPage(
          name: '/walking-test',
          page: () => const WalkingDirectionTestPage(),
        ),
      ],
      home: const RootPage(),
    );
  }
}

class RootPage extends StatelessWidget {
  const RootPage({super.key});

  @override
  Widget build(BuildContext context) {
    // Use GetX to access the auth controller
    final AuthController authController = Get.find<AuthController>();

    return Obx(() {
      // Check if user is logged in using the clean interface
      if (authController.isLoggedIn) {
        return const MonitorPage();
      } else {
        return const LoginPage();
      }
    });
  }
}
