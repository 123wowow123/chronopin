'use strict';

var _log = require('../../log');

var log = _interopRequireWildcard(_log);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var path = require('path');
var _ = require('lodash');
var fs = require('fs');

function getProcessEnv(name) {
  return process.env[name];
}

// All configurations will extend these options
// ============================================
var all = {
  host: getProcessEnv('HOST') || 'www.chronopin.com',

  env: getProcessEnv('NODE_ENV'),

  // Root path of server
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

  azureStorage: {
    AZURE_STORAGE_CONNECTION_STRING: getProcessEnv('AZURE_STORAGE_CONNECTION_STRING') || ''
  },

  azureSearch: {
    serviceUrl: getProcessEnv('AZURE_SEARCH_URL'),
    apiKey: getProcessEnv('AZURE_SEARCH_API_KEY'),
    queryKey: getProcessEnv('AZURE_SEARCH_QUERY_KEY')
  },

  chromeless: {
    endpointUrl: getProcessEnv('CHROMELESS_ENDPOINT_URL'),
    apiKey: getProcessEnv('CHROMELESS_ENDPOINT_API_KEY')
  },

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

var configOverridePath = './' + getProcessEnv('NODE_ENV') + '.js';

var overrideConfig = fs.existsSync(path.join(__dirname, configOverridePath)) ? require(configOverridePath) : (log.warn("Environment:", process.env.NODE_ENV).warn("Missing Override Config, fallback to Env variables:", configOverridePath), {});

module.exports = _.merge(all, require('./shared'), overrideConfig);
//# sourceMappingURL=index.js.map
