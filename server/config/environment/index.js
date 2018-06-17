'use strict';

import * as log from '../../log';
const path = require('path');
const _ = require('lodash');
const fs = require('fs');

function requiredProcessEnv(name) {
  if (!process.env[name]) {
    throw new Error('You must set the ' + name + ' environment variable');
  }
  return process.env[name];
}

const configOverridePath = './' + requiredProcessEnv('NODE_ENV');

// All configurations will extend these options
// ============================================
let all = {
  host: 'www.chronopin.com',

  env: requiredProcessEnv('NODE_ENV'),

  // Root path of server
  root: path.normalize(__dirname + '/../../..'),

  // Server port
  port: requiredProcessEnv('PORT') || 9000,

  // Server IP
  ip: requiredProcessEnv('IP') || '0.0.0.0',

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
    uri: requiredProcessEnv('SEQUELIZE_URI'),
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
    clientID: requiredProcessEnv('FACEBOOK_ID') || 'id',
    clientSecret: requiredProcessEnv('FACEBOOK_SECRET') || 'secret',
    callbackURL: (requiredProcessEnv('DOMAIN') || '') + '/auth/facebook/callback'
  },

  azureStorage: {
    AZURE_STORAGE_CONNECTION_STRING: requiredProcessEnv('AZURE_STORAGE_CONNECTION_STRING') || ''
  },

  azureSearch: {
    serviceUrl: requiredProcessEnv('AZURE_SEARCH_URL'),
    apiKey: requiredProcessEnv('AZURE_SEARCH_API_KEY'),
    queryKey: requiredProcessEnv('AZURE_SEARCH_QUERY_KEY')
  },

  chromeless: {
    endpointUrl: requiredProcessEnv('CHROMELESS_ENDPOINT_URL'),
    apiKey: requiredProcessEnv('CHROMELESS_ENDPOINT_API_KEY')
  },

  aws: {
    accessKeyId: requiredProcessEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: requiredProcessEnv('AWS_SECRET_ACCESS_KEY'),
    region: requiredProcessEnv('AWS_REGION'),
    sns: {
      adminNewUserTopicArn: requiredProcessEnv('AWS_ADMIN_NEW_USER_TOPIC_ARN')
    }
  },

  admin: {
    notification: {
      email: requiredProcessEnv('ADMIN_NOTIFICATION_EMAIL')
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
