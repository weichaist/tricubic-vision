/// App settings read at compile time from --dart-define-from-file.
///
/// See config/example.json for the full list of keys.
class AppConfig {
  AppConfig._();

  /// Region the Cloud Functions are deployed to. Must match the region set in
  /// functions/config.js.
  static const String functionsRegion = String.fromEnvironment(
    'FIREBASE_FUNCTIONS_REGION',
    defaultValue: 'asia-northeast1',
  );

  /// UID of the rule (in the Supabase `rules` table) that sudden-motion alerts
  /// from the accelerometer are filed under. Leave empty to file them without
  /// a rule.
  static const String accelerationAlertRuleUid = String.fromEnvironment(
    'ACCELERATION_ALERT_RULE_UID',
  );

  /// [accelerationAlertRuleUid], or null when it is not set.
  static String? get accelerationAlertRuleUidOrNull =>
      accelerationAlertRuleUid.isEmpty ? null : accelerationAlertRuleUid;
}
