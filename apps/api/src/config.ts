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

  // Supabase Cloud Infrastructure (Project: ggzbyynthvxwkpdbjklf)
  SUPABASE_PROJECT_ID: 'ggzbyynthvxwkpdbjklf',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://ggzbyynthvxwkpdbjklf.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.mock-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres.ggzbyynthvxwkpdbjklf:postgres@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  DIRECT_URL: process.env.DIRECT_URL || 'postgresql://postgres.ggzbyynthvxwkpdbjklf:postgres@db.ggzbyynthvxwkpdbjklf.supabase.co:5432/postgres',
};
