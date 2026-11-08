import 'package:logger/logger.dart';

/// A utility class for logging throughout the application
/// Provides a consistent logger configuration
class LoggerUtil {
  /// Singleton instance
  static final LoggerUtil _instance = LoggerUtil._internal();
  
  /// Factory constructor to return the singleton instance
  factory LoggerUtil() => _instance;
  
  /// Private constructor for singleton pattern
  LoggerUtil._internal();
  
  /// The logger instance with a pretty printer configuration
  final logger = Logger(
    printer: PrettyPrinter(
      methodCount: 0,
      errorMethodCount: 8,
      lineLength: 120,
      colors: true,
      printEmojis: true,
      dateTimeFormat: DateTimeFormat.onlyTimeAndSinceStart,
    ),
  );
  
  /// Get the logger instance
  Logger get log => logger;
}

/// A convenience getter to access the logger throughout the app
/// Usage: appLogger.d('Debug message');
final appLogger = LoggerUtil().log;
