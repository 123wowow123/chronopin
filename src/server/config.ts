// Server configuration, read from the environment. Locally, Next.js and the
// scripts (via tsx + scripts/env.ts) load .env.local; in Kubernetes the values
// come from the env-file ConfigMap.

import * as shared from '@/lib/appConfig';

function env(name: string): string | undefined {
  const value = process.env[name];
  return value === '' ? undefined : value;
}

const domain = env('DOMAIN') || '';

if (!env('SESSION_SECRET') && env('NODE_ENV') === 'production' && env('NEXT_PHASE') !== 'phase-production-build') {
  console.warn(
    'SESSION_SECRET is not set: sessions are signed with the default secret, which is public in this repository. Set SESSION_SECRET.',
  );
}

export const config = {
  ...shared,

  host: env('HOST') || 'www.chronopin.com',
  env: env('NODE_ENV'),
  port: Number(env('PORT') || 9000),

  secrets: {
    // Tokens issued by the old Express server were signed with this default,
    // so it stays the fallback until SESSION_SECRET is set everywhere.
    session: env('SESSION_SECRET') || 'chronopin-node-secret',
  },

  // PostgreSQL with PostGIS. A standard connection URL; add ?sslmode=require
  // for a hosted database that needs TLS.
  database: {
    url: env('DATABASE_URL'),
    pool: {
      max: 10,
      idleTimeoutMillis: 10000,
    },
  },

  facebook: {
    clientID: env('FACEBOOK_ID') || 'id',
    clientSecret: env('FACEBOOK_SECRET') || 'secret',
    callbackURL: domain + '/auth/facebook/callback',
  },

  google: {
    clientID: env('GOOGLE_ID') || 'id',
    clientSecret: env('GOOGLE_SECRET') || 'secret',
    callbackURL: domain + '/auth/google/callback',
  },

  azureStorage: {
    connectionString: env('AZURE_STORAGE_CONNECTION_STRING') || '',
  },

  faiss: {
    serviceUrl: env('FAISS_URL'),
  },

  youtube: {
    apiKey: env('YOUTUBE_API_KEY'),
  },

  anthropic: {
    apiKey: env('ANTHROPIC_API_KEY') || '',
  },

  aws: {
    accessKeyId: env('AWS_ACCESS_KEY_ID'),
    secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
    region: env('AWS_REGION'),
    sns: {
      adminNewUserTopicArn: env('AWS_ADMIN_NEW_USER_TOPIC_ARN'),
    },
  },

  admin: {
    notification: {
      email: env('ADMIN_NOTIFICATION_EMAIL'),
    },
  },

  chromiumPath: env('CHROMIUM_PATH') || env('PUPPETEER_EXECUTABLE_PATH'),

  pagination: {
    pageSize: 25,
  },
};

export default config;
