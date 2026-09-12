'use strict';

(function () {

  // The fixed buttons. `within` is the value the API takes as created_within;
  // null is the unfiltered timeline. Every span other than "everything" is
  // reachable through the combo, so this is just the one button.
  const PRESETS = [
    { label: 'All', within: null }
  ];

  // What the panel lists. Any other span is typed into the field above them.
  // "1 day" rather than "24 hours": the same window under two labels would
  // leave whichever one was not clicked looking unselected.
  const SPAN_OPTIONS = ['12h', '1d', '3d', '5d', '1w', '2w', '4w', '1mo', '1y'];

  // What the combo button shows before anything has been chosen.
  const DEFAULT_SPAN = '1d';

  // Units the API accepts, with the words a person might type for each. The
  // patterns are mutually exclusive: "m" is minutes and only "mo" onwards is
  // months, so neither can swallow the other.
  const UNITS = [
    { value: 'm', label: 'minutes', typed: /^m(in(ute)?s?)?$/ },
    { value: 'h', label: 'hours', typed: /^h(r?s?|ours?)?$/ },
    { value: 'd', label: 'days', typed: /^d(ays?)?$/ },
    { value: 'w', label: 'weeks', typed: /^w(k?s?|eeks?)?$/ },
    { value: 'mo', label: 'months', typed: /^mo(n(th)?s?)?$/, calendar: true },
    { value: 'y', label: 'years', typed: /^y(r?s?|ears?)?$/, calendar: true }
  ];

  // A bare number is read as days, the unit the default is written in.
  const BARE_NUMBER_UNIT = 'd';

  function _findUnit(value) {
    return UNITS.find(unit => unit.value === value);
  }

  function _isPresetSpan(within) {
    return PRESETS.some(preset => preset.within === within);
  }

  // Wire form ("5d") to the count and unit behind it. "mo" has to precede "m"
  // in the alternation, or it matches as minutes and the "o" fails the anchor.
  function _parseSpan(within) {
    const match = /^(\d+(?:\.\d+)?)(mo|m|h|d|w|y)$/.exec(within || '');
    const unit = match && _findUnit(match[2]);
    return unit ? { count: parseFloat(match[1]), unit: unit } : null;
  }

  // "5d" reads back as "5 days", which is what the button shows, so a span
  // picked from the list and the same span typed by hand look identical.
  function _formatSpan(within) {
    const parsed = _parseSpan(within);
    if (!parsed) {
      return null;
    }
    const label = parsed.count === 1 ?
      parsed.unit.label.replace(/s$/, '') :
      parsed.unit.label;
    return `${parsed.count} ${label}`;
  }

  // Whatever someone types to wire form, or null if it is not a span.
  // Deliberately loose about the unit word: "10d", "10 days" and "10 Days"
  // are the same request, and a bare "10" means days.
  function _parseTyped(text) {
    const match = /^\s*(\d+(?:\.\d+)?)\s*([a-z]*)\s*$/i.exec(text || '');
    if (!match) {
      return null;
    }
    // The pattern only matches digits, so this is never NaN - zero is the
    // only value left to reject.
    const count = parseFloat(match[1]);
    if (count <= 0) {
      return null;
    }
    const word = match[2].toLowerCase();
    const unit = word ?
      UNITS.find(u => u.typed.test(word)) :
      _findUnit(BARE_NUMBER_UNIT);
    if (!unit) {
      return null;
    }
    // Half a month has no exact meaning, and the server refuses it, so it is
    // caught here where the field can say so immediately.
    if (unit.calendar && count % 1 !== 0) {
      return null;
    }
    return `${count}${unit.value}`;
  }

  class PostedFilterController {

    constructor($element, $timeout, $document, $scope) {
      this.$element = $element;
      this.$timeout = $timeout;
      this.$document = $document;
      this.$scope = $scope;

      this.spanOptions = SPAN_OPTIONS.map(within => ({
        within: within,
        label: _formatSpan(within)
      }));
      this.presets = PRESETS;

      // The span the combo button stands for. It keeps its value while one of
      // the fixed buttons is the active filter, so the timeline can be put
      // back on it with one click.
      this.span = DEFAULT_SPAN;

      this.panelOpen = false;
      this.spanInvalid = false;
      this.spanText = _formatSpan(DEFAULT_SPAN);
    }

    $onInit() {
      // A panel that only closed on its own controls would be left hanging
      // open behind whatever was clicked next.
      this._onOutsideMouseDown = event => {
        if (!this.panelOpen || this.$element[0].contains(event.target)) {
          return;
        }
        this.$scope.$applyAsync(() => this.closePanel());
      };
      this.$document.on('mousedown', this._onOutsideMouseDown);
    }

    $onDestroy() {
      this.$document.off('mousedown', this._onOutsideMouseDown);
    }

    // An active span that came from outside this control - a reload, or state
    // the page was holding - still has to show on the button, or the control
    // and the timeline disagree about what is applied.
    $onChanges(changes) {
      if (!changes.within) {
        return;
      }
      const within = changes.within.currentValue;
      if (within && !_isPresetSpan(within) && _formatSpan(within)) {
        this.span = within;
        this.spanText = _formatSpan(within);
        this.spanInvalid = false;
      }
    }

    // View functions

    spanLabel() {
      return _formatSpan(this.span);
    }

    isPresetActive(preset) {
      return (this.within || null) === preset.within;
    }

    // Anything the fixed buttons do not cover belongs to the combo, so the
    // two never look selected at once.
    isComboActive() {
      return !!this.within && !_isPresetSpan(this.within);
    }

    isOptionActive(option) {
      return this.within === option.within;
    }

    selectPreset(preset) {
      this.closePanel();
      this._change(preset.within);
    }

    // The combo button applies the span it is showing, the same way the fixed
    // buttons apply theirs. _change is a no-op when it is already active.
    applySpan() {
      this.closePanel();
      this._change(this.span);
    }

    togglePanel() {
      if (this.panelOpen) {
        this.closePanel();
        return;
      }
      this.panelOpen = true;
      this.spanInvalid = false;
      this.spanText = _formatSpan(this.span);
      // Opened to be typed into, so the caret starts in the field with the
      // current span selected and ready to be replaced.
      this.$timeout(() => {
        const el = this.$element[0].querySelector('.posted-filter__span-input');
        if (el) {
          el.focus();
          el.select();
        }
      });
    }

    closePanel() {
      this.panelOpen = false;
      this.spanInvalid = false;
    }

    selectSpan(option) {
      this.span = option.within;
      this.spanText = option.label;
      this.closePanel();
      this._change(option.within);
    }

    applyTypedSpan() {
      const within = _parseTyped(this.spanText);
      this.spanInvalid = !within;
      if (!within) {
        return;
      }
      this.span = within;
      this.spanText = _formatSpan(within);
      this.closePanel();
      this._change(within);
    }

    onSpanInputKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closePanel();
      }
    }

    // Private helper functions

    _change(within) {
      const next = within || null;
      if ((this.within || null) === next) {
        return;
      }
      // The label rides along so the page can name the active window without
      // having to parse the span a second time.
      this.onChange({
        within: next,
        label: next ? _formatSpan(next) : null
      });
    }
  }

  angular.module('chronopinNodeApp')
    .component('postedFilter', {
      templateUrl: 'components/posted-filter/posted-filter.html',
      controller: PostedFilterController,
      bindings: {
        within: '<',
        onChange: '&'
      }
    });
})();
