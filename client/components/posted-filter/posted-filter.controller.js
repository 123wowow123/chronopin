'use strict';

(function () {

  // The fixed buttons. `within` is the value the API takes as created_within;
  // null is the unfiltered timeline. Every span other than "everything" is
  // reachable through the combo, so this is just the one button.
  const PRESETS = [
    { label: 'All', within: null }
  ];

  function _isPresetSpan(within) {
    return PRESETS.some(preset => preset.within === within);
  }

  class PostedFilterController {

    constructor($element, $timeout, $document, $scope, postedSpan) {
      this.$element = $element;
      this.$timeout = $timeout;
      this.$document = $document;
      this.$scope = $scope;
      this.postedSpan = postedSpan;

      this.spanOptions = postedSpan.options();
      this.presets = PRESETS;

      // The span the combo button stands for. It keeps its value while one of
      // the fixed buttons is the active filter, so the timeline can be put
      // back on it with one click.
      this.span = postedSpan.DEFAULT_SPAN;

      this.panelOpen = false;
      this.spanInvalid = false;
      this.spanText = postedSpan.format(this.span);
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

    $onChanges(changes) {
      // Arrives late: the preference is read from the signed-in user, so the
      // button starts on the built-in span and moves once it is known.
      if (changes.defaultSpan) {
        this._applyDefaultSpan();
      }
      if (changes.within) {
        this._followActiveSpan(changes.within.currentValue);
      }
    }

    // View functions

    spanLabel() {
      return this.postedSpan.format(this.span);
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
      this.spanText = this.postedSpan.format(this.span);
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
      this._setSpan(option.within);
      this.closePanel();
      this._change(option.within);
    }

    applyTypedSpan() {
      const within = this.postedSpan.parseTyped(this.spanText);
      this.spanInvalid = !within;
      if (!within) {
        return;
      }
      this._setSpan(within);
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

    _setSpan(within) {
      this.span = within;
      this.spanText = this.postedSpan.format(within);
    }

    // Somebody's saved span only decides where the combo starts. It is ignored
    // while the combo is the active filter, since moving the button then would
    // pull it off the window the timeline is showing.
    _applyDefaultSpan() {
      if (!this.isComboActive() && this.postedSpan.isSpan(this.defaultSpan)) {
        this._setSpan(this.defaultSpan);
      }
    }

    // An active span that came from outside this control - a reload, or state
    // the page was holding - still has to show on the button, or the control
    // and the timeline disagree about what is applied.
    _followActiveSpan(within) {
      if (within && !_isPresetSpan(within) && this.postedSpan.isSpan(within)) {
        this._setSpan(within);
        this.spanInvalid = false;
      }
    }

    _change(within) {
      const next = within || null;
      if ((this.within || null) === next) {
        return;
      }
      // The label rides along so the page can name the active window without
      // having to parse the span a second time.
      this.onChange({
        within: next,
        label: next ? this.postedSpan.format(next) : null
      });
    }
  }

  angular.module('chronopinNodeApp')
    .component('postedFilter', {
      templateUrl: 'components/posted-filter/posted-filter.html',
      controller: PostedFilterController,
      bindings: {
        within: '<',
        defaultSpan: '<',
        onChange: '&'
      }
    });
})();
