'use strict';

import * as log from '../../log';
const path = require('path');
const _ = require('lodash');
const fs = require('fs');


const configOverridePath = './' + process.env.NODE_ENV;

function requiredProcessEnv(name) {
  if (!process.env[name]) {
    throw new Error('You must set the ' + name + ' environment variable');
  }
  return process.env[name];
}

// All configurations will extend these options
// ============================================
let all = {
  host: 'www.chronopin.com',

  env: process.env.NODE_ENV,

  // Root path of server
  root: path.normalize(__dirname + '/../../..'),

  // Server port
  port: process.env.PORT || 9000,

  // Server IP
  ip: process.env.IP || '0.0.0.0',

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
    // sequelize & mssql connection stringing
    // mssql uses query parameters for additional options while sequelize does not
    uri: process.env.SEQUELIZE_URI,
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
    clientID: process.env.FACEBOOK_ID || 'id',
    clientSecret: process.env.FACEBOOK_SECRET || 'secret',
    callbackURL: (process.env.DOMAIN || '') + '/auth/facebook/callback'
  },

  azureStorage: {
    AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING || ''
  },

  azureSearch: {
    serviceUrl: process.env.AZURE_SEARCH_URL,
    apiKey: process.env.AZURE_SEARCH_API_KEY,
    queryKey: process.env.AZURE_SEARCH_QUERY_KEY
  },

  chromeless: {
    endpointUrl: process.env.CHROMELESS_ENDPOINT_URL,
    apiKey: process.env.CHROMELESS_ENDPOINT_API_KEY
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    sns: {
      adminNewUserTopicArn: process.env.AWS_ADMIN_NEW_USER_TOPIC_ARN
    }
  },

  admin: {
    notification: {
      email: process.env.ADMIN_NOTIFICATION_EMAIL
    }
  },

  pagination: {
    pageSize: 25
  }
};

// Export the config object based on the NODE_ENV
// ==============================================
const overrideConfig = require.resolve(configOverridePath) ?
  require(configOverridePath) :
  (
    log
      .error("Environment:", process.env.NODE_ENV)
      .error("Missing Override Config:", configOverridePath)
  );

module.exports = _.merge(
  all,
  require('./shared'),
  overrideConfig || {}
);
