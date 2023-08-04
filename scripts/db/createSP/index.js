'use strict';

/** Retruns Collection **/
/* pin */
const createGetPinsWithFavoriteAndLikeArrayNextFullPinSP = require('./pin/createGetPinsWithFavoriteAndLikeArrayNextFullPinSP');
const createGetPinsWithFavoriteAndLikeNextSP = require('./pin/createGetPinsWithFavoriteAndLikeNextSP');
const createGetPinsWithFavoriteAndLikePrevSP = require('./pin/createGetPinsWithFavoriteAndLikePrevSP');
const createGetPinsWithFavoriteAndLikeInitialSP = require('./pin/createGetPinsWithFavoriteAndLikeInitialSP');
const createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP = require('./pin/createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP');
const createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP = require('./pin/createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP');
const createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP = require('./pin/createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP');
const createGetPinByIdsSP = require('./pin/createGetPinByIdsSP');
const createGetPinByIdsFilterByHasFavoriteSP = require('./pin/createGetPinByIdsFilterByHasFavoriteSP');
const createGetPinsWithFavoriteAndLikeArrayNextSP = require('./pin/createGetPinsWithFavoriteAndLikeArrayNextSP');
const createGetPinByTagsFilterByHasFavoriteSP = require('./pin/createGetPinByTagsFilterByHasFavoriteSP');
const createGetPinByTagsSP = require('./pin/createGetPinByTagsSP');
const createGetPinForEditSP = require('./pin/createGetPinForEditSP');

/* search pin */
const createSearchPinSP = require('./pin/createSearchPinSP');
/* user */
const createGetAllUsersSP = require('./user/createGetAllUsersSP');
/* dateTime */
const createGetDateTimesByStartEndDateSP = require('./dateTime/createGetDateTimesByStartEndDateSP');
/* pin thread */
const createGetPinAuthorThreadSP = require('./pin/createGetPinAuthorThreadSP');
const createGetPinAuthorThreadWithFavoriteAndLikeSP = require('./pin/createGetPinAuthorThreadWithFavoriteAndLikeSP');
/* followUser */
const createGetFollowingUsersByUserIdSP = require('./followUser/createGetFollowingUsersByUserNameSP');
const createGetFollowerUsersByUserIdSP = require('./followUser/createGetFollowerUsersByUserNameSP');
const createGetIsFollowingByUserNameSP = require('./followUser/createGetIsFollowingByUserNameSP');
const createGetAllFollowUsersSP = require('./followUser/createGetAllFollowUsersSP');

const createUpdateAlFollowUserCheckedDateTimeSP = require('./followUser/createUpdateAlFollowUserCheckedDateTimeSP');
const createGetFollowUserUnreadCountSP = require('./followUser/createGetFollowUserUnreadCountSP');
const createGetFollowUserUnreadSP = require('./followUser/createGetFollowUserUnreadSP');
const createGetFollowUserPinsSP = require('./followUser/createGetFollowUserPinsSP');

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
const createSearchUserMentionSP = require('./user/createSearchUserMentionSP');
/* medium */
const createGetMediumByOriginalUrlSP = require('./medium/createGetMediumByOriginalUrlSP');
/* like */
const createGetLikeSP = require('./like/createGetLikeSP');
/* favorite */
const createGetFavoriteSP = require('./favorite/createGetFavoriteSP');
/* merchant */
const createGetMerchantSP = require('./merchant/createGetMerchantSP');
/* location */
const createGetLocationSP = require('./location/createGetLocationSP');

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
/* mention */
const createCreateMentionSP = require('./mention/createCreateMentionSP');
const createSearchMentionSP =  require('./mention/createSearchMentionSP');
const createCreatePinMentionSP = require('./pinMention/createCreatePinMentionSP');
const createCreatePinMentionLinkSP = require('./pinMention/createCreatePinMentionLinkSP');

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
/* location */
const createDeleteLocationSP = require('./location/createDeleteLocationSP');
const createDeleteLocationByPinIdSP = require('./location/createDeleteLocationByPinIdSP');
/* pinMention */
const createDeletePinMentionByPinIdSP = require('./pinMention/createDeletePinMentionByPinIdSP');
/* followUser */
const createDeleteFollowUserSP = require('./followUser/createDeleteFollowUserSP');

/** Upsert Record **/
/* like */
const createMergeLikeSP = require('./like/createMergeLikeSP');
/* favorite */
const createMergeFavoriteSP = require('./favorite/createMergeFavoriteSP');
/* merchant */
const createMergeMerchantSP = require('./merchant/createMergeMerchantSP');
/* location */
const createMergeLocationSP = require('./location/createMergeLocationSP');
/* followUser */
const createMergeFollowUserSP = require('./followUser/createMergeFollowUserSP');

/** Admin Delete **/
/* user */
const createAdminDeleteUserByIdSP = require('./user/createAdminDeleteUserByIdSP');

/** Functions **/
const createGetPrevPinIdsPaginatedFunc = require('./pin/createGetPrevPinIdsPaginatedFunc');
const createGetNextPinIdsPaginatedFunc = require('./pin/createGetNextPinIdsPaginatedFunc');

let cp;

// Setup
module.exports.setup = function (connectionPool) {
  cp = connectionPool;

  // Retruns Collection
  createGetPinsWithFavoriteAndLikeArrayNextFullPinSP.setup(cp);
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
  createGetPinByTagsFilterByHasFavoriteSP.setup(cp);
  createGetPinByTagsSP.setup(cp);
  createGetPinForEditSP.setup(cp);
  createGetFollowingUsersByUserIdSP.setup(cp);
  createGetFollowerUsersByUserIdSP.setup(cp);
  createGetIsFollowingByUserNameSP.setup(cp);
  createGetAllFollowUsersSP.setup(cp);

  createUpdateAlFollowUserCheckedDateTimeSP.setup(cp);
  createGetFollowUserUnreadCountSP.setup(cp);
  createGetFollowUserUnreadSP.setup(cp);
  createGetFollowUserPinsSP.setup(cp);

  // Returns Single Result
  createGetPinWithFavoriteAndLikeSP.setup(cp);
  createGetPinSP.setup(cp);
  createGetUserByIdSP.setup(cp);
  createGetUserByUserNameSP.setup(cp);
  createGetUserByFacebookIdSP.setup(cp);
  createGetUserByGoogleIdSP.setup(cp);
  createGetUserByEmailSP.setup(cp);
  createSearchUserMentionSP.setup(cp);
  createGetMediumByOriginalUrlSP.setup(cp);
  createGetLikeSP.setup(cp);
  createGetFavoriteSP.setup(cp);
  createGetMerchantSP.setup(cp);
  createGetLocationSP.setup(cp);

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
  createCreateMentionSP.setup(cp);
  createSearchMentionSP.setup(cp);
  createCreatePinMentionSP.setup(cp);
  createCreatePinMentionLinkSP.setup(cp);

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
  createDeleteLocationSP.setup(cp);
  createDeleteLocationByPinIdSP.setup(cp);
  createDeletePinMentionByPinIdSP.setup(cp);
  createDeleteFollowUserSP.setup(cp);

  // Upsert Record
  createMergeLikeSP.setup(cp);
  createMergeFavoriteSP.setup(cp);
  createMergeMerchantSP.setup(cp);
  createMergeLocationSP.setup(cp);
  createMergeFollowUserSP.setup(cp);

  // Admin Delete
  createAdminDeleteUserByIdSP.setup(cp);

  // Functions
  createGetPrevPinIdsPaginatedFunc.setup(cp);
  createGetNextPinIdsPaginatedFunc.setup(cp);
};

// Retruns Collection
module.exports.createGetPinsWithFavoriteAndLikeArrayNextFullPinSP = createGetPinsWithFavoriteAndLikeArrayNextFullPinSP.createSP;
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
module.exports.createGetPinByTagsFilterByHasFavoriteSP = createGetPinByTagsFilterByHasFavoriteSP.createSP;
module.exports.createGetPinByTagsSP = createGetPinByTagsSP.createSP;
module.exports.createGetFollowingUsersByUserIdSP = createGetFollowingUsersByUserIdSP.createSP;
module.exports.createGetFollowerUsersByUserIdSP = createGetFollowerUsersByUserIdSP.createSP;
module.exports.createGetIsFollowingByUserNameSP = createGetIsFollowingByUserNameSP.createSP;
module.exports.createGetAllFollowUsersSP = createGetAllFollowUsersSP.createSP;

module.exports.createUpdateAlFollowUserCheckedDateTimeSP = createUpdateAlFollowUserCheckedDateTimeSP.createSP;
module.exports.createGetFollowUserUnreadCountSP = createGetFollowUserUnreadCountSP.createSP;
module.exports.createGetFollowUserUnreadSP = createGetFollowUserUnreadSP.createSP;
module.exports.createGetFollowUserPinsSP = createGetFollowUserPinsSP.createSP;

// Returns Single Result
module.exports.createGetPinWithFavoriteAndLikeSP = createGetPinWithFavoriteAndLikeSP.createSP;
module.exports.createGetPinSP = createGetPinSP.createSP;
module.exports.createGetUserByIdSP = createGetUserByIdSP.createSP;
module.exports.createGetUserByUserNameSP = createGetUserByUserNameSP.createSP;
module.exports.createGetUserByFacebookIdSP = createGetUserByFacebookIdSP.createSP;
module.exports.createGetUserByGoogleIdSP = createGetUserByGoogleIdSP.createSP;
module.exports.createGetUserByEmailSP = createGetUserByEmailSP.createSP;
module.exports.createSearchUserMentionSP = createSearchUserMentionSP.createSP;
module.exports.createGetMediumByOriginalUrlSP = createGetMediumByOriginalUrlSP.createSP;
module.exports.createGetLikeSP = createGetLikeSP.createSP;
module.exports.createGetFavoriteSP = createGetFavoriteSP.createSP;
module.exports.createGetMerchantSP = createGetMerchantSP.createSP;
module.exports.createGetLocationSP = createGetLocationSP.createSP;
module.exports.createGetPinForEditSP = createGetPinForEditSP.createSP;

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
module.exports.createCreateMentionSP = createCreateMentionSP.createSP;
module.exports.createSearchMentionSP = createSearchMentionSP.createSP;
module.exports.createCreatePinMentionSP = createCreatePinMentionSP.createSP;
module.exports.createCreatePinMentionLinkSP = createCreatePinMentionLinkSP.createSP;

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
module.exports.createDeleteLocationSP = createDeleteLocationSP.createSP;
module.exports.createDeleteLocationByPinIdSP = createDeleteLocationByPinIdSP.createSP;
module.exports.createDeletePinMentionByPinIdSP = createDeletePinMentionByPinIdSP.createSP;
module.exports.createDeleteFollowUserSP = createDeleteFollowUserSP.createSP;

// Upsert Record
module.exports.createMergeLikeSP = createMergeLikeSP.createSP;
module.exports.createMergeFavoriteSP = createMergeFavoriteSP.createSP;
module.exports.createMergeMerchantSP = createMergeMerchantSP.createSP;
module.exports.createMergeLocationSP = createMergeLocationSP.createSP;
module.exports.createMergeFollowUserSP = createMergeFollowUserSP.createSP;

// Admin Delete
module.exports.createAdminDeleteUserByIdSP = createAdminDeleteUserByIdSP.createSP;

// Function
module.exports.createGetPrevPinIdsPaginatedFunc = createGetPrevPinIdsPaginatedFunc.createSP;
module.exports.createGetNextPinIdsPaginatedFunc = createGetNextPinIdsPaginatedFunc.createSP;

// Create Table Valued Parameters
// module.exports.createMediumTableType = require('./createMediumTableType');
