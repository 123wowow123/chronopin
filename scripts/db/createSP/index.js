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
const createGetPinsWithFavoriteAndLikeArrayNextSP = require('./pin/createGetPinsWithFavoriteAndLikeArrayNextSP');
const createGetPinByAuthersFilterByHasFavoriteSP = require('./pin/createGetPinByAuthersFilterByHasFavoriteSP');
const createGetPinByAuthersSP = require('./pin/createGetPinByAuthersSP');

/* search pin */
const createSearchPinSP = require('./pin/createSearchPinSP');
/* user */
const createGetAllUsersSP = require('./user/createGetAllUsersSP');
/* dateTime */
const createGetDateTimesByStartEndDateSP = require('./dateTime/createGetDateTimesByStartEndDateSP');
/* pin thread */
const createGetPinAuthorThreadSP = require('./pin/createGetPinAuthorThreadSP');
const createGetPinAuthorThreadWithFavoriteAndLikeSP = require('./pin/createGetPinAuthorThreadWithFavoriteAndLikeSP');

/** Returns Single Result **/
/* pin */
const createGetPinWithFavoriteAndLikeSP = require('./pin/createGetPinWithFavoriteAndLikeSP');
const createGetPinSP = require('./pin/createGetPinSP');
/* user */
const createGetUserByIdSP = require('./user/createGetUserByIdSP');
const createGetUserByUserNameSP = require('./user/createGetUserByUserNameSP');
const createGetUserByFacebookIdSP = require('./user/createGetUserByFacebookIdSP');
const createGetUserByGoogleIdSP = require('./user/createGetUserByGoogleIdSP');
const createGetUserByEmailSP = require('./user/createGetUserByEmailSP');
/* medium */
const createGetMediumByOriginalUrlSP = require('./medium/createGetMediumByOriginalUrlSP');
/* like */
const createGetLikeSP = require('./like/createGetLikeSP');
/* favorite */
const createGetFavoriteSP = require('./favorite/createGetFavoriteSP');
/* merchant */
const createGetMerchantSP = require('./merchant/createGetMerchantSP');

/** Create Record **/
/* pin */
const createCreatePinSP = require('./pin/createCreatePinSP');
/* user */
const createCreateUserSP = require('./user/createCreateUserSP');
/* medium */
const createCreateMediumSP = require('./medium/createCreateMediumSP');
/* mediumType */
const createCreateMediumTypeSP = require('./mediumType/createCreateMediumTypeSP');
/* pinMedium */
const createCreatePinMediumSP = require('./pinMedium/createCreatePinMediumSP');
const createCreatePinMediumLinkSP = require('./pinMedium/createCreatePinMediumLinkSP');
/* like */
//const createCreateLikeSP = require('./like/createCreateLikeSP');
/* favorite */
//const createCreateFavoriteSP = require('./favorite/createCreateFavoriteSP');
/* dateTime */
const createCreateDateTimeSP = require('./dateTime/createCreateDateTimeSP');

/** Update Record **/
/* user */
const createUpdateUserSP = require('./user/createUpdateUserSP');
/* pin */
const createUpdatePinSP = require('./pin/createUpdatePinSP');
/* like */
//const createUpdateLikeSP = require('./like/createUpdateLikeSP');

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
/* merchant */
const createDeleteMerchantSP = require('./merchant/createDeleteMerchantSP');
const createDeleteMerchantByPinIdSP = require('./merchant/createDeleteMerchantByPinIdSP');

/** Upsert Record **/
/* like */
const createMergeLikeSP = require('./like/createMergeLikeSP');
/* favorite */
const createMergeFavoriteSP = require('./favorite/createMergeFavoriteSP');
/* merchant */
const createMergeMerchantSP = require('./merchant/createMergeMerchantSP');

/** Admin Delete **/
/* user */
const createAdminDeleteUserByIdSP = require('./user/createAdminDeleteUserByIdSP');

let cp;

// Setup
module.exports.setup = function (connectionPool) {
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
  createSearchPinSP.setup(cp);
  createGetPinAuthorThreadSP.setup(cp);
  createGetPinAuthorThreadWithFavoriteAndLikeSP.setup(cp);
  createGetPinByAuthersFilterByHasFavoriteSP.setup(cp);
  createGetPinByAuthersSP.setup(cp);

  // Returns Single Result
  createGetPinWithFavoriteAndLikeSP.setup(cp);
  createGetPinSP.setup(cp);
  createGetUserByIdSP.setup(cp);
  createGetUserByUserNameSP.setup(cp);
  createGetUserByFacebookIdSP.setup(cp);
  createGetUserByGoogleIdSP.setup(cp);
  createGetUserByEmailSP.setup(cp);
  createGetMediumByOriginalUrlSP.setup(cp);
  createGetLikeSP.setup(cp);
  createGetFavoriteSP.setup(cp);
  createGetMerchantSP.setup(cp);

  // Create Record
  createCreatePinSP.setup(cp);
  createCreateUserSP.setup(cp);
  createCreateMediumSP.setup(cp);
  createCreateMediumTypeSP.setup(cp);
  createCreatePinMediumSP.setup(cp);
  createCreatePinMediumLinkSP.setup(cp);
  //createCreateLikeSP.setup(cp);
  //createCreateFavoriteSP.setup(cp);
  createCreateDateTimeSP.setup(cp);

  // Update Record
  createUpdateUserSP.setup(cp);
  createUpdatePinSP.setup(cp);
  //createUpdateLikeSP.setup(cp);

  // Delete Record
  createDeletePinSP.setup(cp);
  createDeleteUserByIdSP.setup(cp);
  createDeletePinMediumByPinMediumIdSP.setup(cp);
  createDeleteLikeSP.setup(cp);
  createDeleteLikeByPinIdSP.setup(cp);
  createDeleteFavoriteSP.setup(cp);
  createDeleteFavoriteByPinIdSP.setup(cp);
  createDeleteMerchantSP.setup(cp);
  createDeleteMerchantByPinIdSP.setup(cp);

  // Upsert Record
  createMergeLikeSP.setup(cp);
  createMergeFavoriteSP.setup(cp);
  createMergeMerchantSP.setup(cp);

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
module.exports.createGetPinsWithFavoriteAndLikeArrayNextSP = createGetPinsWithFavoriteAndLikeArrayNextSP.createSP;
module.exports.createSearchPinSP = createSearchPinSP.createSP;
module.exports.createGetPinAuthorThreadSP = createGetPinAuthorThreadSP.createSP;
module.exports.createGetPinAuthorThreadWithFavoriteAndLikeSP = createGetPinAuthorThreadWithFavoriteAndLikeSP.createSP;
module.exports.createGetPinByAuthersFilterByHasFavoriteSP = createGetPinByAuthersFilterByHasFavoriteSP.createSP;
module.exports.createGetPinByAuthersSP = createGetPinByAuthersSP.createSP;

// Returns Single Result
module.exports.createGetPinWithFavoriteAndLikeSP = createGetPinWithFavoriteAndLikeSP.createSP;
module.exports.createGetPinSP = createGetPinSP.createSP;
module.exports.createGetUserByIdSP = createGetUserByIdSP.createSP;
module.exports.createGetUserByUserNameSP = createGetUserByUserNameSP.createSP;
module.exports.createGetUserByFacebookIdSP = createGetUserByFacebookIdSP.createSP;
module.exports.createGetUserByGoogleIdSP = createGetUserByGoogleIdSP.createSP;
module.exports.createGetUserByEmailSP = createGetUserByEmailSP.createSP;
module.exports.createGetMediumByOriginalUrlSP = createGetMediumByOriginalUrlSP.createSP;
module.exports.createGetLikeSP = createGetLikeSP.createSP;
module.exports.createGetFavoriteSP = createGetFavoriteSP.createSP;
module.exports.createGetMerchantSP = createGetMerchantSP.createSP;

// Create Record
module.exports.createCreatePinSP = createCreatePinSP.createSP;
module.exports.createCreateUserSP = createCreateUserSP.createSP;
module.exports.createCreateMediumSP = createCreateMediumSP.createSP;
module.exports.createCreateMediumTypeSP = createCreateMediumTypeSP.createSP;
module.exports.createCreatePinMediumSP = createCreatePinMediumSP.createSP;
module.exports.createCreatePinMediumLinkSP = createCreatePinMediumLinkSP.createSP;
//module.exports.createCreateLikeSP = createCreateLikeSP.createSP;
//module.exports.createCreateFavoriteSP = createCreateFavoriteSP.createSP;
module.exports.createCreateDateTimeSP = createCreateDateTimeSP.createSP;

// Update Record
module.exports.createUpdateUserSP = createUpdateUserSP.createSP;
module.exports.createUpdatePinSP = createUpdatePinSP.createSP;
//module.exports.createUpdateLikeSP = createUpdateLikeSP.createSP;

// Delete Record
module.exports.createDeletePinSP = createDeletePinSP.createSP;
module.exports.createDeleteUserByIdSP = createDeleteUserByIdSP.createSP;
module.exports.createDeletePinMediumByPinMediumIdSP = createDeletePinMediumByPinMediumIdSP.createSP;
module.exports.createDeleteLikeSP = createDeleteLikeSP.createSP;
module.exports.createDeleteLikeByPinIdSP = createDeleteLikeByPinIdSP.createSP;
module.exports.createDeleteFavoriteSP = createDeleteFavoriteSP.createSP;
module.exports.createDeleteFavoriteByPinIdSP = createDeleteFavoriteByPinIdSP.createSP;
module.exports.createDeleteMerchantSP = createDeleteMerchantSP.createSP;
module.exports.createDeleteMerchantByPinIdSP = createDeleteMerchantByPinIdSP.createSP;

// Upsert Record
module.exports.createMergeLikeSP = createMergeLikeSP.createSP;
module.exports.createMergeFavoriteSP = createMergeFavoriteSP.createSP;
module.exports.createMergeMerchantSP = createMergeMerchantSP.createSP;

// Admin Delete
module.exports.createAdminDeleteUserByIdSP = createAdminDeleteUserByIdSP.createSP;

// Create Table Valued Parameters
// module.exports.createMediumTableType = require('./createMediumTableType');
