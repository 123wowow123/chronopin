'use strict';

(function () {

    function Factory($injector) {
        const BaseTag = $injector.get('BaseTag');
        return class AtTagTool extends BaseTag {
            static get sanitize() {
                return {
                    chronoat: true
                };
            }

            constructor(args) {
                super(args);
                this.tag = 'chronoat';
                this.class = 'chrono-at-highlight';
            }
        }
    }

    angular.module('chronopinNodeApp.textEditor')
        .factory('AtTagTool', Factory);
})();