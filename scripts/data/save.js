/**
 * Populate DB with sample data
 */

'use strict';

const fs = require('fs');
const azureBlob = require('../../server/azure-blob');

const Model = require('../../server/model');
const FullPins = Model.FullPins;
const Users = Model.Users;


let cp,
  Request,
  pinFilePath,
  userFilePath;

const pickUserProps = [
  'id',
  'firstName',
  'lastName',
  'userName',
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
  'utcCreatedDateTime',
  'utcUpdatedDateTime',
  'utcDeletedDateTime'
];

// Setup
module.exports.setup = function (saveOpt) {
  cp = saveOpt.cp;
  Request = cp.Request;
  pinFilePath = saveOpt.pinfile;
  userFilePath = saveOpt.userfile;
  return this;
};

module.exports.saveDB = function () {

  const fromDateTime = new Date(0),
    userId = 0,
    lastPinId = 0,
    pageSize = 2147483647; // Maximum values for an integer in SQL Server

  return Promise.resolve('Begin Backup')
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
      console.log('Data Backup Complete');
    })
    .catch((err) => {
      console.log('Backup err:', err);
    });
}
