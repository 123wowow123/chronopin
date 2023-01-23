/*jshint unused:false*/
'use strict';

(function () {

  //let PinGroups;

  class CreateController {

    constructor($http, $state, $scope, Auth, $q /*, $log, modelInjector */) {
      //PinGroups || (PinGroups = modelInjector.getPinGroups());

      let baseDate = new Date();
      let dateOptions = {
        //formatYear: 'yy',
        // maxDate: new Date(2020, 5, 22),
        // minDate: new Date(),
        startingDay: 1,
        baseDate: baseDate
      };

      let timeOptions = {
        hstep: 1,
        mstep: 15,
        ismeridian: true
      };

      // bind function so each digest loop it get re-evaluated to determin latest state
      this.isAdmin = Auth.isAdmin;
      this.getTimeZoneName = moment.tz.guess;

      this.mode = this.mode || 'create';

      this.$http = $http;
      this.$q = $q;
      //this.$stateParams = $stateParams;
      this.$state = $state;
      this.$scope = $scope;

      this.title = 'Create Pin';
      this.formDisabled = false;
      this.pin = {};

      this.pin.allDay = true;
      //this.timePicker = {};
      //this.timePicker.openedBefore = false; ////////////

      this.altInputFormats = ['shortDate'];

      this.datePickerStart = {
        opened: false,
        options: angular.extend({}, dateOptions)
      };

      this.datePickerEnd = {
        opened: false,
        options: angular.extend({}, dateOptions)
      };

      this.timePickerStart = {
        options: angular.extend({}, timeOptions)
      };

      this.timePickerEnd = {
        options: angular.extend({}, timeOptions)
      };

    }

    $onInit() {
      // let pinId = this.$stateParams.id;
      // if (this.mode === 'edit' && pinId !== undefined) {
      //   this.enableForm(false);
      //   this.$http.get('/api/pins/' + pinId)
      //     .then(res => {
      //       this.setPin(res.data);
      //       this.enableForm(true);
      //     })
      //     .catch(err => {
      //       this.enableForm(true);
      //     });
      // }
    }

    selectImage(media) {
      this.pin.selectedMedia = media;
      return this;
    }

    openDatePickerStart() {
      this.closeDatePicker();
      this.datePickerStart.opened = true;
      return this;
    }

    openDatePickerEnd() {
      this.closeDatePicker();
      this.datePickerEnd.opened = true;
      return this;
    }

    closeDatePicker() {
      this.datePickerStart.opened = false;
      this.datePickerEnd.opened = false;
      return this;
    }

    toggleTimePicker() {
      this.pin.allDay = !_.get(this, 'pin.allDay', undefined);
      return this;
    }

    startChange(newStart) {
      this.datePickerEnd.options.minDate = newStart;
      if (!newStart) {
        return this;
      }

      if (!this.pin.end) {
        this.pin.end = newStart;
      } else if (this.pin.end.getTime() < newStart.getTime()) {
        this.pin.end = newStart;
      }
      return this;
    }

    endChange(newEnd) {
      if (!newEnd) {
        return this;
      }

      if (!this.pin.start) {
        this.pin.start = newEnd;
        this.startChange(newEnd);
      }
      return this;
    }

    matchEndDateToStartDate() {
      this.pin.end = this.pin.start;
      return this;
    }

    setPin(pin) {
      this.pin.id = pin.id;
      this.pin.sourceUrl = pin.sourceUrl;
      this.pin.title = pin.title;
      this.pin.description = pin.description;
      this.pin.address = pin.address;
      this.pin.price = pin.price;
      this.pin.start = pin.utcStartDateTime && new Date(pin.utcStartDateTime);
      this.pin.end = pin.utcStartDateTime && new Date(pin.utcEndDateTime);
      this.pin.allDay = pin.allDay;
      this.pin.media = pin.media;
      this.pin.selectedMedia = _.get(pin, 'media[0]');
      return this;
    }

    setPinFromScrape(pin) {
      this.pin.title = _.get(pin, 'titles[0]');
      this.pin.description = _.get(pin, 'descriptions[0]');

      // if (!this.pin.address) {
      //   this.pin.address = _.get(pin, 'address');
      // }
      // if (!this.pin.price) {
      //   this.pin.price = _.get(pin, 'price');
      // }
      // if (!this.pin.price && _.get(pin, 'prices[0]')) {
      //   this.pin.price = _.get(pin, 'prices[0]');
      // }
      this.pin.start = new Date(_.get(pin, 'dates[0].start'));
      this.pin.end = new Date(_.get(pin, 'dates[0].end'));
      this.pin.allDay = _.get(pin, 'dates[0].allDay');


      this.pin.media = _.get(pin, 'media');
      this.pin.selectedMedia = _.get(pin, 'media[0]');
      return this;
    }

    scrapePage(url) {
      this.enableForm(false);
      let config = {
        params: {
          url: url
        }
      };
      return this.$http.get('/api/scrape', config)
        .then(response => {
          this
            .setPinFromScrape(response.data)
            .enableForm(true);
        })
        .catch(err => {
          this.enableForm(true);
        });
    }

    urlChanged() {
      let sourceUrl = this.pin.sourceUrl;
      if (sourceUrl) {
        this
          .resetForScrape()
          .scrapePage(sourceUrl);
      }

      return this;
    }

    clearFormButSourceUrl() {
      return this
        .setPin({
          sourceUrl: this.pin.sourceUrl
        });
    }

    resetForScrape() {
      let newPin = _.pick(this.pin, ['sourceUrl', 'allDay']);
      return this
        .setPin(newPin);
    }

    submitPin(pin, valid) {
      this._forceValidate();
      if (!valid) {
        return this.$q.reject('form not valid');
      }
      if (this.mode === 'edit') {
        return this._updatePin(pin);
      } else {
        return this._addPin(pin);
      }
    }

    checkOverlapped($event) {
      if (this.showCreateFooter === $event.isOverlapping) {
        this.$scope.$evalAsync(() => {
          this.showCreateFooter = !$event.isOverlapping;
        }, 0);
      }
    }

    enableForm(enable) {
      this.formDisabled = !enable;
      return this;
    }

    _forceValidate() {
      angular.forEach(this.$scope.pinForm.$error.required, field => {
        field.$setDirty();
      });
      return this;
    }

    _addPin(pin) {
      this.enableForm(false);
      let newPin = this._formatSubmitPin(pin);
      return this.$http.post('/api/pins', newPin)
        .then(response => {
          this.success = response.data;
          return response;
        })
        .then(response => {
          this.$state.go('main');
          return response;
        })
        .catch(err => {
          this.enableForm(true);
        });
    }

    _updatePin(pin) {
      this.enableForm(false);
      let newPin = this._formatSubmitPin(pin);
      return this.$http.put('/api/pins/' + pin.id, newPin)
        .then(response => {
          this.success = response.data;
          return response;
        })
        .then(response => {
          this.$state.go('main');
          return response;
        })
        .catch(err => {
          this.enableForm(true);
        });
    }

    _getDateTimeToDayBegin(dateTime) {
      let newDateTime = new Date(dateTime.getTime());
      newDateTime.setHours(0);
      newDateTime.setMinutes(0);
      newDateTime.setSeconds(0);
      newDateTime.setMilliseconds(0);
      return newDateTime;
    }

    _getDateTimeToDayEnd(dateTime) {
      let newDateTime = new Date(dateTime.getTime());
      newDateTime.setHours(23);
      newDateTime.setMinutes(59);
      newDateTime.setSeconds(59);
      newDateTime.setMilliseconds(999);
      return newDateTime;
    }

    _formatSubmitPin(pin) {
      let startDateTime, endDateTime, allDay = this.pin.allDay;
      if (allDay) {
        // set time portion to midnight
        startDateTime = this._getDateTimeToDayBegin(pin.start);
        // set time portion to 1 tick before midnight
        endDateTime = this._getDateTimeToDayEnd(pin.end);
      } else {
        startDateTime = pin.start;
        endDateTime = pin.end;
      }

      let newPin = {
        title: pin.title,
        description: pin.description,
        sourceUrl: pin.sourceUrl,
        address: pin.address,
        price: pin.price,
        utcStartDateTime: startDateTime, // ISO 8601 with toJSON
        utcEndDateTime: endDateTime,
        allDay: allDay,
        media: [pin.selectedMedia]
      };
      return _.omitBy(newPin, _.isNull);
    }

  }

  angular.module('chronopinNodeApp')
    .component('create', {
      templateUrl: 'app/create/create.html',
      controller: CreateController
    });
})();
