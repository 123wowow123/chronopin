'use strict';

(function () {

    function PinAppFactory(modelInjector, socket, $rootScope) {
        let Bags;

        return class PinApp { // should extend emit

            // properties: _bags, _searchBags

            bagsYOffset = 0;
            searchBagsYOffset = 0;

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

                // init
                this.initSocket();

            }

            //// Setters 

            // Bags

            mergeBagsWithPins(pins) {
                return this._bags.mergePins(pins);
            }

            updateBagsWithPins(pins) {
                return this._bags.updatePins(pins);
            }

            mergeBagsWithDateTimes(dateTimes) {
                return this._bags.mergeDateTimes(dateTimes);
            }

            findClosestFutureBagByDateTime(dateTime) {
                return this._bags.findClosestFutureBagByDateTime(dateTime);
            }

            isWithinBagDateRange(dateTime) {
                return this._bags.isWithinDateRange(dateTime);
            }

            getBagsFirstInViewAsc() {
                return this._bags.getFirstInViewAsc();
            }

            // Search Bags

            clearSearchBags() {
                return this._searchBags = new Bags();
            }

            mergeSearchBagsWithPins(pins) {
                return this._searchBags.mergePins(pins);
            }

            updateSearchBagsWithPins(pins) {
                return this._searchBags.updatePins(pins);
            }

            mergeSearchBagsWithDateTimes(dateTimes) {
                return this._searchBags.mergeDateTimes(dateTimes);
            }

            findClosestFutureSearchBagByDateTime(dateTime) {
                return this._searchBags.findClosestFutureBagByDateTime(dateTime);
            }

            isWithinSearchBagDateRange(dateTime) {
                return this._searchBags.isWithinDateRange(dateTime);
            }

            getSearchBagsFirstInViewAsc() {
                return this._searchBags.getFirstInViewAsc();
            }

            //// All Bags

            updateAllBagsWithPins (items) {
                this.updateBagsWithPins(items);
                this.updateSearchBagsWithPins(items);
            };

            //// Getters

            getBags() {
                return this._bags;
            }

            getSearchBags() {
                return this._searchBags;
            }

            initSocket() {

                socket.syncUpdates('pin', (event, item) => { ////////////////////////////
                    // debugger
                    const itemTime = new Date(item.utcStartDateTime);
                    const inRange = this.isWithinBagDateRange(itemTime);
                    const inSearchRange = this.isWithinSearchBagDateRange(itemTime);

                    if (!inRange && !inSearchRange) {
                        return;
                    }

                    switch (event) {
                        case "pin:save":
                            this.mergeBagsWithPins([item]);
                            break;

                        case "pin:update":
                        case "pin:favorite":
                        case "pin:unfavorite":
                        case "pin:like":
                        case "pin:unlike":
                            this.updateAllBagsWithPins([item]);
                            break;
                    }

                    $rootScope.$digest()

                });
            }

        };

    }

    angular.module('chronopinNodeApp.model')
        .factory('PinAppFactory', PinAppFactory);

})();
