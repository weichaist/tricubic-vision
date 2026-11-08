class SupabaseUser {
  final String uid;
  final String companyUid;
  final String locationUid;
  final String? email;
  final String? firstName;
  final String? lastName;
  final String role;
  final String? createdAt;

  SupabaseUser({
    required this.uid,
    required this.companyUid,
    required this.locationUid,
    this.email,
    this.firstName,
    this.lastName,
    this.role = 'appUser',
    this.createdAt,
  });

  String get fullName => '${firstName ?? ''} ${lastName ?? ''}'.trim();

  factory SupabaseUser.fromJson(Map<String, dynamic> json) {
    return SupabaseUser(
      uid: json['uid'] ?? '',
      companyUid: json['company_uid'] ?? '',
      locationUid: json['location_uid'] ?? '',
      email: json['email'],
      firstName: json['first_name'],
      lastName: json['last_name'],
      role: json['role'] ?? 'appUser',
      createdAt: json['created_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'uid': uid,
      'company_uid': companyUid,
      'location_uid': locationUid,
      'email': email,
      'first_name': firstName,
      'last_name': lastName,
      'role': role,
      'created_at': createdAt,
    };
  }

  SupabaseUser copyWith({
    String? uid,
    String? companyUid,
    String? locationUid,
    String? email,
    String? firstName,
    String? lastName,
    String? role,
    String? createdAt,
  }) {
    return SupabaseUser(
      uid: uid ?? this.uid,
      companyUid: companyUid ?? this.companyUid,
      locationUid: locationUid ?? this.locationUid,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      role: role ?? this.role,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
