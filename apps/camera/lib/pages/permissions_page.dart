import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:permission_handler/permission_handler.dart';
import '../utils/logger_util.dart';

class PermissionsPage extends StatefulWidget {
  const PermissionsPage({super.key});

  @override
  State<PermissionsPage> createState() => _PermissionsPageState();
}

class _PermissionsPageState extends State<PermissionsPage> {
  final Map<Permission, PermissionStatus> _permissionStatus = {
    Permission.camera: PermissionStatus.denied,
    Permission.microphone: PermissionStatus.denied,
    Permission.accessMediaLocation: PermissionStatus.denied,
  };

  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _checkPermissions();
  }

  Future<void> _checkPermissions() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Check current status of permissions
      final cameraStatus = await Permission.camera.status;
      final microphoneStatus = await Permission.microphone.status;
      final storageStatus = await Permission.accessMediaLocation.status;

      setState(() {
        _permissionStatus[Permission.camera] = cameraStatus;
        _permissionStatus[Permission.microphone] = microphoneStatus;
        _permissionStatus[Permission.accessMediaLocation] = storageStatus;
        _isLoading = false;
      });

      // If all permissions are granted, navigate to camera page
      if (_allPermissionsGranted()) {
        _navigateToCameraPage();
      }
    } catch (e) {
      appLogger.e('Error checking permissions: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  bool _allPermissionsGranted() {
    return _permissionStatus.values.every((status) => status.isGranted);
  }

  Future<void> _requestPermission(Permission permission) async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Request a single permission at a time
      final status = await permission.request();

      setState(() {
        _permissionStatus[permission] = status;
        _isLoading = false;
      });

      // If all permissions are granted, navigate to camera page
      if (_allPermissionsGranted()) {
        _navigateToCameraPage();
      }
    } catch (e) {
      appLogger.e('Error requesting permission: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _navigateToCameraPage() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Get.offAndToNamed('/camera');
    });
  }

  String _getPermissionText(Permission permission) {
    switch (permission) {
      case Permission.camera:
        return 'カメラ';
      case Permission.microphone:
        return 'マイク';
      case Permission.accessMediaLocation:
        return 'メディア';
      default:
        return '不明';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('必要な権限')),
      body:
          _isLoading
              ? const Center(child: CircularProgressIndicator())
              : Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'アプリが正常に機能するには以下の権限が必要です：',
                      style: TextStyle(fontSize: 16),
                    ),
                    const SizedBox(height: 24),
                    ..._permissionStatus.entries.map((entry) {
                      final permission = entry.key;
                      final status = entry.value;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16.0),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _getPermissionText(permission),
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '状態: ${status.isGranted ? '許可済み' : '未許可'}',
                                    style: TextStyle(
                                      color:
                                          status.isGranted
                                              ? Colors.green
                                              : Colors.red,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            ElevatedButton(
                              onPressed:
                                  status.isGranted
                                      ? null
                                      : () => _requestPermission(permission),
                              child: Text(status.isGranted ? '許可済み' : '許可する'),
                            ),
                          ],
                        ),
                      );
                    }),
                    const Spacer(),
                    if (_allPermissionsGranted())
                      Center(
                        child: ElevatedButton(
                          onPressed: _navigateToCameraPage,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 32,
                              vertical: 12,
                            ),
                          ),
                          child: const Text(
                            'カメラへ進む',
                            style: TextStyle(fontSize: 16),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
    );
  }
}
