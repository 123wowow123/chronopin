/*jshint unused:false*/
'use strict';

(function () {

    class Controller {

        constructor($scope) {
        }

        $onInit() {

        }

        getSentimentKey(score) {
            switch (true) {
                case score >= -0.2 && score <= 0.2:
                    return 'neutral';
                case score > 0.2 && score <= 0.6:
                    return 'positive';
                case score > 0.6:
                    return 'very positive';
                case score < -0.2 && score >= -0.6:
                    return 'negative';
                case score < -0.6:
                    return 'very negative';
            }
        }

    }

    angular.module('chronopinNodeApp')
        .component('sentimentBlock', {
            controller: Controller,
            bindings: {
                sentimentScore: '<'
            },
            templateUrl: 'components/sentiment-block/sentiment-block.html',
        });
})();
