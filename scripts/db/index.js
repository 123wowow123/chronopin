'use strict';

require('babel-register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const cp = require('../../server/sqlConnectionPool');
const Request = cp.Request;

const {
  // Setup
  setup: tableSetup,

  // Create Table
  createUser,
  createLocation,
  createClick,
  createComment,
  createFavorite,
  createLike,
  createMedium,
  createMediumType,
  createPin,
  createPinMedium,
  createDateTime,
  createMerchant,
  createMention,
  createPinMention,
  createCircle,
  createUserCircle,
  createPinCircle,
  createFollowUser,
  createView,

  // Create View
  createPinView,
  createPinBaseView
} = require('./createTable');

const {
  // Setup
  setup: spSetup,

  // Retruns Collection
  createGetPinsWithFavoriteAndLikeArrayNextFullPinSP,
  createGetPinsWithFavoriteAndLikeNextSP,
  createGetPinsWithFavoriteAndLikePrevSP,
  createGetPinsWithFavoriteAndLikeInitialSP,
  createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP,
  createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP,
  createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP,
  createGetPinByIdsSP,
  createGetPinByIdsFilterByHasFavoriteSP,
  createGetAllUsersSP,
  createGetDateTimesByStartEndDateSP,
  createGetPinsWithFavoriteAndLikeArrayNextSP,
  createSearchPinSP,
  createGetPinAuthorThreadSP,
  createGetPinAuthorThreadWithFavoriteAndLikeSP,
  createGetPinByTagsFilterByHasFavoriteSP,
  createGetPinByTagsSP,
  createGetPinForEditSP,
  createGetFollowingUsersByUserIdSP,
  createGetFollowerUsersByUserIdSP,
  createGetIsFollowingByUserNameSP,
  createGetAllFollowUsersSP,

  createUpdateAlFollowUserCheckedDateTimeSP,
  createGetFollowUserUnreadCountSP,
  createGetFollowUserUnreadSP,

  // Returns Single Result
  createGetPinWithFavoriteAndLikeSP,
  createGetUserByIdSP,
  createGetUserByUserNameSP,
  createGetUserByFacebookIdSP,
  createGetUserByGoogleIdSP,
  createGetUserByEmailSP,
  createGetMediumByOriginalUrlSP,
  createGetPinSP,
  createGetLikeSP,
  createGetFavoriteSP,
  createGetMerchantSP,
  createGetLocationSP,

  // Create Record
  createCreateUserSP,
  createCreatePinSP,
  createCreateMediumSP,
  createCreateMediumTypeSP,
  createCreatePinMediumSP,
  createCreatePinMediumLinkSP,
  // createCreateLikeSP,
  // createCreateFavoriteSP,
  createCreateDateTimeSP,
  createCreateMentionSP,
  createCreatePinMentionSP,
  createCreatePinMentionLinkSP,

  // Update Record
  createUpdateUserSP,
  createUpdatePinSP,
  // createUpdateLikeSP,

  // Delete Record
  createDeleteUserByIdSP,
  createDeletePinMediumByPinMediumIdSP,
  createDeletePinSP,
  createDeleteLikeSP,
  createDeleteLikeByPinIdSP,
  createDeleteFavoriteSP,
  createDeleteFavoriteByPinIdSP,
  createDeleteMerchantSP,
  createDeleteMerchantByPinIdSP,
  createDeleteLocationSP,
  createDeleteLocationByPinIdSP,
  createDeletePinMentionByPinIdSP,
  createDeleteFollowUserSP,

  // Upsert Record
  createMergeLikeSP,
  createMergeFavoriteSP,
  createMergeMerchantSP,
  createMergeLocationSP,
  createMergeFollowUserSP,

  // Admin Delete
  createAdminDeleteUserByIdSP,

  // Function
  createGetPrevPinIdsPaginatedFunc,
  createGetNextPinIdsPaginatedFunc

} = require('./createSP');


// Create Table Valued Parameters
// const createMediumTableType = require('./createMediumTableType').createMediumTableType;

execute()
  .then(arg => {
    //process.exit();
  })
  .catch(arg => {
    //process.exit();
  }).finally(() => {
    cp.closeConnection();
  });

function execute() {
  console.log('Begin setupSP');
  tableSetup(cp);
  spSetup(cp);

  return cp.getConnection()
    .then(conn => {
      console.log('Begin createSP');
      //return Promise.all(
      return [
        // Create Table
        createUser,
        createLocation,
        createMedium,
        createMediumType,
        createPin,
        createPinMedium,
        createClick,
        createComment,
        createFavorite,
        createLike,
        createDateTime,
        createMerchant,
        createMention,
        createPinMention,
        createCircle,
        createUserCircle,
        createPinCircle,
        createFollowUser,
        createView,

        // Views
        createPinView,
        createPinBaseView,

        // Retruns Collection
        createGetPinsWithFavoriteAndLikeArrayNextFullPinSP,
        createGetPinsWithFavoriteAndLikeNextSP,
        createGetPinsWithFavoriteAndLikePrevSP,
        createGetPinsWithFavoriteAndLikeInitialSP,
        createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP,
        createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP,
        createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP,
        createGetPinByIdsSP,
        createGetPinByIdsFilterByHasFavoriteSP,
        createGetAllUsersSP,
        createGetDateTimesByStartEndDateSP,
        createGetPinsWithFavoriteAndLikeArrayNextSP,
        createSearchPinSP,
        createGetPinAuthorThreadSP,
        createGetPinAuthorThreadWithFavoriteAndLikeSP,
        createGetPinByTagsFilterByHasFavoriteSP,
        createGetPinByTagsSP,
        createGetPinForEditSP,
        createGetFollowingUsersByUserIdSP,
        createGetFollowerUsersByUserIdSP,
        createGetIsFollowingByUserNameSP,
        createGetAllFollowUsersSP,

        createUpdateAlFollowUserCheckedDateTimeSP,
        createGetFollowUserUnreadCountSP,
        createGetFollowUserUnreadSP,

        // Returns Single Result
        createGetPinWithFavoriteAndLikeSP,
        createGetUserByIdSP,
        createGetUserByUserNameSP,
        createGetUserByFacebookIdSP,
        createGetUserByGoogleIdSP,
        createGetUserByEmailSP,
        createGetMediumByOriginalUrlSP,
        createGetPinSP,
        createGetLikeSP,
        createGetFavoriteSP,
        createGetMerchantSP,
        createGetLocationSP,

        // Create Record
        createCreateUserSP,
        createCreatePinSP,
        createCreateMediumSP,
        createCreateMediumTypeSP,
        createCreatePinMediumSP,
        createCreatePinMediumLinkSP,
        //createCreateLikeSP,
        //createCreateFavoriteSP,
        createCreateDateTimeSP,
        createCreateMentionSP,
        createCreatePinMentionSP,
        createCreatePinMentionLinkSP,
        createDeleteFollowUserSP,

        // Update Record
        createUpdateUserSP,
        createUpdatePinSP,
        //createUpdateLikeSP,

        // Delete Record
        createDeleteUserByIdSP,
        createDeletePinMediumByPinMediumIdSP,
        createDeletePinSP,
        createDeleteLikeSP,
        createDeleteLikeByPinIdSP,
        createDeleteFavoriteSP,
        createDeleteFavoriteByPinIdSP,
        createDeleteMerchantSP,
        createDeleteMerchantByPinIdSP,
        createDeleteLocationSP,
        createDeleteLocationByPinIdSP,

        createMergeLikeSP,
        createMergeFavoriteSP,
        createMergeMerchantSP,
        createMergeLocationSP,
        createDeletePinMentionByPinIdSP,
        createMergeFollowUserSP,

        // Admin Delete
        createAdminDeleteUserByIdSP,

        // Function
        createGetPrevPinIdsPaginatedFunc,
        createGetNextPinIdsPaginatedFunc

        // Create Table Valued Parameters
        // createMediumTableType
      ].reduce((prev, cur) => prev.then(cur), Promise.resolve())
        //)
        .then(values => {
          console.log(values); // [3, 1337, "foo"]
          console.log('Completed createSP');
        })
      //.then(executeListSP)
      // .then(response => {
      //   console.log('log:', response);
      // });
    })
    .catch(res => {
      console.log('execute catch:', res);
    });
}

function executeListSP() {
  //console.log('executeListSP');

  const sql = `
        select *
        from Chronopin.information_schema.routines
        where routine_type = 'PROCEDURE'
        `;
  return cp.getConnection()
    .then(conn => {
      return new Promise((resolve, reject) => {
        new Request(conn).query(sql, (err, result) => {
          if (err) {
            console.log('list sp:err', err);
            reject(err);
          } else {
            console.log('list sp', result);
            resolve(result);
          }
        });
      });
    });
}
