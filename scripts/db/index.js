'use strict';

require('babel-register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const cp = require('../../server/sqlConnectionPool');
const Request = cp.Request;

// Setup
const createTable = require('./createTable');
const createSP = require('./createSP');

// Create Table
const createUser = createTable.createUser;
const createAddress = createTable.createAddress;
const createClick = createTable.createClick;
const createComment = createTable.createComment;
//const createFavorite = createTable.createFavorite;
//const createLike = createTable.createLike;
const createMedium = createTable.createMedium;
const createMediumType = createTable.createMediumType;
const createPin = createTable.createPin;
const createPinMedium = createTable.createPinMedium;
const createDateTime = createTable.createDateTime;
const createMerchant = createTable.createMerchant;

// Create View
const createPinView = createTable.createPinView;
const createPinBaseView = createTable.createPinBaseView;

// Retruns Collection
const createGetPinsWithFavoriteAndLikeNextSP = createSP.createGetPinsWithFavoriteAndLikeNextSP;
const createGetPinsWithFavoriteAndLikePrevSP = createSP.createGetPinsWithFavoriteAndLikePrevSP;
const createGetPinsWithFavoriteAndLikeInitialSP = createSP.createGetPinsWithFavoriteAndLikeInitialSP;
const createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP = createSP.createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP;
const createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP = createSP.createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP;
const createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP = createSP.createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP;
const createGetPinByIdsSP = createSP.createGetPinByIdsSP;
const createGetPinByIdsFilterByHasFavoriteSP = createSP.createGetPinByIdsFilterByHasFavoriteSP;
const createGetAllUsersSP = createSP.createGetAllUsersSP;
const createGetDateTimesByStartEndDateSP = createSP.createGetDateTimesByStartEndDateSP;
const createGetPinsWithFavoriteAndLikeArrayNextSP = createSP.createGetPinsWithFavoriteAndLikeArrayNextSP;
const createSearchPinSP = createSP.createSearchPinSP;
const createGetPinAuthorThreadSP = createSP.createGetPinAuthorThreadSP;
const createGetPinAuthorThreadWithFavoriteAndLikeSP = createSP.createGetPinAuthorThreadWithFavoriteAndLikeSP;

// Returns Single Result
const createGetPinWithFavoriteAndLikeSP = createSP.createGetPinWithFavoriteAndLikeSP;
const createGetUserByIdSP = createSP.createGetUserByIdSP;
const createGetUserByFacebookIdSP = createSP.createGetUserByFacebookIdSP;
const createGetUserByGoogleIdSP = createSP.createGetUserByGoogleIdSP;
const createGetUserByEmailSP = createSP.createGetUserByEmailSP;
const createGetMediumByOriginalUrlSP = createSP.createGetMediumByOriginalUrlSP;
const createGetPinSP = createSP.createGetPinSP;
const createGetLikeSP = createSP.createGetLikeSP;
const createGetFavoriteSP = createSP.createGetFavoriteSP;
const createGetMerchantSP = createSP.createGetMerchantSP;

// Create Record
const createCreateUserSP = createSP.createCreateUserSP;
const createCreatePinSP = createSP.createCreatePinSP;
const createCreateMediumSP = createSP.createCreateMediumSP;
const createCreateMediumTypeSP = createSP.createCreateMediumTypeSP;
const createCreatePinMediumSP = createSP.createCreatePinMediumSP;
const createCreatePinMediumLinkSP = createSP.createCreatePinMediumLinkSP;
//const createCreateLikeSP = createSP.createCreateLikeSP;
//const createCreateFavoriteSP = createSP.createCreateFavoriteSP;
const createCreateDateTimeSP = createSP.createCreateDateTimeSP;

// Update Record
const createUpdateUserSP = createSP.createUpdateUserSP;
const createUpdatePinSP = createSP.createUpdatePinSP;
//const createUpdateLikeSP = createSP.createUpdateLikeSP;

// Delete Record
const createDeleteUserByIdSP = createSP.createDeleteUserByIdSP;
const createDeletePinMediumByPinMediumIdSP = createSP.createDeletePinMediumByPinMediumIdSP;
const createDeletePinSP = createSP.createDeletePinSP;
const createDeleteLikeSP = createSP.createDeleteLikeSP;
const createDeleteLikeByPinIdSP = createSP.createDeleteLikeByPinIdSP;
const createDeleteFavoriteSP = createSP.createDeleteFavoriteSP;
const createDeleteFavoriteByPinIdSP = createSP.createDeleteFavoriteByPinIdSP;
const createDeleteMerchantSP = createSP.createDeleteMerchantSP;
const createDeleteMerchantByPinIdSP = createSP.createDeleteMerchantByPinIdSP;

// Upsert Record
const createMergeLikeSP = createSP.createMergeLikeSP;
const createMergeFavoriteSP = createSP.createMergeFavoriteSP;
const createMergeMerchantSP = createSP.createMergeMerchantSP;

// Admin Delete
const createAdminDeleteUserByIdSP = createSP.createAdminDeleteUserByIdSP;
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
  createTable.setup(cp);
  createSP.setup(cp);

  return cp.getConnection()
    .then(conn => {
      console.log('Begin createSP');
      //return Promise.all(
      return [
        // Create Table
        createUser,
        createAddress,
        createMedium,
        createMediumType,
        createPin,
        createPinMedium,
        createClick,
        createComment,
        //createFavorite,
        //createLike,
        createDateTime,
        createMerchant,

        // Views
        createPinView,
        createPinBaseView,

        // Retruns Collection
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

        // Returns Single Result
        createGetPinWithFavoriteAndLikeSP,
        createGetUserByIdSP,
        createGetUserByFacebookIdSP,
        createGetUserByGoogleIdSP,
        createGetUserByEmailSP,
        createGetMediumByOriginalUrlSP,
        createGetPinSP,
        createGetLikeSP,
        createGetFavoriteSP,
        createGetMerchantSP,

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

        createMergeLikeSP,
        createMergeFavoriteSP,
        createMergeMerchantSP,

        // Admin Delete
        createAdminDeleteUserByIdSP,

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

  let sql = `
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
