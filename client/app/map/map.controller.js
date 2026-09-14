'use strict';

(function () {

  // Center of the contiguous US, so an empty or still-loading map has a
  // sensible resting view instead of the middle of the ocean at zoom 0.
  const DEFAULT_CENTER = [39.8283, -98.5795];
  const DEFAULT_ZOOM = 4;

  // Loading every pin ever posted onto one map does not scale the way a
  // paged timeline does, so the map opens scoped to a year either side of
  // now rather than everything - each side's own "All" preset still reaches
  // the unbounded view in that direction.
  const DEFAULT_SPAN = '1y';

  // A location tends to stay put for a long time, so the map's own filter
  // spreads across wider spans than the timeline's fixed list (12h..1y),
  // which is tuned for how often new pins are posted rather than how far
  // back or forward their event dates stay relevant.
  // '0d' leads: a window of nothing on that side, e.g. past at 0 shows only
  // upcoming pins. It sits at "Now" on the track, where it reads naturally.
  const MAP_SPAN_OPTIONS = ['0d', '1d', '1w', '1mo', '1y', '3y', '5y'];

  // Mirrors pin-map.directive's own reader: only plot a pin whose coordinates
  // are present, numeric, and in range.
  function toPlace(pin) {
    if (pin.latitude === '' || pin.latitude == null || pin.longitude === '' || pin.longitude == null) return null;
    const lat = parseFloat(pin.latitude);
    const lng = parseFloat(pin.longitude);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  // A teardrop pin drawn in currentColor, so CSS alone (map.scss's
  // .map-pin-icon--past/--future) decides the actual colour - the same
  // --past-color/--future-color custom properties the slider itself reads,
  // so a marker always agrees with the thumb whose window it fell inside of.
  const PIN_ICON_SIZE = [24, 36];
  const PIN_ICON_ANCHOR = [12, 36];
  const PIN_ICON_SVG = `
    <svg viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg" class="map-pin-icon__svg">
      <path class="map-pin-icon__body"
        d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z" />
      <circle class="map-pin-icon__dot" cx="12" cy="12" r="5" />
    </svg>`;

  function pinIcon(isPast) {
    return L.divIcon({
      className: `map-pin-icon ${isPast ? 'map-pin-icon--past' : 'map-pin-icon--future'}`,
      html: PIN_ICON_SVG,
      iconSize: PIN_ICON_SIZE,
      iconAnchor: PIN_ICON_ANCHOR
    });
  }

  // The date a page's rows run furthest towards in a walking direction -
  // the max for a forward/"next" walk, the min for a backward/"previous"
  // one. Once this has already crossed the matching boundary, later pages
  // in that direction can only be further out still, so the walk can stop.
  function extremeDate(pins, useMax) {
    return pins.reduce((extreme, pin) => {
      const d = new Date(pin.utcStartDateTime);
      if (!extreme) return d;
      return useMax ? (d > extreme ? d : extreme) : (d < extreme ? d : extreme);
    }, null);
  }

  class MapController {

    constructor($element, $scope, $state, $timeout, mainWebService, Util, postedSpan, appConfig) {
      this.$element = $element;
      this.$scope = $scope;
      this.$state = $state;
      this.$timeout = $timeout;
      this.mainWebService = mainWebService;
      this.postedSpan = postedSpan;
      this.appConfig = appConfig;

      const omitLinkHeaderProp = ['rel', 'url'];
      this.getLinkHeader = Util.getLinkHeader.bind(null, omitLinkHeaderProp);

      this.loading = false;
      this.markerCount = 0;

      // How far back and how far forward of now, by event date
      // (utcStartDateTime), to show pins - independent so a person can, say,
      // look back three years while only looking one year ahead. Null means
      // unbounded in that direction.
      this.pastSpan = DEFAULT_SPAN;
      this.futureSpan = DEFAULT_SPAN;
      this.pastSpanLabel = postedSpan.format(DEFAULT_SPAN);
      this.futureSpanLabel = postedSpan.format(DEFAULT_SPAN);
      this.sliderSteps = MAP_SPAN_OPTIONS;

      this._map = null;
      this._markers = null;
      this._pending = [];
      this._loadToken = 0;
    }

    $onInit() {
      this.loading = true;
      this._loadAllPins();

      this._onKeyDown = (event) => {
        if (event.key === 'Escape' && this.isPinOpen()) {
          this.$scope.$apply(() => this.closePin());
        }
      };
      document.addEventListener('keydown', this._onKeyDown);
    }

    // The canvas only exists once the template has rendered, so the map
    // itself is built here rather than in $onInit.
    $postLink() {
      this._buildMap();
    }

    $onDestroy() {
      document.removeEventListener('keydown', this._onKeyDown);
      if (this._map) {
        this._map.remove();
        this._map = null;
      }
    }

    isPinOpen() {
      return this.$state.includes('map.pin');
    }

    closePin() {
      this.$state.go('map');
    }

    getStatus() {
      switch (true) {
        case this.loading && !this.markerCount:
          return 'loading';
        case !this.loading && !this.markerCount:
          return 'no pins';
        default:
          return 'show';
      }
    }

    // "1 year" reads badly as "in the last 1 year" where "in the last year"
    // does not; matches the same trim the timeline's own filter label gets.
    pastSpanPhrase() {
      return (this.pastSpanLabel || '').replace(/^1 /, '');
    }

    futureSpanPhrase() {
      return (this.futureSpanLabel || '').replace(/^1 /, '');
    }

    // A side at 0 contributes no window, so the empty-map message leaves it
    // out rather than saying "in the last 0 days".
    hasPastWindow() {
      return !!this.pastSpan && this.postedSpan.approxDays(this.pastSpan) !== 0;
    }

    hasFutureWindow() {
      return !!this.futureSpan && this.postedSpan.approxDays(this.futureSpan) !== 0;
    }

    // Called by the slider on either thumb moving. Reloads from the server
    // rather than filtering the markers already on the map, since the map
    // only ever holds the window it was last asked for.
    onRangeChange(past, pastLabel, future, futureLabel) {
      const nextPast = past || null;
      const nextFuture = future || null;
      if ((this.pastSpan || null) === nextPast && (this.futureSpan || null) === nextFuture) {
        return;
      }
      this.pastSpan = nextPast;
      this.pastSpanLabel = pastLabel || null;
      this.futureSpan = nextFuture;
      this.futureSpanLabel = futureLabel || null;
      this._reload();
    }

    // Private helper functions

    _reload() {
      if (this._markers) {
        this._markers.clearLayers();
      }
      this._pending = [];
      this.markerCount = 0;
      this.loading = true;
      this._loadAllPins();
    }

    _buildMap() {
      const canvas = this.$element[0].querySelector('.pins-map__canvas');
      if (!canvas || typeof L === 'undefined') return;

      this._map = L.map(canvas, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(this._map);

      this._markers = L.layerGroup().addTo(this._map);

      // The page is often still laying out on first paint, which would leave
      // Leaflet sized against a 0-height container.
      this.$timeout(() => {
        if (this._map) this._map.invalidateSize();
      }, 250);

      const pending = this._pending;
      this._pending = [];
      this._plotPins(pending);
    }

    // now +/- each span, as actual boundary dates. Null on a side that has
    // no span - unbounded in that direction.
    _computeBounds() {
      const now = new Date();
      return {
        pastBoundary: this.pastSpan ? this.postedSpan.offsetDate(now, this.pastSpan, -1) : null,
        futureBoundary: this.futureSpan ? this.postedSpan.offsetDate(now, this.futureSpan, 1) : null
      };
    }

    _withinBounds(pin, bounds) {
      const d = new Date(pin.utcStartDateTime);
      if (bounds.pastBoundary && d < bounds.pastBoundary) return false;
      if (bounds.futureBoundary && d > bounds.futureBoundary) return false;
      return true;
    }

    // The first page is bidirectional (pins just before and after now), so
    // it seeds two independent walks outward from there - one forward
    // towards the future boundary, one backward towards the past one -
    // rather than the single "next only" chain infinite scroll follows.
    _loadAllPins() {
      const token = ++this._loadToken;
      const bounds = this._computeBounds();

      return this.mainWebService.list()
        .then(res => {
          if (token !== this._loadToken) {
            return;
          }
          this._plotInBounds(res.data.pins, bounds);

          const nextParams = this.getLinkHeader(res.data.linkHeader, 'next');
          const prevParams = this.getLinkHeader(res.data.linkHeader, 'previous');

          return Promise.all([
            this._walk('next', nextParams, token, bounds),
            this._walk('previous', prevParams, token, bounds)
          ]);
        })
        .then(() => {
          if (token === this._loadToken) {
            this.loading = false;
          }
        })
        .catch(err => {
          if (token === this._loadToken) {
            this.loading = false;
          }
          throw err;
        });
    }

    // Walks one direction's Link header chain, stopping once that
    // direction's boundary has already been passed (an unbounded side just
    // walks until the pages run out).
    _walk(direction, params, token, bounds) {
      if (!params) {
        return Promise.resolve();
      }
      return this.mainWebService.list(params)
        .then(res => {
          if (token !== this._loadToken) {
            return;
          }
          const pins = res.data.pins;
          this._plotInBounds(pins, bounds);

          const boundary = direction === 'next' ? bounds.futureBoundary : bounds.pastBoundary;
          const extreme = pins.length && boundary ? extremeDate(pins, direction === 'next') : null;
          const pastBoundary = extreme && (direction === 'next' ? extreme >= boundary : extreme <= boundary);
          if (pastBoundary) {
            return;
          }

          const nextParams = this.getLinkHeader(res.data.linkHeader, direction);
          return this._walk(direction, nextParams, token, bounds);
        });
    }

    _plotInBounds(pins, bounds) {
      if (!pins || !pins.length) {
        return;
      }
      this._plotPins(pins.filter(pin => this._withinBounds(pin, bounds)));
    }

    _plotPins(pins) {
      if (!pins || !pins.length) {
        return;
      }
      // The map may not be built yet on the very first response.
      if (!this._markers) {
        this._pending = this._pending.concat(pins);
        return;
      }
      pins.forEach(pin => this._addMarker(pin));
    }

    _addMarker(pin) {
      const place = toPlace(pin);
      if (!place) {
        return;
      }

      const isPast = new Date(pin.utcStartDateTime) <= new Date();

      // Hover gives a preview; a click (or tap, where there is no hover)
      // goes straight to the pin overlay.
      L.marker([place.lat, place.lng], { icon: pinIcon(isPast), alt: pin.title || '' })
        .bindTooltip(this._tooltipHtml(pin), {
          direction: 'top',
          offset: [0, -36],
          className: 'map-pin-tooltip',
          opacity: 1
        })
        .on('click', () => this.$scope.$apply(() => this.$state.go('map.pin', { id: pin.id })))
        .addTo(this._markers);

      this.markerCount++;
    }

    // Leaflet renders tooltip content as raw HTML, so pin text is escaped.
    _tooltipHtml(pin) {
      const thumbName = _.get(pin, 'media[0].thumbName');
      const image = thumbName
        ? `<img class="map-pin-tooltip__image" src="${this.appConfig.thumbUrlPrefix}${thumbName}" alt="">`
        : '';
      const address = pin.address
        ? `<div class="map-pin-tooltip__address">${_.escape(pin.address)}</div>`
        : '';
      return `${image}
        <div class="map-pin-tooltip__body">
          <div class="map-pin-tooltip__title">${_.escape(pin.title || 'Untitled pin')}</div>
          ${address}
        </div>`;
    }

  }

  angular.module('chronopinNodeApp')
    .component('pinsMap', {
      templateUrl: 'app/map/map.html',
      controller: MapController
    });
})();
