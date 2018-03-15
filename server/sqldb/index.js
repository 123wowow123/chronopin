/**
 * Sequelize initialization module
 */

'use strict';

import path from 'path';
import config from '../config/environment';
import Sequelize from 'sequelize';

var db = {
  Sequelize,
  sequelize: new Sequelize(config.sequelize.uri, config.sequelize.options)
};

// Insert models below

// Core tables
// db.Thing = db.sequelize.import('../api/thing/thing.model');
// db.User = db.sequelize.import('../api/user/user.model');
//
// db.Pin = db.sequelize.import('../api/Pin/pin.model');
// db.Medium = db.sequelize.import('../api/medium/medium.model');
//
// // Join tables
// db.Favorite = db.sequelize.import('../api/favorite/favorite.model');
// db.Like = db.sequelize.import('../api/like/like.model');
// db.Comment = db.sequelize.import('../api/comment/comment.model');
// db.Click = db.sequelize.import('../api/click/click.model');
// db.PinMedium = db.sequelize.import('../api/pinMedium/pinMedium.model');
//
// // Create associations
// db.User.hasMany(db.Pin, {
//   foreignKey: 'userId',
//   constraints: false
// }); ///??????? constraints
//
// db.User.hasMany(db.Favorite, {
//   foreignKey: 'userId'
// });
// db.Pin.hasMany(db.Favorite, {
//   foreignKey: 'pinId'
// });
//
// db.User.hasMany(db.Like, {
//   foreignKey: 'userId'
// });
// db.Pin.hasMany(db.Like, {
//   foreignKey: 'pinId'
// });
//
// db.User.hasMany(db.Comment, {
//   foreignKey: 'userId'
// });
// db.Pin.hasMany(db.Comment, {
//   foreignKey: 'PinId'
// });

// //db.Pin.belongsToMany(db.Medium, { as: 'Media', through: db.PinMedium, foreignKey: 'pinId' });
// //db.Medium.belongsToMany(db.Pin, { as: 'Pins', through: db.PinMedium, foreignKey: 'mediumId' });

// db.Pin.belongsToMany(db.Medium, {
//   through: db.PinMedium,
//   foreignKey: 'pinId'
// });
// db.Medium.belongsToMany(db.Pin, {
//   through: db.PinMedium,
//   foreignKey: 'mediumId'
// });

// // db.Pin.belongsToMany(db.Medium, { through: db.PinMedium});
// // db.Medium.belongsToMany(db.Pin, { through: db.PinMedium});
// //
// // db.User.hasOne(db.Click, { foreignKey: 'userId' });
// // db.Medium.hasOne(db.Click, { foreignKey: 'mediumId' });
// //
// // db.User.hasOne(db.Click, { foreignKey: 'userId' });
// // db.Pin.hasOne(db.Click, { foreignKey: 'pinId' });

module.exports = db;
