import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/walking_direction_controller.dart';

class WalkingDirectionTestPage extends StatelessWidget {
  const WalkingDirectionTestPage({super.key});

  @override
  Widget build(BuildContext context) {
    // Initialize the controller
    final WalkingDirectionController controller = Get.put(
      WalkingDirectionController(),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Forward/Backward Detection Test'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              // Phone orientation status
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      const Text(
                        'Phone Orientation',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Obx(
                        () => Text(
                          controller.phoneOrientation.value,
                          style: TextStyle(
                            fontSize: 24,
                            color:
                                (controller.phoneOrientation.value ==
                                            'Landscape Selfie' ||
                                        controller.phoneOrientation.value ==
                                            'Portrait Selfie')
                                    ? Colors.green
                                    : Colors.orange,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Obx(
                        () => Icon(
                          controller.isLandscape.value
                              ? Icons.phone_android
                              : Icons.stay_current_portrait,
                          size: 48,
                          color:
                              (controller.phoneOrientation.value ==
                                          'Landscape Selfie' ||
                                      controller.phoneOrientation.value ==
                                          'Portrait Selfie')
                                  ? Colors.green
                                  : Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Hold phone with screen facing you\n(rear camera pointing forward)',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Direction display
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    children: [
                      const Text(
                        'Movement Direction',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Obx(() {
                        IconData directionIcon;
                        Color directionColor;

                        switch (controller.walkingDirection.value) {
                          case 'Forward':
                            directionIcon = Icons.arrow_upward;
                            directionColor = Colors.green;
                            break;
                          case 'Backward':
                            directionIcon = Icons.arrow_downward;
                            directionColor = Colors.red;
                            break;
                          case 'Minimal Movement':
                            directionIcon = Icons.remove;
                            directionColor = Colors.orange;
                            break;
                          case 'Hold Phone in Selfie Position':
                            directionIcon = Icons.phone_android;
                            directionColor = Colors.orange;
                            break;
                          default:
                            directionIcon = Icons.accessibility_new;
                            directionColor = Colors.grey;
                        }

                        return Column(
                          children: [
                            Icon(
                              directionIcon,
                              size: 80,
                              color: directionColor,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              controller.walkingDirection.value,
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: directionColor,
                              ),
                            ),
                          ],
                        );
                      }),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Motion status
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      const Text(
                        'Motion Status',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Obx(
                        () => Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              controller.isWalking.value
                                  ? Icons.directions_walk
                                  : Icons.accessibility_new,
                              size: 32,
                              color:
                                  controller.isWalking.value
                                      ? Colors.green
                                      : Colors.grey,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              controller.isWalking.value
                                  ? 'Walking'
                                  : 'Stationary',
                              style: TextStyle(
                                fontSize: 20,
                                color:
                                    controller.isWalking.value
                                        ? Colors.green
                                        : Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Obx(
                        () => Text(
                          'Motion Magnitude: ${controller.motionMagnitude.value.toStringAsFixed(2)} m/s²',
                          style: const TextStyle(fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Forward/Backward acceleration focus
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      const Text(
                        'Forward/Backward Acceleration (Z-axis)',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Obx(() {
                        final accelValue =
                            controller.forwardBackwardAcceleration.value;
                        return Column(
                          children: [
                            // Visual indicator
                            Container(
                              height: 40,
                              decoration: BoxDecoration(
                                border: Border.all(color: Colors.grey),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Stack(
                                children: [
                                  // Center line
                                  Positioned(
                                    left: 0,
                                    right: 0,
                                    child: Center(
                                      child: Container(
                                        width: 2,
                                        height: 40,
                                        color: Colors.grey[400],
                                      ),
                                    ),
                                  ),
                                  // Indicator
                                  AnimatedAlign(
                                    duration: const Duration(milliseconds: 100),
                                    alignment: Alignment(
                                      accelValue.clamp(-2, 2) /
                                          2, // Normalize to -1 to 1
                                      0,
                                    ),
                                    child: Container(
                                      width: 20,
                                      height: 20,
                                      margin: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color:
                                            accelValue > 0.3
                                                ? Colors.green
                                                : accelValue < -0.3
                                                ? Colors.red
                                                : Colors.orange,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: const [
                                Text(
                                  '← Backward',
                                  style: TextStyle(fontSize: 12),
                                ),
                                Text(
                                  'Forward →',
                                  style: TextStyle(fontSize: 12),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              '${accelValue.toStringAsFixed(2)} m/s²',
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Z-axis always detects forward/backward\nwhen screen faces you',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.blue[700],
                                fontWeight: FontWeight.w500,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        );
                      }),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Sensor data
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      const Text(
                        'All Acceleration Data',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Obx(
                        () => Column(
                          children: [
                            _buildAxisRow(
                              'X',
                              controller.userAcceleration.value.x,
                              Colors.red,
                              controller.isLandscape.value
                                  ? 'Up/Down'
                                  : 'Left/Right',
                            ),
                            const SizedBox(height: 8),
                            _buildAxisRow(
                              'Y',
                              controller.userAcceleration.value.y,
                              Colors.green,
                              controller.isLandscape.value
                                  ? 'Left/Right'
                                  : 'Up/Down',
                            ),
                            const SizedBox(height: 8),
                            _buildAxisRow(
                              'Z',
                              controller.userAcceleration.value.z,
                              Colors.blue,
                              'Forward/Back',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Reset button
              ElevatedButton.icon(
                onPressed: () => controller.resetCalibration(),
                icon: const Icon(Icons.refresh),
                label: const Text('Reset Calibration'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAxisRow(
    String axis,
    double value,
    Color color,
    String description,
  ) {
    return Row(
      children: [
        Container(
          width: 30,
          alignment: Alignment.center,
          child: Text(
            axis,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          description,
          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: LinearProgressIndicator(
            value: (value.clamp(-10, 10) + 10) / 20, // Normalize to 0-1
            backgroundColor: Colors.grey[300],
            valueColor: AlwaysStoppedAnimation<Color>(color),
            minHeight: 10,
          ),
        ),
        const SizedBox(width: 16),
        SizedBox(
          width: 80,
          child: Text(
            value.toStringAsFixed(2),
            textAlign: TextAlign.right,
            style: const TextStyle(fontSize: 14),
          ),
        ),
      ],
    );
  }
}
