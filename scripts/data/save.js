/**
 * Populate DB with sample data
 */

'use strict';

const fs = require('fs');
const azureBlob = require('../../server/azure-blob');

const Model = require('../../server/model');
const FullPins = Model.FullPins;
const Users = Model.Users;
const Comments = Model.Comments;
const Follow = Model.Follow;
const Company = Model.Company;


let cp,
  pinFilePath,
  userFilePath,
  commentFilePath,
  followFilePath,
  companyFilePath;

const pickUserProps = [
  'id',
  'userName',
  'firstName',
  'lastName',
  'gender',
  'locale',
  'facebookId',
  'googleId',
  'pictureUrl',
  'fbUpdatedTime',
  'fbVerified',
  'googleVerified',
  'about',
  'email',
  'password',
  'role',
  'provider',
  'salt',
  'websiteUrl',
  'defaultFilterSpanPreference',
  'utcCreatedDateTime',
  'utcUpdatedDateTime',
  'utcDeletedDateTime'
];

// Setup
module.exports.setup = function (saveOpt) {
  cp = saveOpt.cp;
  pinFilePath = saveOpt.pinfile;
  userFilePath = saveOpt.userfile;
  commentFilePath = saveOpt.commentfile;
  followFilePath = saveOpt.followfile;
  companyFilePath = saveOpt.companyfile;
  return this;
};

module.exports.saveDB = function () {

  const fromDateTime = new Date(0),
    userId = 0,
    lastPinId = 0,
    pageSize = 2147483647; // No limit: back up every pin

  return Promise.resolve('Begin Backup')
    .then(() => {

      console.log('Backup Companies');
      return Company.getAll()
        .then(companies => {
          return fs.writeFileSync(companyFilePath, JSON.stringify(companies, null, 2));
        });

    })
    .then(() => {

      console.log('Backup Pins');
      return FullPins.queryForwardByDate(fromDateTime, userId, lastPinId, pageSize)
        .then(({
          pins
        }) => {
          return fs.writeFileSync(pinFilePath, JSON.stringify(pins, null, 2));
        });

    })
    .then(() => {

      // users should be saved last to prevent orphaned pin
      console.log('Backup Users');
      return Users.getAll(pickUserProps)
        .then(({
          users
        }) => {
          return fs.writeFileSync(userFilePath, JSON.stringify(users, null, 2));
        });

    })
    .then(() => {

      console.log('Backup Comments');
      return Comments.getAll()
        .then(({
          comments
        }) => {
          return fs.writeFileSync(commentFilePath, JSON.stringify(comments.comments, null, 2));
        });

    })
    .then(() => {

      console.log('Backup Follows');
      return Follow.getAll()
        .then(({
          follows
        }) => {
          return fs.writeFileSync(followFilePath, JSON.stringify(follows, null, 2));
        });

    })
    .then(() => {
      console.log('Data Backup Complete');
    })
    .catch((err) => {
      console.log('Backup err:', err);
    });
}
