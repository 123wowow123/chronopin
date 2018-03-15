 /*jshint unused:false*/
'use strict';

(function() {

  class PinFormController {

    constructor($http, $stateParams, $state, $scope, Auth, $log) {
      //this.form.title = title;

      var baseDate = new Date();
      var dateOptions = {
        //formatYear: 'yy',
        // maxDate: new Date(2020, 5, 22),
        // minDate: new Date(),
        startingDay: 1,
        baseDate: baseDate
      };

      var timeOptions = {
        hstep: 1,
        mstep: 15,
        ismeridian: true
      };

      this.isAdmin = Auth.isAdmin; //bind function so each digest loop it get re-evaluated to determin latest state

      this.enableForm = true;

      this.$log = $log;
      this.$http = $http;
      this.$stateParams = $stateParams;
      this.$state = $state;
      this.$scope = $scope;
      this.pin = {};

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

      this.timePicker = {
        show: false
      };

    }

    $onInit() {
      var pinId = this.$stateParams.id;
      if (this.mode === 'edit' && pinId !== undefined) {
        this._enableForm(false);
        this.$http.get('/api/pins/' + pinId)
          .then(res => {
            this.setPin(res.data);
            this._enableForm(true);
          })
          .catch(err => {
            this._enableForm(true);
          });
      }
    }

    selectImage(image) {
      this.pin.selectedImage = image;
    }

    openDatePickerStart() {
      this.closeDatePicker();
      this.datePickerStart.opened = true;
    }

    openDatePickerEnd() {
      this.closeDatePicker();
      this.datePickerEnd.opened = true;
    }

    closeDatePicker() {
      this.datePickerStart.opened = false;
      this.datePickerEnd.opened = false;
    }

    toggleTimePicker() {
      this.timePicker.show = !this.timePicker.show;
    }

    startChange() {
      this.$log.log(this.pin.start);
      this.datePickerEnd.options.minDate = this.pin.start;
      if (this.pin.end) {
        this.pin.end = this.pin.start;
      }
    }

    stopPropagation(e) {
      e.stopPropagation();
    }

    timeChange() {
      this.$log.log(this.pin.start);
    }

    setPin(pin) {
      this.pin.id = pin.id;
      if (!this.pin.sourceUrl) {
        this.pin.pageUrl = pin.sourceUrl;
      }
      if (!this.pin.title) {
        this.pin.title = pin.title;
      }
      if (!this.pin.description) {
        this.pin.description = pin.description;
      }
      if (!this.pin.address) {
        this.pin.address = pin.address;
      }
      if (!this.pin.price) {
        this.pin.price = pin.price;
      }
      if (!this.pin.start && pin.utcStartDateTime) {
        this.pin.start = new Date(pin.utcStartDateTime);
      }
      if (!this.pin.end && pin.utcEndDateTime) {
        this.pin.end = new Date(pin.utcEndDateTime);
      }
      if (!this.pin.images && pin.media && pin.media[0]) {
        this.pin.images = [pin.media[0]];
      }
      if (!this.pin.selectedImage) {
        this.pin.selectedImage = pin.media && pin.media[0];
      }
      if (!this.pin.price && pin.prices && pin.prices[0]) {
        this.pin.price = pin.prices[0];
      }
    }

    setPinFromScrape(pin) {
      //this.pin.pageUrl = pin.sourceUrl;
      if (!this.pin.title && pin.title && pin.title[0]) {
        this.pin.title = pin.title[0];
      }
      if (!this.pin.description && pin.description && pin.description[0]) {
        this.pin.description = pin.description[0];
      }
      if (!this.pin.address) {
        this.pin.address = pin.address;
      }
      if (!this.pin.price) {
        this.pin.price = pin.price;
      }
      if (!this.pin.start && pin.dates && pin.dates[0].start) {
        this.pin.start = new Date(pin.dates[0].start);
      }
      if (!this.pin.end && pin.dates && pin.dates[0].end) {
        this.pin.end = new Date(pin.dates[0].end);
      }
      // if (!this.pin.imageUrl) {
      //   this.pin.imageUrl = pin.images[0] && pin.images[0].sourceUrl && pin.images[0].sourceUrl;
      // }
      this.pin.images = pin.images; //delete above
      this.pin.selectedImage = pin.images && pin.images[0] && pin.images[0];

      if (!this.pin.price && pin.prices && pin.prices[0]) {
        this.pin.price = pin.prices[0];
      }
    }

    scrapePage(url) {
      this._enableForm(false);
      var config = {
        params: {
          url: url
        }
      };
      this.$http.get('/api/scrape', config)
        .then(response => {
          this.setPinFromScrape(response.data);
          this._enableForm(true);
        })
        .catch(err => {
          this._enableForm(true);
        });
    }

    urlChanged() {
      this.reset();
      this.scrapePage(this.pin.pageUrl);
    }

    reset() {
      this.pin.title = undefined;
      this.pin.description = undefined;
      this.pin.address = undefined;
      this.pin.price = undefined;
      this.pin.start = undefined;
      this.pin.end = undefined;
      this.pin.selectedImage = undefined;
    }


    submitPin(pin, valid) {
      this._forceValiate();
      if (!valid) {
        return;
      }
      if (this.mode === 'edit') {
        this._updatePin(pin);
      } else {
        this._addPin(pin);
      }
    }

    _addPin(pin) {
      this._enableForm(false);
      var newPin = this._formatSubmitPin(pin);
      this.$http.post('/api/pins', newPin)
        .then(response => {
          this.success = response.data;
        })
        .then(() => {
          this.$state.go('main');
        })
        .catch(err => {
          this._enableForm(true);
        });
    }

    _updatePin(pin) {
      var newPin = this._formatSubmitPin(pin);
      this.$http.put('/api/pins/' + pin.id, newPin)
        .then(response => {
          this.success = response.data;
        })
        .then(() => {
          this.$state.go('main');
        });
    }

    _formatSubmitPin(pin) {
      var newPin = {
        title: pin.title,
        description: pin.description,
        sourceUrl: pin.pageUrl,
        address: pin.address,
        price: pin.price,
        utcStartDateTime: pin.start,
        utcEndDateTime: pin.end && undefined,
        imageUrl: pin.selectedImage.sourceUrl,
        allDay: !this.timePicker.show
      };
      return newPin;
    }

    _enableForm(enable) {
      this.enableForm = enable;
    }

    _forceValiate() {
      angular.forEach(this.$scope.pinForm.$error.required, function(field) {
        field.$setDirty();
      });
    }
  }

  angular.module('chronopinNodeApp')
    .component('pinForm', {
      templateUrl: 'components/modal-scroller/modal/shared/pin-form.html',
      controller: PinFormController,
      bindings: {
        title: '@?',
        mode: '@?'
      }
    });
})();
