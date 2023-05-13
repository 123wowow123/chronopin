'use strict';

(function () {

  function BagsFactory(modelInjector) {
    let DateTime, Pin, Bag;

    function _convertUTCDateToLocalDate(date) {
      let newDate = new Date(date.getTime());
      newDate.setHours(0);
      newDate.setMinutes(0);
      newDate.setMilliseconds(0);
      newDate.setSeconds(0);
      return newDate;
    }

    function _sortDate(a, b) {
      return _getSortDateKey(a) - _getSortDateKey(b);
    }

    function _getSortDateKey(a) {
      return a.utcStartDateTime.getTime();
    }

    function _sortedPush(array, value) {
      array.splice(_.sortedIndexBy(array, value, _getSortDateKey), 0, value);
      return array.length;
    }

    function _getKey(obj) {
      let dateTime = obj.utcStartDateTime;
      dateTime = _convertUTCDateToLocalDate(dateTime);
      return dateTime;
    }

    function _createDateTime(dateTime) {
      return new DateTime(dateTime);
    }

    function _createPin(pin) {
      return new Pin(pin);
    }

    return class Bags extends Array {
      constructor(...args) {
        // Lazy load to prevent Angular circular dependency
        DateTime = DateTime || modelInjector.getDateTime();
        Bag = Bag || modelInjector.getBag();
        Pin = Pin || modelInjector.getPin();

        // Bags collection is pushed to super Array
        super(...args);
        if (this.length) {
          this.sort(_sortDate);
        }
      }

      // Public Bag methods

      findBagByDateTimeKey(utcStartDateTime) {
        let found = _.find(this, bag => {
          return bag.toISODateTimeString() === utcStartDateTime.toISOString();
        });

        return found;
      }

      findClosestFutureBagByDateTime(utcStartDateTime) {
        let minPositiveDayDelta,
          minPositiveDayDeltaKey,
          minNegativeDayDelta,
          minNegativeDayDeltaKey,
          m = 0,
          n = this.length - 1;
        while (m <= n) {
          let k = (n + m) >> 1;
          let daySince = this[k].getDateSince(utcStartDateTime);

          if (daySince < 0) {
            if (!minNegativeDayDelta || daySince > minPositiveDayDelta) {
              minNegativeDayDelta = daySince;
              minNegativeDayDeltaKey = k;
            }
            m = k + 1;
          } else if (daySince > 0) {
            if (!minPositiveDayDelta || daySince < minPositiveDayDelta) {
              minPositiveDayDelta = daySince;
              minPositiveDayDeltaKey = k;
            }
            n = k - 1;
          } else {
            return this[k];
          }
        }

        if (!!minPositiveDayDelta) {
          return this[minPositiveDayDeltaKey];
        } else {
          return this[minNegativeDayDeltaKey]
        }
      }

      removeBagById(id) {
        for (var i = 0; i < this.length; i++) {
          let bag = this[i];
          let removed = bag.removeBagById(id);
          if (removed) {
            return removed;
          }
        }
      }

      isWithinDateRange(utcStartDateTime) {
        if (this.length === 0) return false;
        const start = this[0],
          end = this[this.length - 1];
        return start.utcStartDateTime <= utcStartDateTime
          && end.utcStartDateTime >= utcStartDateTime;
      }

      // Public DateTimes methods

      mergeDateTimes(dateTimes) {
        if (!dateTimes) {
          return 0;
        }
        let createCount = 0;
        dateTimes
          .map(_createDateTime)
          .forEach(dateTime => {
            let key = _getKey(dateTime);
            let foundBag = this.findBagByDateTimeKey(key);
            if (foundBag) {
              createCount += foundBag.mergeDateTimes([dateTime]);
            } else {
              createCount++;
              let bag = new Bag({
                utcStartDateTime: key,
                dateTimes: [dateTime]
              });
              _sortedPush(this, bag);
            }
          });
        return createCount;
      }

      // Public Pins methods

      mergePins(pins) {
        if (!pins) {
          return 0;
        }
        let createCount = 0;
        pins
          .map(_createPin)
          .forEach(pin => {
            let key = _getKey(pin);
            //debugger;
            let foundBag = this.findBagByDateTimeKey(key);
            if (foundBag) {
              createCount += foundBag.mergePins([pin]);
            } else {
              createCount++;
              let bag = new Bag({
                utcStartDateTime: key,
                pins: [pin]
              });
              _sortedPush(this, bag);
            }
          });
        return createCount;
      }

      updatePins(pins) {
        if (!pins) {
          return 0;
        }
        let updateCount = 0;
        pins
          .map(_createPin)
          .forEach(pin => {
            let key = _getKey(pin);
            //debugger;
            let foundBag = this.findBagByDateTimeKey(key);
            if (foundBag) {
              updateCount += foundBag.updatePins([pin]);
            }
          });
        return updateCount;
      }

      getFirstInViewAsc() {
        return this.find((t) => t.inView);
      }


      static getDateTimeKey(dateTime) {
        return _getKey(dateTime);
      }

    };

  }

  angular.module('chronopinNodeApp.model')
    .factory('BagsFactory', BagsFactory);

})();
