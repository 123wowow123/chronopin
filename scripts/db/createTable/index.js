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

  require('./PinView').setup(cp);
  require('./PinBaseView').setup(cp);
};

// Retruns Table
module.exports.createUser = require('./User').createUser;
module.exports.createLocation = require('./Location').createLocation;
module.exports.createClick = require('./Click').createClick;
module.exports.createComment = require('./Comment').createComment;
module.exports.createFavorite = require('./Favorite').createFavorite;
module.exports.createLike = require('./Like').createLike;
module.exports.createMedium = require('./Medium').createMedium;
module.exports.createMediumType = require('./MediumType').createMediumType;
module.exports.createPin = require('./Pin').createPin;
module.exports.createPinMedium = require('./PinMedium').createPinMedium;
module.exports.createDateTime = require('./DateTime').createDateTime;
module.exports.createMerchant = require('./Merchant').createMerchant;

// Retruns View
module.exports.createPinView = require('./PinView').createPinView;
module.exports.createPinBaseView = require('./PinBaseView').createPinBaseView;