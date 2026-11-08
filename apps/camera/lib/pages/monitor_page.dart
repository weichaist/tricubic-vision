import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase;
import '../controllers/auth_controller.dart';
import '../utils/logger_util.dart';

class MonitorPage extends StatelessWidget {
  const MonitorPage({super.key});

  @override
  Widget build(BuildContext context) {
    final AuthController authController = Get.find<AuthController>();
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        toolbarHeight: 100,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Obx(
              () => Text(
                '${authController.currentUser.value?.lastName ?? ''} ${authController.currentUser.value?.firstName ?? ''}',
                style: const TextStyle(fontWeight: FontWeight.normal),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Tricubic Visionはフォークリフト\nの安全運転を見守ります。',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => _showLogoutConfirmDialog(authController),
            tooltip: 'ログアウト',
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(27.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 240,
                  childAspectRatio: 1,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                ),
                itemCount: 3,
                itemBuilder: (context, index) {
                  switch (index) {
                    case 0:
                      return _buildStatusCard(
                        context,
                        '探知開始',
                        Icons.play_circle_outline,
                        Colors.green,
                        onTap: () async {
                          if (await _checkAuthentication()) {
                            // Navigate to permissions page first
                            Get.toNamed('/permissions');
                          }
                        },
                      );
                    case 1:
                      return _buildStatusCard(
                        context,
                        'プロフィール',
                        Icons.person,
                        Colors.amber,
                        onTap: () async {
                          if (await _checkAuthentication()) {
                            Get.toNamed('/profile');
                          }
                        },
                      );
                    case 2:
                      return _buildStatusCard(
                        context,
                        '前後移動検出',
                        Icons.explore,
                        Colors.blue,
                        onTap: () async {
                          if (await _checkAuthentication()) {
                            Get.toNamed('/walking-test');
                          }
                        },
                      );
                    default:
                      return const SizedBox.shrink();
                  }
                },
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          // Check authentication before refreshing data
          if (await _checkAuthentication()) {
            Get.snackbar(
              '更新',
              'データを更新中...',
              snackPosition: SnackPosition.BOTTOM,
            );
          }
        },
        tooltip: '更新',
        child: const Icon(Icons.refresh),
      ),
    );
  }

  // Check if Firebase has authenticated user
  Future<bool> _checkAuthentication() async {
    try {
      // Check Firebase authentication
      final firebaseUser = firebase.FirebaseAuth.instance.currentUser;

      appLogger.d('Auth check - Firebase: ${firebaseUser != null}');

      if (firebaseUser == null) {
        Get.snackbar(
          '認証エラー',
          'Firebase の認証情報が見つかりません。再ログインしてください。',
          snackPosition: SnackPosition.BOTTOM,
          duration: const Duration(seconds: 5),
        );

        // Redirect to login if authentication is missing
        await Future.delayed(const Duration(seconds: 1));
        Get.offAllNamed('/login');
        return false;
      }

      return true;
    } catch (e) {
      appLogger.e('Error checking authentication: $e');
      Get.snackbar(
        'エラー',
        '認証状態の確認中にエラーが発生しました',
        snackPosition: SnackPosition.BOTTOM,
      );
      return false;
    }
  }

  // Show logout confirmation dialog
  void _showLogoutConfirmDialog(AuthController authController) {
    Get.dialog(
      AlertDialog(
        title: const Text('ログアウトの確認'),
        content: const Text('ログアウトしてもよろしいですか？'),
        actions: [
          TextButton(onPressed: () => Get.back(), child: const Text('キャンセル')),
          TextButton(
            onPressed: () {
              Get.back(); // Close the dialog first
              authController.signOut();
            },
            child: const Text('ログアウト'),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard(
    BuildContext context,
    String title,
    IconData icon,
    Color color, {
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap:
          onTap ??
          () {
            // Default behavior if no specific onTap is provided
            Get.snackbar(
              title,
              '$title が選択されました',
              snackPosition: SnackPosition.BOTTOM,
            );
          },
      child: Card(
        elevation: 4,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 45, color: color),
              const SizedBox(height: 12),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
