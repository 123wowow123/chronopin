'use strict';

(function () {
    angular.module('chronopinNodeApp')
        .service('MetaService', (appConfig) => {
            let title, description, image, mediaType, canonical;
            function reset() {
                title = appConfig.meta.title;
                description = appConfig.meta.description;
                image = appConfig.meta.image;
                mediaType = appConfig.meta.mediaType;
                canonical = appConfig.meta.canonical;
            }
            reset();

            return {
                reset,
                set: (newTitle, newMetaDescription, newImage, canonical) => {
                    title = newTitle;
                    description = newMetaDescription;
                    image = newImage;
                    canonical = canonical;
                },
                metaTitle: () => { return title; },
                metaDescription: () => { return description; },
                metaImage: () => { return image; },
                metaMediaType: () => { return mediaType; },
                metaCanonical: () => { return canonical; },

                extractMeta: (pin) => {
                    const config = appConfig;
                    const getOgType = (mediumID) => {
                        switch (+mediumID) {
                            case config.mediumID.image:
                                return 'og:image';
                            case config.mediumID.youtube:
                                return 'og:video';
                            case config.mediumID.twitter:
                                return undefined;
                        }
                    };
                    const getImageUrl = (medium) => {
                        return medium.thumbName ? config.thumbUrlPrefix + medium.thumbName : undefined;
                    };
                    const getUrl = (medium) => {
                        switch (+medium.type) {
                            case config.mediumID.image:
                                return getImageUrl(medium);
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
                    };
                    const extractMetaInner = (pin, createDom, _) => {
                        const canonical = `${config.meta.canonical}/pin/${pin.id}`;
                        const document = createDom(pin.description);

                        const querySelector = document.querySelector('p');
                        const description = querySelector && querySelector.textContent ? querySelector.textContent.trim() : '';
                        const medium = _.get(pin, 'media[0]');
                        let mediaContentType, mediaType, mediaWidth, mediaHeight;
                        let mediaContent = medium ? getUrl(medium) : '';
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
                            mediaType = getOgType(medium.type);
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
                    }

                    return extractMetaInner(
                        pin,
                        (fragmentString) => {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(fragmentString, 'text/html');
                            return doc;
                        }, _);
                }
            };
        });
})();