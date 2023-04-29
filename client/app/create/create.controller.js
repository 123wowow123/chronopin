/*jshint unused:false*/
'use strict';

(function () {

  //let PinGroups;

  class CreateController {

    constructor($state, $scope, Auth, $q, $stateParams, $http, pinWebService, scrapeService, appConfig /*, $log, modelInjector */) {
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

      // this.mode = this.mode || 'create';

      this.scrapeType = appConfig.scrapeType;
      this.pinWebService = pinWebService;
      this.scrapeService = scrapeService;
      this.$http = $http;
      this.$q = $q;
      this.$stateParams = $stateParams;
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
      let id = this.$stateParams.id;
      let respondId = this.$stateParams.respondId;
      this.mode = id ? "edit" : respondId ? 'respond' : 'create';
      if (this.mode === 'edit' && id !== undefined) {
        this.enableForm(false);
        //this.$http.get('/api/pins/' + id)
        this.pinWebService.get(id)
          .then(res => {
            return this.scrapeService.setPin(this.pin, res.data);
          })
          .finally(() => {
            this.enableForm(true);
          });
      } else if (this.mode === 'respond' && respondId !== undefined) {
        this.enableForm(false);
        this.pinWebService.get(+respondId)
          .then(res => {
            this.respondPinTitle = _.get(res, 'data.title');
            this.pin.parentId = +respondId;
            return this.pin;
          })
          .finally(() => {
            this.enableForm(true);
          });
      }

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

    urlChanged() {
      let sourceUrl = this.pin.sourceUrl;
      if (sourceUrl) {
        this
          .resetForScrape()
          .scrapePage(sourceUrl);
      }
      return this;
    }

    scrapePage(url) {
      this.enableForm(false);
      this.scrapeService.scrapePage(this.pin, url)
        .finally(() => {
          this.enableForm(true);
        });
      return this;
    }

    scrapeImage(url) {
      this.enableForm(false);
      this.scrapeService.scrapeImage(this.pin, url)
        .finally(() => {
          this.enableForm(true);
        });
      return this;
    }

    clearFormButSourceUrl() {
      this.scrapeService
        .setPin(this.pin, {
          sourceUrl: this.pin.sourceUrl
        });
      return this;
    }

    resetForScrape() {
      let newPin = _.pick(this.pin, ['sourceUrl', 'allDay', 'parentId']);
      this.scrapeService
        .setPin(this.pin, newPin);
      return this;
    }

    submitPin(pin) {
      this._forceValidate();
      if (!this.$scope.pinForm.$valid) {
        return this.$q.reject('form not valid');
      }

      let submitPromise;
      this.enableForm(false);
      if (this.mode === 'edit') {
        submitPromise = this.scrapeService.updatePin(pin);
      } else {
        submitPromise = this.scrapeService.addPin(pin);
      }
      return submitPromise
        .then(response => {
          this.$state.go('main');
          return response;
        })
        .catch(() => {
          this.enableForm(true);
        });
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

    addMerchantPrice() {
      if (!this.pin.merchants) {
        this.pin.merchants = [];
      }

      this.pin.merchants.push({
        price: null,
        url: null
      })
    }

    removeMerchantPrice(merchant) {
      this.pin.merchants.splice(this.pin.merchants.indexOf(merchant), 1);
    }

    _forceValidate() {
      angular.forEach(this.$scope.pinForm.$error.required, field => {
        field.$setDirty();
      });
      return this;
    }

  }

  angular.module('chronopinNodeApp')
    .component('create', {
      templateUrl: 'app/create/create.html',
      controller: CreateController
    });
})();
