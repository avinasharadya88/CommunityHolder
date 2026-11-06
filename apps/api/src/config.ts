export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'communityholder-super-secret-jwt-key-2026',
  JWT_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '30d',
  OTP_TTL_MS: 300 * 1000, // 5 minutes
  OTP_LOCKOUT_MS: 30 * 60 * 1000, // 30 minutes
  MAX_OTP_ATTEMPTS: 5,
  MAX_OTP_REQUESTS_WINDOW_MS: 60 * 1000, // 1 minute throttle
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  SUPPORTED_COUNTRY_CODES: ['+91', '+1', '+44', '+971', '+65', '+61', '+49', '+33', '+81'],
};
