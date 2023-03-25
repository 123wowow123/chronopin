'use strict';

import * as log from '../../util/log';
const path = require('path');
const _ = require('lodash');
const fs = require('fs');

function getProcessEnv(name) {
  return process.env[name];
}

// All configurations will extend these options
// ============================================
let all = {
  host: getProcessEnv('HOST') || 'www.chronopin.com',

  env: getProcessEnv('NODE_ENV'),

  // Root path of server
  // Docker needs path without dist unlike local
  //root: getProcessEnv('NODE_ENV') === "development" ? path.normalize(__dirname + '/../../..') : path.normalize(__dirname + '/../../../dist'),
  root: path.normalize(__dirname + '/../../..'),
  // Server port
  port: getProcessEnv('PORT') || 9000,

  // Server IP
  ip: getProcessEnv('IP') || '0.0.0.0',

  // Should we populate the DB with sample data?
  seedDB: false,

  // Secret for session, you will want to change this and make it an environment variable
  secrets: {
    session: 'chronopin-node-secret'
  },

  // MongoDB connection options
  mongo: {
    options: {
      db: {
        safe: true
      }
    }
  },

  // Sequelize connection opions
  sequelize: {

    connection: {
      dbname: getProcessEnv('SEQUELIZE_DB_NAME'),
      username: getProcessEnv('SEQUELIZE_USER_NAME'),
      password: getProcessEnv('SEQUELIZE_PASSWORD'),
      options: {
        host: getProcessEnv('SEQUELIZE_HOST'),
        dialect: 'mssql',
        pool: {
          max: 5,
          min: 0,
          idle: 10000
        },
        dialectOptions: {
          options: {
            encrypt: true
          }
        }
      }
    },
    // sequelize & mssql connection stringing
    // mssql uses query parameters for additional options while sequelize does not
    uri: getProcessEnv('SEQUELIZE_URI'),
    options: {
      // sequalize options
      logging: true,
      dialectOptions: {
        encrypt: true
      },
      define: {
        timestamps: false,
        freezeTableName: true
      }
    }
  },

  facebook: {
    clientID: getProcessEnv('FACEBOOK_ID') || 'id',
    clientSecret: getProcessEnv('FACEBOOK_SECRET') || 'secret',
    callbackURL: (getProcessEnv('DOMAIN') || '') + '/auth/facebook/callback'
  },

  google: {
    clientID: getProcessEnv('GOOGLE_ID') || 'id',
    clientSecret: getProcessEnv('GOOGLE_SECRET') || 'secret',
    callbackURL: (getProcessEnv('DOMAIN') || '') + '/auth/google/callback'
  },

  azureStorage: {
    AZURE_STORAGE_CONNECTION_STRING: getProcessEnv('AZURE_STORAGE_CONNECTION_STRING') || ''
  },

  faiss: {
    serviceUrl: getProcessEnv('FAISS_URL'),
  },

  youtube: {
    YOUTUBE_API_KEY: getProcessEnv('YOUTUBE_API_KEY')
  },

  elastiSearch: {
    indexPrefix: getProcessEnv('INDEXPREFIX') || '',
    serviceUrl: getProcessEnv('ELASTISEARCH_URL') || '',
    auth: {
      user: getProcessEnv('ELASTISEARCH_USER'),
      pass: getProcessEnv('ELASTISEARCH_PASS'),
      sendImmediately: false
    },
  },

  // chromeless: {
  //   endpointUrl: getProcessEnv('CHROMELESS_ENDPOINT_URL'),
  //   apiKey: getProcessEnv('CHROMELESS_ENDPOINT_API_KEY')
  // },

  aws: {
    accessKeyId: getProcessEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: getProcessEnv('AWS_SECRET_ACCESS_KEY'),
    region: getProcessEnv('AWS_REGION'),
    sns: {
      adminNewUserTopicArn: getProcessEnv('AWS_ADMIN_NEW_USER_TOPIC_ARN')
    }
  },

  admin: {
    notification: {
      email: getProcessEnv('ADMIN_NOTIFICATION_EMAIL')
    }
  },

  pagination: {
    pageSize: 25
  }
};

// Export the config object based on the NODE_ENV
// ==============================================

const configOverridePath = './' + getProcessEnv('NODE_ENV') + '.js';

const overrideConfig = fs.existsSync(path.join(__dirname, configOverridePath)) ?
  require(configOverridePath) :
  (
    log
      .warn("Environment:", process.env.NODE_ENV)
      .warn("Missing Override Config, fallback to Env variables:", configOverridePath),
    {}
  );

module.exports = _.merge(
  all,
  require('./shared'),
  overrideConfig
);
