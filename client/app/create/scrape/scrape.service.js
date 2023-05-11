/*jshint unused:false*/
'use strict';

(function () {

    angular.module('chronopinNodeApp')
        .service('scrapeService', function (appConfig, $http) {

            this.scrapeImage = (thisPin, url) => {
                let config = {
                    params: {
                        url: url
                    }
                };
                return $http.get('/api/scrape', config)
                    .then(res => {
                        thisPin.type = _.get(res.data, 'type');
                        return this.setPinImageFromScrapeAndSelect(thisPin, res.data)
                    });
            };

            this.scrapePage = (thisPin, url) => {
                let config = {
                    params: {
                        url: url
                    }
                };
                return $http.get('/api/scrape', config)
                    .then(res => {
                        switch (res.data.type) {
                            case appConfig.scrapeType.web:
                                this.setPinFromWebScrape(thisPin, res.data);
                                break;
                            case appConfig.scrapeType.twitter:
                                this.setPinFromTwitterScrape(thisPin, res.data);
                                break;
                            case appConfig.scrapeType.youtube:
                                this.setPinFromYoutubeScrape(thisPin, res.data);
                                break;
                        }
                        return thisPin;
                    });
            };

            this.setPinFromWebScrape = (thisPin, pin) => {
                thisPin.type = _.get(pin, 'type');
                thisPin.title = _.get(pin, 'title');
                thisPin.description = _.get(pin, 'description');
                thisPin.start = _.get(pin, 'utcStartDateTime') && new Date(_.get(pin, 'utcStartDateTime'));
                thisPin.end = _.get(pin, 'utcEndDateTime') && new Date(_.get(pin, 'utcEndDateTime'));
                thisPin.allDay = _.get(pin, 'allDay');

                this.setPinImageFromScrapeAndSelect(thisPin, pin);
                return this;
            };

            this.setPinFromTwitterScrape = (thisPin, pin) => {
                thisPin.type = _.get(pin, 'type');
                thisPin.media = _.get(pin, 'media', []);

                this.setPinImageFromScrapeAndSelect(thisPin, pin);
                return this;
            };

            this.setPinFromYoutubeScrape = (thisPin, pin) => {
                thisPin.title = _.get(pin, 'title');
                thisPin.description = _.get(pin, 'description');

                thisPin.type = _.get(pin, 'type');
                thisPin.media = _.get(pin, 'media', []);

                this.setPinImageFromScrapeAndSelect(thisPin, pin);
                return this;
            };

            this.setPinImageFromScrapeAndSelect = (thisPin, pin) => {
                thisPin.media = _.get(pin, 'media');
                const foundMedium = _.get(pin, 'media', []).find(m => {
                    return m.originalUrl === _.get(thisPin, 'selectedMedia.originalUrl');
                });
                thisPin.selectedMedia = foundMedium ? foundMedium : _.get(pin, 'media[0]');
                return this;
            };

            this.setPin = (thisPin, pin) => {
                thisPin.id = pin.id;
                thisPin.parentId = pin.parentId;
                thisPin.sourceUrl = pin.sourceUrl;
                thisPin.title = pin.title;
                thisPin.description = pin.description;
                thisPin.address = pin.address;
                thisPin.price = pin.price;
                thisPin.start = pin.utcStartDateTime && new Date(pin.utcStartDateTime);
                thisPin.end = pin.utcStartDateTime && new Date(pin.utcEndDateTime);
                thisPin.allDay = pin.allDay;
                thisPin.media = pin.media;
                thisPin.merchants = pin.merchants;

                thisPin.selectedMedia = _.get(pin, 'media[0]');
                return this;
            };

            // CRUD Web Service

            this.addPin = (pin) => {
                let newPin = this.formatSubmitPin(pin);
                return $http.post('/api/pins', newPin)
                    .then(response => {
                        return response;
                    });
            }

            this.updatePin = (pin) => {
                let newPin = this.formatSubmitPin(pin);
                return $http.put('/api/pins/' + pin.id, newPin)
                    .then(response => {
                        return response;
                    });
            }

            this.formatSubmitPin = (pin) => {
                let startDateTime, endDateTime, allDay = pin.allDay;
                if (allDay) {
                    // set time portion to midnight
                    startDateTime = this.getDateTimeToDayBegin(pin.start);
                    // set time portion to 1 tick before midnight
                    endDateTime = this.getDateTimeToDayEnd(pin.end);
                } else {
                    startDateTime = pin.start;
                    endDateTime = pin.end;
                }

                let newPin = {
                    id: pin.id,
                    parentId: pin.parentId,
                    title: pin.title,
                    description: pin.description,
                    sourceUrl: pin.sourceUrl,
                    address: pin.address,
                    price: pin.price,
                    utcStartDateTime: startDateTime, // ISO 8601 with toJSON
                    utcEndDateTime: endDateTime,
                    allDay: allDay,
                    merchants: pin.merchants,
                    media: pin.useMedia && pin.selectedMedia ? [pin.selectedMedia] : undefined
                };
                return _.omitBy(newPin, _.isNull);
            }

            this.getDateTimeToDayBegin = (dateTime) => {
                let newDateTime = new Date(dateTime.getTime());
                newDateTime.setHours(0);
                newDateTime.setMinutes(0);
                newDateTime.setSeconds(0);
                newDateTime.setMilliseconds(0);
                return newDateTime;
            }

            this.getDateTimeToDayEnd = (dateTime) => {
                let newDateTime = new Date(dateTime.getTime());
                newDateTime.setHours(23);
                newDateTime.setMinutes(59);
                newDateTime.setSeconds(59);
                newDateTime.setMilliseconds(999);
                return newDateTime;
            }

        });
})();
