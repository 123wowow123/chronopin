'use strict';

let cp;

// Setup
module.exports.setup = function (connectionPool) {
  cp = connectionPool;

  require('./User').setup(cp);
  require('./Location').setup(cp);
  require('./Click').setup(cp);
  require('./Comment').setup(cp);
  require('./Favorite').setup(cp);
  require('./Like').setup(cp);
  require('./Medium').setup(cp);
  require('./MediumType').setup(cp);
  require('./Pin').setup(cp);
  require('./PinMedium').setup(cp);
  require('./DateTime').setup(cp);
  require('./Merchant').setup(cp);
  require('./Mention').setup(cp);
  require('./PinMention').setup(cp);
  require('./Circle').setup(cp);
  require('./UserCircle').setup(cp);
  require('./PinCircle').setup(cp);

  require('./PinView').setup(cp);
  require('./PinBaseView').setup(cp);
};

// Retruns Table
module.exports.createUser = require('./User').create;
module.exports.createLocation = require('./Location').create;
module.exports.createClick = require('./Click').create;
module.exports.createComment = require('./Comment').create;
module.exports.createFavorite = require('./Favorite').create;
module.exports.createLike = require('./Like').create;
module.exports.createMedium = require('./Medium').create;
module.exports.createMediumType = require('./MediumType').create;
module.exports.createPin = require('./Pin').create;
module.exports.createPinMedium = require('./PinMedium').create;
module.exports.createDateTime = require('./DateTime').create;
module.exports.createMerchant = require('./Merchant').create;
module.exports.createMention = require('./Mention').create;
module.exports.createPinMention = require('./PinMention').create;
module.exports.createCircle = require('./Circle').create;
module.exports.createPinCircle = require('./PinCircle').create;
module.exports.createUserCircle = require('./UserCircle').create;

// Retruns View
module.exports.createPinView = require('./PinView').create;
module.exports.createPinBaseView = require('./PinBaseView').create;