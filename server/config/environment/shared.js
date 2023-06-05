'use strict';

// This data also goes into client config
exports = module.exports = {
  searchPrefix: {
    threadEmoji: "🧵",
    hashTag: "#"
  },
  // List of user roles
  userRoles: ['guest', 'user', 'admin'],
  searchChoices: [
    { name: 'All', value: undefined },
    { name: 'Watched', value: 'watch' }
    //'People'
  ],
  thumbWidth: 500,
  uploadImageWidth: 1000,
  thumbUrlPrefix: 'https://chronopin.blob.core.windows.net/thumb/',
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
  },
  gMapKey: `AIzaSyA2Y5rx_RbJh-kHVW6H-_I-_gmkl8qB9O0`,
  meta: {
    title: 'Chronopin',
    description: 'Discover and track upcoming, release dates, events, and other important dates.',
    image: '/assets/images/favicon.ico',
    type: 'website'
  }
};
