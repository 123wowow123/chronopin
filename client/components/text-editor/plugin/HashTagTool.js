'use strict';

(function () {

    function Factory($injector) {
        const BaseTag = $injector.get('BaseTag');
        return class HashTagTool extends BaseTag {

            static get sanitize() {
                return {
                    chronohash: true
                };
            }

            constructor(args) {
                super(args);
                this.tag = 'chronohash';
                this.class = 'chrono-hash-highlight';
            }
        }
    }

    angular.module('chronopinNodeApp.textEditor')
        .factory('HashTagTool', Factory);

})();
