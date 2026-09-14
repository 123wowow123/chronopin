'use strict';

(function () {

  // The specialty days ("National Peanut Day") on a date, for the tag under
  // TODAY and under every date on the timeline. Asked by the calendar date the
  // caller shows (the viewer's local day), since the file has no time zone.
  // The whole year is fetched once for the life of the page, as the timeline
  // would otherwise make a request for each of its dates.
  class SpecialtyDayService {
    constructor($http) {
      this.$http = $http;
      this._byMonthDay = null;
    }

    // Resolves the day's names in display order, or [] if there are none or
    // the lookup fails - the tag is decoration and should never cost an error.
    namesOn(date) {
      if (!this._byMonthDay) {
        this._byMonthDay = this.$http.get('/api/specialty-days')
          .then(res => res.data)
          .catch(() => {
            this._byMonthDay = null;
            return {};
          });
      }
      const monthDay = moment(date).format('MM-DD');
      return this._byMonthDay.then(byMonthDay => byMonthDay[monthDay] || []);
    }
  }

  angular.module('chronopinNodeApp')
    .service('specialtyDay', SpecialtyDayService);
})();
