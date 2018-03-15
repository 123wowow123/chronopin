'use strict';

(function () {

    function PinAppFactory(modelInjector) {
        let Bags;

        return class PinApp { // should extend emit

            // properties: _bags, _searchBags

            constructor(args) {
                // Lazy load to prevent Angular circular dependency
                Bags = Bags || modelInjector.getBags();

                // bags
                if (args && args.bags) {
                    this._bags = args.bags;
                }
                else {
                    this._bags = new Bags();
                }

                // searchBags
                if (args && args.searchBags) {
                    this._searchBags = args.searchBags;
                }
                else {
                    this._searchBags = new Bags();
                }

            }

            //// Setters 

            // Bags

            mergeBagsWithPins(pins) {
                return this._bags.mergePins(pins);
            }

            mergeBagsWithDateTimes(dateTimes) {
                return this._bags.mergeDateTimes(dateTimes);
            }

            // Search Bags

            mergeSearchBagsWithPins(pins) {
                return this._searchBags.mergePins(pins);
            }

            mergeSearchBagsWithDateTimes(dateTimes) {
                return this._searchBags.mergeDateTimes(dateTimes);
            }

            //// Getters

            getBags() {
                return this._bags;
            }

            getSearchBags() {
                return this._searchBags;
            }

        };

    }

    angular.module('chronopinNodeApp.model')
        .factory('PinAppFactory', PinAppFactory);

})();
