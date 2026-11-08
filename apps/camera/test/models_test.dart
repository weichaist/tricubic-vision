import 'package:flutter_test/flutter_test.dart';
import 'package:tricubic_vision_camera/config/app_config.dart';
import 'package:tricubic_vision_camera/models/clip.dart';
import 'package:tricubic_vision_camera/models/user.dart';

void main() {
  group('SupabaseUser', () {
    test('round-trips through JSON', () {
      final json = {
        'uid': '11111111-1111-4111-8111-111111111111',
        'company_uid': '22222222-2222-4222-8222-222222222222',
        'location_uid': '33333333-3333-4333-8333-333333333333',
        'email': 'driver@example.com',
        'first_name': '太郎',
        'last_name': '山田',
        'role': 'manager',
        'created_at': '2025-04-01T09:00:00Z',
      };

      final user = SupabaseUser.fromJson(json);

      expect(user.fullName, '太郎 山田');
      expect(user.role, 'manager');
      expect(user.toJson(), json);
    });

    test('defaults the role to appUser', () {
      final user = SupabaseUser.fromJson({
        'uid': 'u',
        'company_uid': 'c',
        'location_uid': 'l',
      });

      expect(user.role, 'appUser');
      expect(user.fullName, isEmpty);
    });
  });

  group('Clip', () {
    test('keeps its fields through toMap/fromMap', () {
      final clip = Clip(
        userUid: 'user-1',
        locationUid: 'location-1',
        companyUid: 'company-1',
        title: 'TricubicVision_20250401_0900_seg01',
        length: 1024,
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        recordingStopTimestamp: '2025-04-01T00:01:00.000Z',
      );

      final map = clip.toMap()..['created_at'] = '2025-04-01T00:01:05.000Z';
      final restored = Clip.fromMap(map);

      expect(restored.uid, clip.uid);
      expect(restored.userUid, 'user-1');
      expect(restored.locationUid, 'location-1');
      expect(restored.companyUid, 'company-1');
      expect(restored.title, clip.title);
      expect(restored.length, 1024);
      expect(restored.videoUrl, clip.videoUrl);
      expect(restored.thumbnailUrl, clip.thumbnailUrl);
      expect(restored.recordingStopTimestamp, clip.recordingStopTimestamp);
      expect(restored.createdAt, DateTime.parse('2025-04-01T00:01:05.000Z'));
    });

    test('generates a UUID when none is given', () {
      final a = Clip(userUid: 'u', locationUid: 'l', videoUrl: 'v');
      final b = Clip(userUid: 'u', locationUid: 'l', videoUrl: 'v');

      expect(a.uid, isNot(b.uid));
      expect(a.uid, matches(RegExp(r'^[0-9a-f-]{36}$')));
    });
  });

  group('AppConfig', () {
    test('falls back to defaults without --dart-define', () {
      expect(AppConfig.functionsRegion, 'asia-northeast1');
      expect(AppConfig.accelerationAlertRuleUidOrNull, isNull);
    });
  });
}
