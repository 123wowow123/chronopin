'use strict';

let cp;

// Setup
module.exports.setup = function(connectionPool) {
  cp = connectionPool;

  require('./User').setup(cp);
  require('./Address').setup(cp);
  require('./Click').setup(cp);
  require('./Comment').setup(cp);
  require('./Favorite').setup(cp);
  require('./Like').setup(cp);
  require('./Medium').setup(cp);
  require('./Pin').setup(cp);
  require('./PinMedium').setup(cp);
  require('./DateTime').setup(cp);
};

// Retruns Table
module.exports.createUser = require('./User').createUser;
module.exports.createAddress = require('./Address').createAddress;
module.exports.createClick = require('./Click').createClick;
module.exports.createComment = require('./Comment').createComment;
module.exports.createFavorite = require('./Favorite').createFavorite;
module.exports.createLike = require('./Like').createLike;
module.exports.createMedium = require('./Medium').createMedium;
module.exports.createPin = require('./Pin').createPin;
module.exports.createPinMedium = require('./PinMedium').createPinMedium;
module.exports.createDateTime = require('./DateTime').createDateTime;
