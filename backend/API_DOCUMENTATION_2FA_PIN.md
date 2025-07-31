# PrimeTrust 2FA & Transfer PIN API Documentation

## Overview

This document describes the new Two-Factor Authentication (2FA) and Transfer PIN endpoints added to the PrimeTrust banking API. These features enhance security during user registration and login processes.

## Registration Flow

The new registration flow includes:
1. User Registration
2. Email Verification
3. **2FA Setup** (NEW)
4. **Transfer PIN Setup** (NEW)
5. Dashboard Access

## Authentication Endpoints

### 1. Two-Factor Authentication Setup

#### Initiate 2FA Setup
**POST** `/api/accounts/two-factor-initiate/`

Initiates 2FA setup by generating TOTP secret and QR code.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{}
```

**Response (200):**
```json
{
    "message": "2FA setup initiated successfully",
    "qr_uri": "otpauth://totp/PrimeTrust:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=PrimeTrust",
    "qr_code_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "secret": "JBSWY3DPEHPK3PXP",
    "backup_codes": ["ABC12345", "DEF67890", "GHI11111", ...]
}
```

#### Verify 2FA Setup
**POST** `/api/accounts/two-factor-verify/`

Verifies 2FA setup with TOTP code from authenticator app.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "code": "123456"
}
```

**Response (200):**
```json
{
    "message": "2FA setup completed successfully",
    "next_step": "transfer_pin_setup"
}
```

### 2. Transfer PIN Setup

#### Set Transfer PIN
**POST** `/api/accounts/transfer-pin-setup/`

Sets up 4-digit transfer PIN for transactions.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "pin": "1234",
    "confirm_pin": "1234"
}
```

**PIN Validation Rules:**
- Must be exactly 4 digits
- Cannot contain consecutive numbers (e.g., 1234, 5678)
- Cannot contain all identical digits (e.g., 1111, 2222)
- Cannot be common patterns (0000, 1111, etc.)

**Response (200):**
```json
{
    "message": "Transfer PIN set up successfully",
    "next_step": "dashboard",
    "registration_complete": true
}
```

### 3. Registration Status

#### Check Registration Status
**GET** `/api/accounts/registration-status/`

Checks the completion status of registration steps.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
    "email_verified": true,
    "two_factor_setup_completed": true,
    "transfer_pin_setup_completed": true,
    "registration_complete": true,
    "next_step": "dashboard"
}
```

## Login Flow with 2FA

### 1. Initial Login
**POST** `/api/accounts/login/`

**Request Body:**
```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

**Response (200) - 2FA Required:**
```json
{
    "requires_2fa": true,
    "temp_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "message": "Please enter your 2FA code to complete login"
}
```

**Response (200) - No 2FA:**
```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {...},
    "requires_2fa": false
}
```

### 2. 2FA Login Verification
**POST** `/api/accounts/two-factor-login-verify/`

**Headers:**
```
Authorization: Bearer <temp_token>
Content-Type: application/json
```

**Request Body (TOTP Code):**
```json
{
    "code": "123456"
}
```

**Request Body (Backup Code):**
```json
{
    "backup_code": "ABC12345"
}
```

**Response (200):**
```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {...},
    "requires_2fa": false
}
```

## Transaction Security

### 1. Transfer PIN Verification
**POST** `/api/accounts/transfer-pin-verify/`

Verifies transfer PIN before allowing transactions.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "pin": "1234"
}
```

**Response (200):**
```json
{
    "message": "PIN verified successfully"
}
```

**Response (400) - Invalid PIN:**
```json
{
    "error": "Invalid PIN. Please try again.",
    "failed_attempts": 1,
    "remaining_attempts": 2
}
```

**Response (400) - PIN Locked:**
```json
{
    "error": "PIN is temporarily locked due to multiple failed attempts. Please try again later."
}
```

## Security Features

### PIN Lockout
- After 3 failed PIN attempts, PIN is locked for 15 minutes
- Failed attempts are tracked per user
- Lockout status is checked before PIN verification

### Backup Codes
- 10 backup codes generated during 2FA setup
- Each code can only be used once
- Email notification sent when backup code is used
- Remaining codes count tracked

### Audit Logging
All security events are logged with:
- User information
- Event type and description
- IP address and user agent
- Timestamp
- Additional metadata

### Email Notifications
- 2FA enabled/disabled notifications
- Transfer PIN setup notifications
- Registration completion notifications
- Backup code usage alerts

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid request data or validation errors |
| 401 | Authentication required or invalid credentials |
| 403 | Permission denied |
| 404 | Resource not found |
| 429 | Too many requests (rate limiting) |
| 500 | Internal server error |

## Security Best Practices

1. **TOTP Codes**: 6-digit codes valid for 30 seconds
2. **PIN Validation**: Strict rules prevent common patterns
3. **Rate Limiting**: Implemented on all authentication endpoints
4. **Audit Trail**: Complete logging of all security events
5. **Email Notifications**: Immediate alerts for security events
6. **Session Management**: Proper token handling and refresh

## Integration Notes

### Frontend Integration
1. Check registration status on app load
2. Redirect to appropriate setup step if incomplete
3. Handle 2FA requirement during login
4. Implement QR code scanning for 2FA setup
5. Store backup codes securely (download/print)

### Mobile App Integration
1. Use authenticator apps (Google Authenticator, Authy, etc.)
2. Implement secure backup code storage
3. Handle offline scenarios gracefully
4. Provide clear error messages for failed attempts

## Testing

### Test Cases
1. Complete registration flow
2. 2FA setup with QR code scanning
3. PIN setup with validation rules
4. Login with 2FA requirement
5. Backup code usage
6. PIN verification for transactions
7. Lockout scenarios
8. Audit log verification

### Test Data
- Valid TOTP codes can be generated using the secret
- Test backup codes are provided in setup response
- PIN validation rules can be tested with various inputs 