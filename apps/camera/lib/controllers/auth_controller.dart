import 'package:flutter_smart_dialog/flutter_smart_dialog.dart';
import 'package:get/get.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../config/app_config.dart';
import '../models/user.dart';
import '../utils/logger_util.dart';

class AuthController extends GetxController {
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;
  final Rx<User?> _firebaseUser = Rx<User?>(null);
  final Rx<SupabaseUser?> currentUser = Rx<SupabaseUser?>(null);

  // Public getters - only expose what's needed
  bool get isLoggedIn => _firebaseUser.value != null;
  String? get currentUserId => _firebaseUser.value?.uid;
  String? get currentUserEmail => _firebaseUser.value?.email;

  @override
  void onInit() {
    super.onInit();
    _firebaseUser.bindStream(_firebaseAuth.authStateChanges());

    // Listen to Firebase auth changes and update user model accordingly
    _firebaseUser.listen((User? user) {
      if (user != null) {
        _fetchCurrentUser();
      } else {
        currentUser.value = null;
      }
    });
  }

  // Fetch current user data from Supabase via cloud function
  Future<void> _fetchCurrentUser() async {
    try {
      final firebaseUser = _firebaseAuth.currentUser;
      if (firebaseUser == null) {
        currentUser.value = null;
        return;
      }
      SmartDialog.showLoading(msg: 'ユーザーデータの取得中...');
      // Call cloud function to fetch user data from Supabase
      final result = await FirebaseFunctions.instanceFor(
        region: AppConfig.functionsRegion,
      ).httpsCallable('fetchUserFromSupabase').call({
        'email': firebaseUser.email,
      });

      // Cast the response data to proper types
      final responseData = Map<String, dynamic>.from(result.data as Map);

      if (responseData['success'] && responseData['data'] != null) {
        // User exists in Supabase, create SupabaseUser from cloud function data
        final userData = Map<String, dynamic>.from(responseData['data'] as Map);
        currentUser.value = SupabaseUser.fromJson(userData);
        appLogger.i('Supabaseからユーザーを取得しました: ${currentUser.value?.firstName}');
      } else {
        // User doesn't exist in Supabase, throw error
        appLogger.e('User not found in Supabase: ${firebaseUser.email}');
        throw Exception('User not found in Supabase database');
      }
    } catch (e) {
      appLogger.e('Error fetching user: $e');
      SmartDialog.showNotify(
        msg: 'ユーザーデータの取得に失敗しました: ${e.toString()}',
        notifyType: NotifyType.error,
      );
    } finally {
      SmartDialog.dismiss();
    }
  }

  // Refresh user data
  Future<void> refreshUser() async {
    await _fetchCurrentUser();
  }

  // Login with email and password
  Future<void> login(String email, String password) async {
    try {
      // Firebase login
      final UserCredential firebaseResult = await _firebaseAuth
          .signInWithEmailAndPassword(email: email, password: password);

      if (firebaseResult.user != null) {
        appLogger.i('Firebase user: ${firebaseResult.user}');

        // Navigate to home (user data will be fetched automatically via listener)
        Get.offAllNamed('/');
      }
    } catch (e) {
      appLogger.e('Error during login: $e');
      Get.snackbar(
        'ログインエラー',
        'ログインに失敗しました: ${e.toString()}',
        snackPosition: SnackPosition.BOTTOM,
      );
    }
  }

  // Sign out
  Future<void> signOut() async {
    try {
      await _firebaseAuth.signOut();
      Get.offAllNamed('/');
    } catch (e) {
      appLogger.e('Error signing out: $e');
    }
  }
}
