// Server configuration, read from the environment. Locally, Next.js and the
// scripts (via tsx + scripts/env.ts) load .env.local; in Kubernetes the values
// come from the env-file ConfigMap.

import * as shared from '@/lib/appConfig';

function env(name: string): string | undefined {
  const value = process.env[name];
  return value === '' ? undefined : value;
}

const domain = env('DOMAIN') || '';

// Development-only fallback. It is public in this repository, so anyone could
// sign a valid token with it: a production server refuses to start on it.
const DEV_SESSION_SECRET = 'chronopin-node-secret';

if (env('NODE_ENV') === 'production' && env('NEXT_PHASE') !== 'phase-production-build') {
  const secret = env('SESSION_SECRET');
  if (!secret || secret === DEV_SESSION_SECRET) {
    throw new Error(
      `SESSION_SECRET is ${secret ? 'the public development default' : 'not set'}. ` +
        'Set it to a long random value (e.g. `openssl rand -base64 48`) before starting in production.',
    );
  }
}

export const config = {
  ...shared,

  host: env('HOST') || 'www.chronopin.com',
  env: env('NODE_ENV'),
  port: Number(env('PORT') || 9000),

  secrets: {
    session: env('SESSION_SECRET') || DEV_SESSION_SECRET,
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

  // Sign in with Apple. The client id is a Services ID rather than an app id,
  // and there is no static secret: the server signs a short-lived one with the
  // .p8 key downloaded from the developer account (see oauth.ts). APPLE_KEY
  // holds that file's PEM text, with real or backslash-escaped newlines.
  apple: {
    clientID: env('APPLE_ID') || 'id',
    teamID: env('APPLE_TEAM_ID') || '',
    keyID: env('APPLE_KEY_ID') || '',
    privateKey: (env('APPLE_KEY') || '').replace(/\\n/g, '\n'),
    callbackURL: domain + '/auth/apple/callback',
  },

  azureStorage: {
    connectionString: env('AZURE_STORAGE_CONNECTION_STRING') || '',
  },

  faiss: {
    serviceUrl: env('FAISS_URL'),
    // How many of a free-text search's best matches count as its results.
    // Semantic search scores every pin, so past this they are mostly noise.
    maxHits: Number(env('FAISS_MAX_HITS')) || 100,
  },

  youtube: {
    apiKey: env('YOUTUBE_API_KEY'),
  },

  anthropic: {
    apiKey: env('ANTHROPIC_API_KEY') || '',
  },

  // Resend, for the account emails (src/server/email.ts). The free tier is
  // 3,000 a month and 100 a day, from a domain verified in Resend's dashboard
  // (its DKIM and SPF records sit on chronopin.com at GoDaddy). Without a key
  // nothing is sent: the message, link included, goes to the server log.
  email: {
    resendApiKey: env('RESEND_API_KEY') || '',
    from: env('EMAIL_FROM') || 'Chronopin <noreply@chronopin.com>',
  },

  // Google Places API (New), for a place's own rating, review count, review
  // excerpts and opening hours. Billed per request and per field, so the
  // lookup is cached (src/server/places.ts) and only a pin with a resolved
  // place id ever asks. Without a key the Google half of the panel is absent
  // and the Yelp half still shows.
  googlePlaces: {
    apiKey: env('GOOGLE_PLACES_API_KEY') || '',
  },

  // Yelp Fusion, for the Yelp rating, review count, review excerpts and
  // whether the business takes reservations through Yelp. The free tier
  // covers this; without a key the Yelp half is simply absent.
  yelp: {
    apiKey: env('YELP_API_KEY') || '',
  },

  // A Kalshi API key: the key id and the RSA private key's PEM text (newlines
  // may be escaped). With both, Kalshi odds stream over its WebSocket and REST
  // reads are signed; without, they fall back to the keyless public API.
  kalshi: {
    keyID: env('KALSHI_API_KEY_ID') || '',
    privateKey: (env('KALSHI_PRIVATE_KEY') || '').replace(/\\n/g, '\n'),
  },

  // A Polymarket US API key: the key id and the base64 secret key. With both,
  // polymarket.us odds stream over its WebSocket and REST reads are signed;
  // without, they fall back to its keyless public gateway. (polymarket.com
  // needs no key.)
  polymarketUS: {
    keyID: env('POLYMARKET_API_KEY_ID') || '',
    secretKey: env('POLYMARKET_SECRET_KEY') || '',
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

  pdf: {
    // Reading a PDF's text layer costs milliseconds; OCR of a scan costs about
    // five seconds a page and pins a core while it runs. The text layer is
    // always read - this switch only decides whether a scan is worth the CPU.
    // Set SCRAPE_PDF_OCR=0 to turn it off and let a scan read as no text.
    ocr: env('SCRAPE_PDF_OCR') !== '0',
  },

  pagination: {
    pageSize: 25,
    // Pins per page of search results.
    searchPageSize: 24,
  },
};

export default config;
