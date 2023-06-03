'use strict';

(function () {
    angular.module('chronopinNodeApp')
        .service('MetaService', (appConfig) => {
            let title, description, image;
            function reset() {
                title = appConfig.title;
                description = appConfig.description;
                image = appConfig.image;
            }
            reset();

            return {
                reset,
                set: (newTitle, newMetaDescription, newImage) => {
                    title = newTitle;
                    description = newMetaDescription;
                    image = newImage;
                },
                metaTitle: () => { return title; },
                metaDescription: () => { return description; },
                metaImage: () => { return image; }
            };
        })
})();