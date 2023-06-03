'use strict';

(function () {
    angular.module('chronopinNodeApp')
        .service('MetaService', (appConfig) => {
            let title, description, image;
            function reset() {
                title = appConfig.meta.title;
                description = appConfig.meta.description;
                image = appConfig.meta.image;
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