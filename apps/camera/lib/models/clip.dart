import 'package:uuid/uuid.dart';

class Clip {
  final String uid;
  final DateTime createdAt;
  final String userUid;
  final String locationUid;
  final String? title;
  final int? length; // in seconds
  final String videoUrl;
  final String? thumbnailUrl;
  final String? companyUid;
  final String? recordingStopTimestamp;

  Clip({
    String? uid,
    DateTime? createdAt,
    required this.userUid,
    required this.locationUid,
    this.title,
    this.length,
    required this.videoUrl,
    this.thumbnailUrl,
    this.companyUid,
    this.recordingStopTimestamp,
  }) : uid = uid ?? const Uuid().v4(),
       createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'user_uid': userUid,
      'location_uid': locationUid,
      'company_uid': companyUid,
      'title': title,
      'length': length,
      'video_url': videoUrl,
      'thumbnail_url': thumbnailUrl,
      'recording_stop_timestamp': recordingStopTimestamp,
    };
  }

  factory Clip.fromMap(Map<String, dynamic> map) {
    return Clip(
      uid: map['uid'],
      createdAt:
          map['created_at'] != null
              ? DateTime.parse(map['created_at'])
              : DateTime.now(),
      userUid: map['user_uid'],
      locationUid: map['location_uid'],
      companyUid: map['company_uid'],
      title: map['title'],
      length: map['length'],
      videoUrl: map['video_url'],
      thumbnailUrl: map['thumbnail_url'],
      recordingStopTimestamp: map['recording_stop_timestamp'],
    );
  }
}
