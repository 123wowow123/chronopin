'use strict';

(function () {

    function Factory($injector) {
        const BaseTag = $injector.get('BaseTag');
        return class DollarTagTool extends BaseTag {

            static get sanitize() {
                return {
                    chronodollar: true
                };
            }

            constructor(args) {
                super(args);
                this.tag = 'chronodollar';
                this.class = 'chrono-dollar-highlight';
            }
        }
    }

    angular.module('chronopinNodeApp.textEditor')
        .factory('DollarTagTool', Factory);

})();
