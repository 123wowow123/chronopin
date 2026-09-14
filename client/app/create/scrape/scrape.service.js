/*jshint unused:false*/
'use strict';

(function () {

    angular.module('chronopinNodeApp')
        .service('scrapeService', function (appConfig, $http, Util) {

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
                const formDates = Util.pinToFormDates(pin);
                thisPin.start = formDates.start;
                thisPin.end = formDates.end;
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
                thisPin.latitude = pin.latitude;
                thisPin.longitude = pin.longitude;
                thisPin.price = pin.price;
                thisPin.priceCurrency = pin.priceCurrency;
                const formDates = Util.pinToFormDates(pin);
                thisPin.start = formDates.start;
                thisPin.end = formDates.end;
                thisPin.allDay = pin.allDay;
                thisPin.media = pin.media;
                thisPin.merchants = pin.merchants;

                // The form has no inputs for these, but a pin update writes every
                // one of them, so anything not carried back here is saved as
                // NULL - an unrelated edit would wipe the extracted fields.
                thisPin.longFormSummary = pin.longFormSummary;
                thisPin.dateConfidence = pin.dateConfidence;
                thisPin.dateConfidenceReasoning = pin.dateConfidenceReasoning;
                thisPin.company = pin.company;
                thisPin.companyWikiUrl = pin.companyWikiUrl;
                thisPin.category = pin.category;
                thisPin.priceLowerBound = pin.priceLowerBound;
                thisPin.priceUpperBound = pin.priceUpperBound;
                thisPin.tip = pin.tip;

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
                let allDay = pin.allDay;
                const dates = Util.formDatesToPin(pin.start, pin.end, allDay);

                // Must name every column a pin update writes, not just the ones
                // the form has inputs for: a field left out of this object is
                // absent from the request and saved as NULL, so an unrelated
                // edit would wipe it.
                let newPin = {
                    id: pin.id,
                    parentId: pin.parentId,
                    title: pin.title,
                    description: pin.description,
                    sourceUrl: pin.sourceUrl,
                    address: pin.address,
                    latitude: pin.latitude,
                    longitude: pin.longitude,
                    price: pin.price,
                    priceCurrency: pin.priceCurrency,
                    priceLowerBound: pin.priceLowerBound,
                    priceUpperBound: pin.priceUpperBound,
                    longFormSummary: pin.longFormSummary,
                    dateConfidence: pin.dateConfidence,
                    dateConfidenceReasoning: pin.dateConfidenceReasoning,
                    company: pin.company,
                    companyWikiUrl: pin.companyWikiUrl,
                    category: pin.category,
                    tip: pin.tip,
                    utcStartDateTime: dates.utcStartDateTime, // ISO 8601 with toJSON
                    utcEndDateTime: dates.utcEndDateTime,
                    allDay: allDay,
                    merchants: pin.merchants,
                    media: pin.useMedia && pin.selectedMedia ? [pin.selectedMedia] : undefined
                };
                return _.omitBy(newPin, _.isNull);
            }

        });
})();
