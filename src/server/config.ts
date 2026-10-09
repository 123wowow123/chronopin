// Server configuration, read from the environment. Locally, Next.js and the
// scripts (via tsx + scripts/env.ts) load .env.local; in production the values
// come from Docker/env.prod.list on the VM (docs/deploy-azure.md).

import { ebayCampaignId } from '@/lib/affiliate';
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
      idleTimeoutMillis: 60000,
      // No JIT compiling: at a few thousand pins it costs a search more than
      // it saves (41 ms of 181 when its cost estimate tipped over the line).
      options: '-c jit=off',
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

  // A Twitch developer app (dev.twitch.tv/console): its client credentials give
  // the app token the Helix API needs to find a game's top clip
  // (src/server/scrape/twitch.ts). Without them no pin looks for one.
  twitch: {
    clientId: env('TWITCH_CLIENT_ID'),
    clientSecret: env('TWITCH_CLIENT_SECRET'),
  },

  // Vimeo's search needs an access token (a "public" scope one from
  // developer.vimeo.com); without it only Dailymotion is searched for a pin's
  // second video (src/server/scrape/altVideo.ts).
  vimeo: {
    accessToken: env('VIMEO_ACCESS_TOKEN'),
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

  // Web Push (VAPID) keys, for browser notifications about watched pins that
  // reach a browser with the site closed (src/server/push.ts). Made once with
  // `npx web-push generate-vapid-keys`; changing them strands every stored
  // subscription. Without them alerts reach only open tabs, over the live feed.
  webPush: {
    publicKey: env('VAPID_PUBLIC_KEY') || '',
    privateKey: env('VAPID_PRIVATE_KEY') || '',
    subject: env('VAPID_SUBJECT') || 'mailto:noreply@chronopin.com',
  },

  // Google Places API (New), for a place's own rating, review count, review
  // excerpts and opening hours. Billed per request and per field, so the
  // lookup is cached (src/server/places.ts) and only a pin with a resolved
  // place id ever asks. Without a key the Google half of the panel is absent
  // and the Yelp half still shows.
  googlePlaces: {
    apiKey: env('GOOGLE_PLACES_API_KEY') || '',
  },

  // Google Custom Search (Programmable Search Engine) image search, for a
  // product line's picture when Wikipedia has none (src/server/productPicture.ts).
  // Only the dev machine looks pictures up; without a key and engine id the
  // Google step is skipped. Free for 100 queries a day, then billed.
  googleSearch: {
    apiKey: env('GOOGLE_SEARCH_API_KEY') || '',
    engineId: env('GOOGLE_SEARCH_ENGINE_ID') || '',
  },

  // Yelp Fusion, for the Yelp rating, review count, review excerpts and
  // whether the business takes reservations through Yelp. The free tier
  // covers this; without a key the Yelp half is simply absent.
  yelp: {
    apiKey: env('YELP_API_KEY') || '',
  },

  // eBay's Browse API, for the cheapest exact listing of a product pin's
  // product on its eBay button (src/server/ebay.ts). A free developer app's
  // production keyset (developer.ebay.com). A campaign id from the eBay
  // Partner Network makes the listing links earn. Without the keys the
  // button stays a search.
  ebay: {
    clientID: env('EBAY_CLIENT_ID') || '',
    clientSecret: env('EBAY_CLIENT_SECRET') || '',
    campaignID: env('EBAY_CAMPAIGN_ID') || ebayCampaignId,
    // The Marketplace Account Deletion endpoint's verification token (32-80
    // characters), the same text as on the developer.ebay.com keyset's
    // Alerts & Notifications page (src/app/api/ebay/account-deletion).
    verificationToken: env('EBAY_VERIFICATION_TOKEN') || '',
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
