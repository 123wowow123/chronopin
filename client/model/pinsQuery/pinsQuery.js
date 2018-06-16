/*global pluralize*/
'use strict';

(function () {

  function PinsQueryFactory(modelInjector) {
    let Pin;

    function _sortSearchScore(a, b) {
      return _getSortSearchScoreKey(b) - _getSortSearchScoreKey(a);
    }

    function _getSortSearchScoreKey(a) {
      return -a.searchScore;
    }

    function _sortedPush(array, value) {
      array.splice(_.sortedIndexBy(array, value, _getSortSearchScoreKey), 0, value);
    }

    return class PinsQueryFactory extends Array {
      constructor(args) {
        // Lazy load to prevent Angular circular dependency
        Pin = Pin || modelInjector.getPin();
        super();
        // Pins collection is pushed to super Array
        if (Array.isArray(args)) {
          this.mergePins(args);
          this.sort(_sortSearchScore);
        }
      }

      // ToDo: move to filter // currently used as a key field
      toISODateTimeString() {
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

      mergePins(pins) {
        pins.forEach(pin => {
          if (!(pin instanceof Pin)) {
            pin = new Pin(pin);
          }
          let foundPin = _.find(this, {
            id: pin.id
          });
          if (foundPin) {
            _.merge(foundPin, pin);
          } else {
            _sortedPush(this, pin);
          }
        });
        return this;
      }

      findPinById(id) {
        return _.find(this, {
          'id': id
        });
      }

      removePinById(id) {
        let index = _.findIndex(this, {
          'id': id
        });
        if (index > -1) {
          return this.splice(index, 1)[0];
        }
      }

    };

  }

  angular.module('chronopinNodeApp.model')
    .factory('PinsQueryFactory', PinsQueryFactory);

})();
