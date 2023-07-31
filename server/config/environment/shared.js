'use strict';

// This data also goes into client config
let config;
const thumbFolder = 'thumb';
exports = module.exports = config = {
  searchPrefix: {
    threadEmoji: "🧵",
    hashTag: "#"
  },
  // List of user roles
  userRoles: ['guest', 'user', 'admin'],
  searchChoices: [
    { name: 'All', value: undefined },
    { name: 'Watched', value: 'watch' },
    { name: 'Mine', value: 'mine' }
    //'People'
  ],
  uploadImage: {
    small: {
      width: 450,
      postFix: ''
    },
    large: {
      width: 1000,
      postFix: '-chrono-lg'
    }
  },
  thumbFolder: thumbFolder,
  thumbUrlPrefix: `https://chronopin.blob.core.windows.net/${thumbFolder}/`,
  fbAppId: '560731380662615',
  gaAppId: 'G-N7Q4YYVSC9',
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
    canonical: `https://www.chronopin.com`,
    title: 'Chronopin',
    description: 'Discover and track upcoming, release dates, events, and other important dates.',
    image: '/assets/images/favicon.ico',
    mediaType: 'og:image',
    type: 'website'
  },
  filemoon: {
    thumbUrlPrefix: 'https://img-place.com'
  },
  extractMeta: (pin, createDom, _) => {
    const canonical = `${config.meta.canonical}/pin/${pin.id}`;
    const document = createDom(pin.description);

    const querySelector = document.querySelector('p');
    const description = querySelector && querySelector.textContent ? querySelector.textContent.trim() : '';
    const medium = _.get(pin, 'media[0]');
    let mediaContentType, mediaType, mediaWidth, mediaHeight;
    let mediaContent = medium ? config.getUrl(medium) : '';
    if (!mediaContent) {
      const querySelector = document.querySelector('img');
      mediaContent = querySelector && querySelector.src ? querySelector.src : '';
      mediaType = 'og:image';
      if (!mediaContent) {
        const querySelector = document.querySelector('iframe');
        let src = querySelector && querySelector.src ? querySelector.src : '';
        if (src) {
          const filemoonRex = /https:\/\/filemoon\.sx\/e\/([^\/\?\&]*)\/.*/
          let result1, matchId;
          result1 = filemoonRex.exec(src)
          matchId = result1 && result1[1];
          if (matchId) {
            const thumbUrlPrefix = config.filemoon.thumbUrlPrefix;
            mediaContent = `${thumbUrlPrefix}/${matchId}.jpg`;
          }
        }
      }
    } else {
      mediaType = config.getOgType(medium.type);
      // mediaWidth = medium.thumbWidth;
      // mediaHeight = medium.thumbHeight;
    }

    if (mediaType === 'og:image') {
      mediaContent = mediaContent.replace(config.uploadImage.large.postFix, '');
      mediaContent = mediaContent.replace('.webp', '.jpeg');
      mediaContentType = `<meta property="og:image:type" content="image/jpeg" />`;
    }

    const meta = {
      canonical,
      title: pin.title,
      description,
      mediaContent,
      mediaType,
      mediaContentType,
      type: 'article'
    };

    return meta;
  },
  getOgType: (mediumID) => {
    switch (+mediumID) {
      case config.mediumID.image:
        return 'og:image';
      case config.mediumID.youtube:
        return 'og:video';
      case config.mediumID.twitter:
        return undefined;
    }
  },
  getImageUrl: (medium) => {
    return medium.thumbName ? config.thumbUrlPrefix + medium.thumbName : undefined;
  },
  getUrl: (medium) => {
    switch (+medium.type) {
      case config.mediumID.image:
        return config.getImageUrl(medium);
      case config.mediumID.youtube:
        const parsedUrl = URL.parse(medium.originalUrl);
        if (!parsedUrl.protocol) {
          parsedUrl.protocol = 'https:';
        }
        const outUrl = parsedUrl.protocol + parsedUrl.pathname;
        return outUrl;
      case config.mediumID.twitter:
        return medium.originalUrl;
    }
  }

};
