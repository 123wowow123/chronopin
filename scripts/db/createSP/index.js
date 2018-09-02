'use strict';

/** Retruns Collection **/
/* pin */
const createGetPinsWithFavoriteAndLikeNextSP = require('./pin/createGetPinsWithFavoriteAndLikeNextSP');
const createGetPinsWithFavoriteAndLikePrevSP = require('./pin/createGetPinsWithFavoriteAndLikePrevSP');
const createGetPinsWithFavoriteAndLikeInitialSP = require('./pin/createGetPinsWithFavoriteAndLikeInitialSP');
const createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP = require('./pin/createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP');
const createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP = require('./pin/createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP');
const createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP = require('./pin/createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP');
const createGetPinByIdsSP = require('./pin/createGetPinByIdsSP');
const createGetPinByIdsFilterByHasFavoriteSP = require('./pin/createGetPinByIdsFilterByHasFavoriteSP');
const createGetPinsWithFavoriteAndLikeArrayNextSP = require('./pin/GetPinsWithFavoriteAndLikeArrayNext');
/* user */
const createGetAllUsersSP = require('./user/createGetAllUsersSP');
/* dateTime */
const createGetDateTimesByStartEndDateSP = require('./dateTime/createGetDateTimesByStartEndDateSP');

/** Returns Single Result **/
/* pin */
const createGetPinWithFavoriteAndLikeSP = require('./pin/createGetPinWithFavoriteAndLikeSP');
const createGetPinSP = require('./pin/createGetPinSP');
/* user */
const createGetUserByIdSP = require('./user/createGetUserByIdSP');
const createGetUserByFacebookIdSP = require('./user/createGetUserByFacebookIdSP');
const createGetUserByEmailSP = require('./user/createGetUserByEmailSP');
/* medium */
const createGetMediumByOriginalUrlSP = require('./medium/createGetMediumByOriginalUrlSP');
/* like */
const createGetLikeSP = require('./like/createGetLikeSP');
/* favorite */
const createGetFavoriteSP = require('./favorite/createGetFavoriteSP');

/** Create Record **/
/* pin */
const createCreatePinSP = require('./pin/createCreatePinSP');
/* user */
const createCreateUserSP = require('./user/createCreateUserSP');
/* medium */
const createCreateMediumSP = require('./medium/createCreateMediumSP');
/* pinMedium */
const createCreatePinMediumSP = require('./pinMedium/createCreatePinMediumSP');
const createCreatePinMediumLinkSP = require('./pinMedium/createCreatePinMediumLinkSP');
/* like */
const createCreateLikeSP = require('./like/createCreateLikeSP');
/* favorite */
const createCreateFavoriteSP = require('./favorite/createCreateFavoriteSP');
/* dateTime */
const createCreateDateTimeSP = require('./dateTime/createCreateDateTimeSP');

/** Update Record **/
/* user */
const createUpdateUserSP = require('./user/createUpdateUserSP');
/* pin */
const createUpdatePinSP = require('./pin/createUpdatePinSP');
/* like */
const createUpdateLikeSP = require('./like/createUpdateLikeSP');

/** Delete Record **/
/* pin */
const createDeletePinSP = require('./pin/createDeletePinSP');
/* user */
const createDeleteUserByIdSP = require('./user/createDeleteUserByIdSP');
/* pinMedium */
const createDeletePinMediumByPinMediumIdSP = require('./pinMedium/createDeletePinMediumByPinMediumIdSP');
/* like */
const createDeleteLikeSP = require('./like/createDeleteLikeSP');
const createDeleteLikeByPinIdSP = require('./like/createDeleteLikeByPinIdSP');
/* favorite */
const createDeleteFavoriteSP = require('./favorite/createDeleteFavoriteSP');
const createDeleteFavoriteByPinIdSP = require('./favorite/createDeleteFavoriteByPinIdSP');

/** Admin Delete **/
/* user */
const createAdminDeleteUserByIdSP = require('./user/createAdminDeleteUserByIdSP');

let cp;

// Setup
module.exports.setup = function(connectionPool) {
  cp = connectionPool;

  // Retruns Collection
  createGetPinsWithFavoriteAndLikeNextSP.setup(cp);
  createGetPinsWithFavoriteAndLikePrevSP.setup(cp);
  createGetPinsWithFavoriteAndLikeInitialSP.setup(cp);
  createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP.setup(cp);
  createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP.setup(cp);
  createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP.setup(cp);
  createGetPinByIdsSP.setup(cp);
  createGetPinByIdsFilterByHasFavoriteSP.setup(cp);
  createGetAllUsersSP.setup(cp);
  createGetDateTimesByStartEndDateSP.setup(cp);
  createGetPinsWithFavoriteAndLikeArrayNextSP.setup(cp);

  // Returns Single Result
  createGetPinWithFavoriteAndLikeSP.setup(cp);
  createGetPinSP.setup(cp);
  createGetUserByIdSP.setup(cp);
  createGetUserByFacebookIdSP.setup(cp);
  createGetUserByEmailSP.setup(cp);
  createGetMediumByOriginalUrlSP.setup(cp);
  createGetLikeSP.setup(cp);
  createGetFavoriteSP.setup(cp);

  // Create Record
  createCreatePinSP.setup(cp);
  createCreateUserSP.setup(cp);
  createCreateMediumSP.setup(cp);
  createCreatePinMediumSP.setup(cp);
  createCreatePinMediumLinkSP.setup(cp);
  createCreateLikeSP.setup(cp);
  createCreateFavoriteSP.setup(cp);
  createCreateDateTimeSP.setup(cp);

  // Update Record
  createUpdateUserSP.setup(cp);
  createUpdatePinSP.setup(cp);
  createUpdateLikeSP.setup(cp);

  // Delete Record
  createDeletePinSP.setup(cp);
  createDeleteUserByIdSP.setup(cp);
  createDeletePinMediumByPinMediumIdSP.setup(cp);
  createDeleteLikeSP.setup(cp);
  createDeleteLikeByPinIdSP.setup(cp);
  createDeleteFavoriteSP.setup(cp);
  createDeleteFavoriteByPinIdSP.setup(cp);

  // Admin Delete
  createAdminDeleteUserByIdSP.setup(cp);
};

// Retruns Collection
module.exports.createGetPinsWithFavoriteAndLikeNextSP = createGetPinsWithFavoriteAndLikeNextSP.createSP;
module.exports.createGetPinsWithFavoriteAndLikePrevSP = createGetPinsWithFavoriteAndLikePrevSP.createSP;
module.exports.createGetPinsWithFavoriteAndLikeInitialSP = createGetPinsWithFavoriteAndLikeInitialSP.createSP;
module.exports.createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP = createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP.createSP;
module.exports.createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP = createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP.createSP;
module.exports.createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP = createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP.createSP;
module.exports.createGetPinByIdsSP = createGetPinByIdsSP.createSP;
module.exports.createGetPinByIdsFilterByHasFavoriteSP = createGetPinByIdsFilterByHasFavoriteSP.createSP;
module.exports.createGetAllUsersSP = createGetAllUsersSP.createSP;
module.exports.createGetDateTimesByStartEndDateSP = createGetDateTimesByStartEndDateSP.createSP;

// Returns Single Result
module.exports.createGetPinWithFavoriteAndLikeSP = createGetPinWithFavoriteAndLikeSP.createSP;
module.exports.createGetPinSP = createGetPinSP.createSP;
module.exports.createGetUserByIdSP = createGetUserByIdSP.createSP;
module.exports.createGetUserByFacebookIdSP = createGetUserByFacebookIdSP.createSP;
module.exports.createGetUserByEmailSP = createGetUserByEmailSP.createSP;
module.exports.createGetMediumByOriginalUrlSP = createGetMediumByOriginalUrlSP.createSP;
module.exports.createGetLikeSP = createGetLikeSP.createSP;
module.exports.createGetFavoriteSP = createGetFavoriteSP.createSP;

// Create Record
module.exports.createCreatePinSP = createCreatePinSP.createSP;
module.exports.createCreateUserSP = createCreateUserSP.createSP;
module.exports.createCreateMediumSP = createCreateMediumSP.createSP;
module.exports.createCreatePinMediumSP = createCreatePinMediumSP.createSP;
module.exports.createCreatePinMediumLinkSP = createCreatePinMediumLinkSP.createSP;
module.exports.createCreateLikeSP = createCreateLikeSP.createSP;
module.exports.createCreateFavoriteSP = createCreateFavoriteSP.createSP;
module.exports.createCreateDateTimeSP = createCreateDateTimeSP.createSP;

// Update Record
module.exports.createUpdateUserSP = createUpdateUserSP.createSP;
module.exports.createUpdatePinSP = createUpdatePinSP.createSP;
module.exports.createUpdateLikeSP = createUpdateLikeSP.createSP;

// Delete Record
module.exports.createDeletePinSP = createDeletePinSP.createSP;
module.exports.createDeleteUserByIdSP = createDeleteUserByIdSP.createSP;
module.exports.createDeletePinMediumByPinMediumIdSP = createDeletePinMediumByPinMediumIdSP.createSP;
module.exports.createDeleteLikeSP = createDeleteLikeSP.createSP;
module.exports.createDeleteLikeByPinIdSP = createDeleteLikeByPinIdSP.createSP;
module.exports.createDeleteFavoriteSP = createDeleteFavoriteSP.createSP;
module.exports.createDeleteFavoriteByPinIdSP = createDeleteFavoriteByPinIdSP.createSP;

// Admin Delete
module.exports.createAdminDeleteUserByIdSP = createAdminDeleteUserByIdSP.createSP;

// Create Table Valued Parameters
// module.exports.createMediumTableType = require('./createMediumTableType');
