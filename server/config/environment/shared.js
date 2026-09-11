'use strict';

// This data also goes into client config
exports = module.exports = {
  // List of user roles
  userRoles: ['guest', 'user', 'admin'],
  searchChoices: [
    { name: 'All', value: undefined },
    { name: 'Watched', value: 'watch' }
    //'People'
  ],
  thumbWidth: 400,
  uploadImageWidth: 1000,
  // Development serves thumbs from the local Azurite emulator; the production
  // blobs this used to point at no longer exist.
  thumbUrlPrefix: process.env.NODE_ENV === 'development' ?
    'http://127.0.0.1:10000/devstoreaccount1/thumb/' :
    'https://chronopin.blob.core.windows.net/thumb/',
  fbAppId: '560731380662615',
  gaAppId: 'UA-103783559-1',
  scrapeType: {
    web: "web",
    twitter: "twitter",
    youtube: "youtube"
  },
  mediumID: {
    image: 1,
    twitter: 2,
    youtube: 3,
  }
};
