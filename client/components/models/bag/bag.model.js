/*global pluralize*/
'use strict';

(function () {

  function BagFactory(modelInjector) {
    let DateTime, Pin;

    // Private Bag methods

    function _sortDate(a, b) {
      return _getSortDateKey(a) - _getSortDateKey(b);
    }

    function _getSortDateKey(a) {
      return a.utcStartDateTime.getTime();
    }

    function _sortedPush(array, value) {
      array.splice(_.sortedIndexBy(array, value, _getSortDateKey), 0, value);
    }

    return class Bag {

      // properties: utcStartDateTime, dateTimes, pins

      constructor(bag) {
        // Lazy load to prevent Angular circular dependency
        DateTime = DateTime || modelInjector.getDateTime();
        Pin = Pin || modelInjector.getPin();

        this.dateTimes = [];
        this.pins = [];

        if (_.isPlainObject(bag) || bag instanceof Bag) {
          // Init Key
          this.utcStartDateTime = bag.utcStartDateTime;

          // Init properties
          this.mergeDateTimes(bag.dateTimes);
          this.mergePins(bag.pins);

        } else {
          throw new Error("Constructor arg not a Plain Object || Instance of Bag");
        }
      }

      // Public Bag methods

      // ToDo: move to filter // currently used as a key field
      toISODateTimeString() {
        //debugger;
        return this.utcStartDateTime.toISOString();
      }

      getDateSince(dateTimeOrString) {
        let dateSpan = this.getDateSpan();
        return dateSpan.start.diff(dateSpan.end, 'days', true);
      }

      getDateSpan(dateTimeOrString) {
        let start = moment(this.utcStartDateTime).startOf('day'),
          end = moment(dateTimeOrString).startOf('day');
        return {
          start: start,
          end: end
        };
      }

      merge(bag) {
        if (!(bag instanceof Bag)) {
          bag = new Bag(bag);
        }
        this.mergeDateTime(bag.dateTimes);
        this.mergePins(bag.pins);
        return this;
      }

      // Public DateTime methods

      mergeDateTimes(dateTimes) {
        let createCount = 0;
        if (_.isArray(dateTimes)) {
          dateTimes.forEach(dateTime => {
            if (!(dateTime instanceof DateTime)) {
              dateTime = new DateTime(dateTime);
            }
            let foundDateTime = _.find(this.dateTimes, {
              id: dateTime.id
            });
            if (foundDateTime) {
              _.merge(foundDateTime, dateTime);
            } else {
              createCount++;
              _sortedPush(this.dateTimes, dateTime);
            }
          });
        }

        return createCount;
      }

      findDateTimeById(id) {
        return _.find(this.dateTimes, {
          'id': id
        });
      }

      removeDateTimeById(id) {
        let index = _.findIndex(this.dateTimes, {
          'id': id
        });
        if (index > -1) {
          return this.dateTimes.splice(index, 1)[0];
        }
      }

      // Public Pin methods

      mergePins(pins) {
        let createCount = 0;
        if (_.isArray(pins)) {
          pins.forEach(pin => {
            if (!(pin instanceof Pin)) {
              pin = new Pin(pin);
            }
            let foundPin = _.find(this.pins, {
              id: pin.id
            });
            if (foundPin) {
              _.merge(foundPin, pin);
            } else {
              createCount++;
              _sortedPush(this.pins, pin);
            }
          });
        }
        return createCount;
      }

      findPinById(id) {
        return _.find(this.pins, {
          'id': id
        });
      }

      removePinById(id) {
        let index = _.findIndex(this.pins, {
          'id': id
        });
        if (index > -1) {
          return this.pins.splice(index, 1)[0];
        }
      }

    };

  }

  angular.module('chronopinNodeApp.model')
    .factory('BagFactory', BagFactory);

})();
