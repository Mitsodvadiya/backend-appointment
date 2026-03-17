import { config } from 'dotenv';
config();

export const env = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret',
  msg91AuthKey: process.env.MSG91_AUTH_KEY || '',
  msg91TemplateId: process.env.MSG91_TEMPLATE_ID || '',
};
