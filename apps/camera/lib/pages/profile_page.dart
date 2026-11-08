import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/auth_controller.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    final AuthController authController = Get.find<AuthController>();

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: const Text('プロフィール'),
      ),
      body: Obx(() {
        final currentUser = authController.currentUser.value;

        if (currentUser == null) {
          return const Center(child: CircularProgressIndicator());
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Center(
                child: CircleAvatar(
                  radius: 50,
                  backgroundColor: Colors.amber,
                  child: Icon(Icons.person, size: 60, color: Colors.white),
                ),
              ),
              const SizedBox(height: 32),
              _buildSection(
                title: '名前',
                child: Text(
                  currentUser.fullName.isNotEmpty
                      ? currentUser.fullName
                      : '未設定',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              _buildSection(
                title: 'メールアドレス',
                child: Text(
                  currentUser.email ?? '未設定',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              _buildSection(
                title: '役職',
                child: Text(
                  _getRoleDisplayName(currentUser.role),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              _buildSection(
                title: '会社ID',
                child: Text(
                  currentUser.companyUid,
                  style: const TextStyle(fontSize: 14, fontFamily: 'monospace'),
                ),
              ),
              const SizedBox(height: 24),
              _buildSection(
                title: '営業所ID',
                child: Text(
                  currentUser.locationUid,
                  style: const TextStyle(fontSize: 14, fontFamily: 'monospace'),
                ),
              ),
              const SizedBox(height: 24),
              _buildSection(
                title: 'ユーザーID',
                child: Text(
                  currentUser.uid,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    fontFamily: 'monospace',
                    color: Colors.grey,
                  ),
                ),
              ),
              if (currentUser.createdAt != null) ...[
                const SizedBox(height: 24),
                _buildSection(
                  title: '作成日',
                  child: Text(
                    _formatDate(currentUser.createdAt!),
                    style: const TextStyle(fontSize: 14, color: Colors.grey),
                  ),
                ),
              ],
              const SizedBox(height: 32),
              Center(
                child: ElevatedButton.icon(
                  onPressed: () {
                    authController.refreshUser();
                    Get.snackbar(
                      '更新',
                      'ユーザー情報を更新しました',
                      snackPosition: SnackPosition.BOTTOM,
                    );
                  },
                  icon: const Icon(Icons.refresh),
                  label: const Text('情報を更新'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 12,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildSection({required String title, required Widget child}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey[600],
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Card(
          elevation: 2,
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: SizedBox(width: double.infinity, child: child),
          ),
        ),
      ],
    );
  }

  String _getRoleDisplayName(String role) {
    switch (role) {
      case 'admin':
        return '管理者';
      case 'manager':
        return 'マネージャー';
      case 'appUser':
        return 'ユーザー';
      default:
        return role;
    }
  }

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return '${date.year}年${date.month}月${date.day}日';
    } catch (e) {
      return dateString;
    }
  }
}
