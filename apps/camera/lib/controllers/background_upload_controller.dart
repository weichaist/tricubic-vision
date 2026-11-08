import 'dart:async';
import 'dart:io';
import 'package:get/get.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:path/path.dart' as path;
import 'package:path_provider/path_provider.dart';
import 'package:video_compress/video_compress.dart';
import '../models/clip.dart';
import '../controllers/auth_controller.dart';
import '../utils/logger_util.dart';

class BackgroundUploadController extends GetxController {
  static BackgroundUploadController get to =>
      Get.find<BackgroundUploadController>();

  final FirebaseStorage _firebaseStorage = FirebaseStorage.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Queue of pending uploads
  final RxList<Map<String, dynamic>> uploadQueue = <Map<String, dynamic>>[].obs;

  // Status flags
  final RxBool isUploading = false.obs;
  final RxBool isRecordingSegment = false.obs;
  final RxInt uploadProgress = 0.obs;

  // Timer for automatic clip segmentation
  Timer? _segmentTimer;

  // Lazy getter for AuthController to avoid circular dependency
  AuthController get _authController => Get.find<AuthController>();

  // Initialize the service
  @override
  void onInit() {
    super.onInit();
    appLogger.i('BackgroundUploadController initialized');
  }

  @override
  void onClose() {
    super.onClose();
    appLogger.i('BackgroundUploadController closed');
  }

  // Start automatic clip segmentation (1-minute segments)
  void startAutoSegmentation(Function(String) onSegmentSaved) async {
    if (isRecordingSegment.value) return;

    isRecordingSegment.value = true;

    // Cancel any existing timer
    _segmentTimer?.cancel();

    // Create a new timer that fires every 60 seconds
    _segmentTimer = Timer.periodic(const Duration(minutes: 1), (timer) {
      // This callback will be called every minute
      onSegmentSaved(
        'auto_segment_${DateTime.now().millisecondsSinceEpoch}.mp4',
      );
    });
  }

  // Stop automatic clip segmentation
  void stopAutoSegmentation() {
    _segmentTimer?.cancel();
    _segmentTimer = null;
    isRecordingSegment.value = false;
  }

  // Add a video to the upload queue
  void addToUploadQueue(String videoPath, {String? title}) {
    if (videoPath.isEmpty) return;

    final timestamp = DateTime.now().toUtc().toIso8601String();
    uploadQueue.add({
      'path': videoPath,
      'title': title ?? 'Recording $timestamp',
      'timestamp': timestamp,
    });

    // Start processing the queue if not already uploading
    if (!isUploading.value) {
      _processUploadQueue();
    }
  }

  // Process the upload queue in the background
  Future<void> _processUploadQueue() async {
    if (uploadQueue.isEmpty || isUploading.value) return;

    isUploading.value = true;
    uploadProgress.value = 0;

    try {
      while (uploadQueue.isNotEmpty) {
        final item = uploadQueue.first;
        final videoPath = item['path'] as String;
        final title = item['title'] as String;
        final timestamp = item['timestamp'] as String;

        // Check if file exists
        final videoFile = File(videoPath);
        if (!await videoFile.exists()) {
          uploadQueue.removeAt(0);
          continue;
        }

        // Upload the file
        await _uploadClip(videoFile, title, timestamp);

        // Remove from queue after successful upload
        uploadQueue.removeAt(0);

        // Delete the local file to save storage space
        try {
          if (await videoFile.exists()) {
            await videoFile.delete();
            appLogger.i(
              'Deleted local video file after successful upload: ${videoFile.path}',
            );
          }
        } catch (e) {
          appLogger.e('Error deleting local video file: $e');
        }
      }
    } finally {
      isUploading.value = false;
      uploadProgress.value = 0;
    }
  }

  // Upload a clip to Firebase Storage and save metadata to Firestore
  Future<Clip?> _uploadClip(
    File videoFile,
    String title,
    String recordingStopTimestamp,
  ) async {
    try {
      // Check if AuthController is registered before accessing it
      if (!Get.isRegistered<AuthController>()) {
        appLogger.w('AuthController not available, skipping upload');
        return null;
      }

      if (_authController.currentUser.value == null) {
        throw Exception('User not logged in');
      }

      final userUid = _authController.currentUser.value!.uid;
      final locationUid = _authController.currentUser.value!.locationUid;
      final companyUid = _authController.currentUser.value!.companyUid;

      // Generate a unique filename with timestamp
      final timestamp = DateTime.now().millisecondsSinceEpoch.toString();

      // Create proper filenames without .temp extension
      String videoExtension = path.extension(videoFile.path);
      // Replace .temp extension with .mp4 if present
      if (videoExtension.toLowerCase().endsWith('.temp')) {
        videoExtension = '.mp4';
      } else if (videoExtension.isEmpty) {
        videoExtension = '.mp4'; // Default to .mp4 if no extension
      }

      final videoFileName = 'video_$timestamp$videoExtension';
      final thumbnailFileName = 'thumbnail_$timestamp.jpg';

      // Skip compression, just generate thumbnail

      // Generate thumbnail using a more reliable approach
      appLogger.i('Generating thumbnail');
      final thumbnailFile = await _generateThumbnail(videoFile.path);

      if (thumbnailFile == null) {
        appLogger.w('Failed to generate thumbnail, continuing without it');
      }

      // Upload original video to Firebase Storage
      final videoStorageRef = _firebaseStorage.ref().child(
        'clips/$userUid/$videoFileName',
      );
      final videoUploadTask = videoStorageRef.putFile(videoFile);

      // Show upload progress
      videoUploadTask.snapshotEvents.listen((TaskSnapshot snapshot) {
        final progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        // Second half of progress is upload (50-100%)
        uploadProgress.value = 50 + (progress ~/ 2);
        appLogger.i('Video upload progress: $progress%');
      });

      // Wait for video upload to complete
      await videoUploadTask.whenComplete(
        () => appLogger.i('Video upload complete'),
      );

      // Get video download URL
      final videoDownloadUrl = await videoStorageRef.getDownloadURL();
      String? thumbnailDownloadUrl;

      // Upload thumbnail if available
      if (thumbnailFile != null) {
        final thumbnailStorageRef = _firebaseStorage.ref().child(
          'thumbnails/$userUid/$thumbnailFileName',
        );
        await thumbnailStorageRef.putFile(thumbnailFile);
        thumbnailDownloadUrl = await thumbnailStorageRef.getDownloadURL();
        appLogger.i('Thumbnail upload complete');
      }

      // We don't have video duration from MediaInfo since we're not compressing
      // Use file size in bytes as a placeholder for length
      final videoDuration = videoFile.lengthSync();

      // Create clip object
      final clip = Clip(
        userUid: userUid,
        recordingStopTimestamp: recordingStopTimestamp,
        length: videoDuration,
        locationUid: locationUid,
        companyUid: companyUid,
        title: title,
        videoUrl: videoDownloadUrl,
        thumbnailUrl: thumbnailDownloadUrl,
      );

      // Save to Firestore first to trigger the cloud function
      appLogger.i('Saving clip to Firestore');
      await _firestore.collection('clips').add({
        ...clip.toMap(),
        'created_at': FieldValue.serverTimestamp(),
      });

      // Clean up any temporary files
      try {
        if (thumbnailFile != null && await thumbnailFile.exists()) {
          await thumbnailFile.delete();
        }
      } catch (e) {
        appLogger.w('Error cleaning up temporary files: $e');
      }

      return clip;
    } catch (e) {
      appLogger.e('Error uploading clip: $e');
      return null;
    }
  }

  // Generate a thumbnail from a video file
  Future<File?> _generateThumbnail(String videoPath) async {
    try {
      appLogger.i('Generating thumbnail for video: $videoPath');

      // Use video_compress to generate a thumbnail
      // We'll use getByteThumbnail instead of getFileThumbnail to avoid the error
      final thumbnailBytes = await VideoCompress.getByteThumbnail(
        videoPath,
        quality: 100, // Medium quality is sufficient for thumbnails
        position: -1, // Default position (middle of video)
      );

      if (thumbnailBytes == null) {
        appLogger.w('Failed to generate thumbnail bytes');
        return null;
      }

      // Create a temporary directory to store the thumbnail
      final tempDir = await getTemporaryDirectory();
      final thumbnailPath =
          '${tempDir.path}/thumbnail_${DateTime.now().millisecondsSinceEpoch}.jpg';

      // Create a file and write the thumbnail bytes
      final thumbnailFile = File(thumbnailPath);
      await thumbnailFile.writeAsBytes(thumbnailBytes);

      appLogger.i('Thumbnail generated at: $thumbnailPath');
      return thumbnailFile;
    } catch (e) {
      appLogger.e('Error generating thumbnail: $e');
      return null;
    }
  }
}
