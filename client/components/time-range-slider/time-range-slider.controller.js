'use strict';

(function () {

  class TimeRangeSliderController {

    constructor($element, $scope, $document, postedSpan) {
      this.$element = $element;
      this.$scope = $scope;
      this.$document = $document;
      this.postedSpan = postedSpan;

      // Which thumb a pointer is currently dragging, and the track's own
      // bounding rect at drag start - measured once per drag rather than on
      // every move, since the track does not move while dragging it.
      this._drag = null;

      // The pencil's own panel: exact typed entry, alongside the coarse drag.
      this.panelOpen = false;
      this.pastText = '';
      this.futureText = '';
      this.pastInvalid = false;
      this.futureInvalid = false;
    }

    $onInit() {
      // One extra stop past the last named span: "unbounded" in that
      // direction, same meaning as posted-filter's own "All" preset (a null
      // within).
      this._steps = this.steps || [];
      this.maxIndex = this._steps.length;
      this.pastOnly = !!this.pastOnly;
      this._syncFromBindings();

      this._onPointerMove = (event) => this._handlePointerMove(event);
      this._onPointerUp = () => this._endDrag();
      this.$document.on('pointermove', this._onPointerMove);
      this.$document.on('pointerup', this._onPointerUp);

      // A panel opened to dial in a value should not stay open once someone
      // clicks elsewhere on the page.
      this._onOutsideMouseDown = (event) => {
        if (!this.panelOpen || this.$element[0].contains(event.target)) {
          return;
        }
        this.$scope.$applyAsync(() => this.closePanel());
      };
      this.$document.on('mousedown', this._onOutsideMouseDown);

      this._track = this.$element[0].querySelector('.time-range-slider__track');

      // Delegated from the component root rather than bound to each thumb:
      // the future thumb sits behind ng-if, which has not rendered it yet at
      // $onInit, so a direct lookup here found nothing and it never dragged.
      this.$element[0].addEventListener('pointerdown', (event) => {
        const thumb = event.target.closest('.time-range-slider__thumb');
        if (!thumb) {
          return;
        }
        let side = thumb.classList.contains('time-range-slider__thumb--future') ? 'future' : 'past';
        // Both sides at 0 stack the thumbs on "Now", and the future one sits
        // on top - so which side is meant is decided by the drag direction.
        if (!this.pastOnly && this._pastIndex === 0 && this._futureIndex === 0) {
          side = null;
        }
        this._startDrag(side, thumb, event);
      });
    }

    $onChanges(changes) {
      if (changes.steps) {
        this._steps = this.steps || [];
        this.maxIndex = this._steps.length;
      }
      if (changes.pastSpan || changes.futureSpan || changes.steps) {
        this._syncFromBindings();
      }
    }

    $onDestroy() {
      this.$document.off('pointermove', this._onPointerMove);
      this.$document.off('pointerup', this._onPointerUp);
      this.$document.off('mousedown', this._onOutsideMouseDown);
    }

    // View functions

    pastLabel() {
      return this._formatWithin(this._pastExact);
    }

    futureLabel() {
      return this._formatWithin(this._futureExact);
    }

    // Dual mode: 50 (centre, "Now") out to 0 (the track's left edge, "All"),
    // mirroring the future side.
    // Single-sided (pastOnly): 0 (the left edge, "Now") .. 100 (the right
    // edge, "All") - one span that only grows, so it reads left to right
    // like any other slider, largest on the right.
    pastPosition() {
      return this.pastOnly
        ? this._percentFromCenter(this._pastIndex) * 2
        : 50 - this._percentFromCenter(this._pastIndex);
    }

    // 50 (centre, "Now") .. 100 (the track's right edge). Unused in
    // single-sided mode.
    futurePosition() {
      return 50 + this._percentFromCenter(this._futureIndex);
    }

    // The past fill runs between "Now" and the past thumb - the centre in
    // dual mode, the left edge in single-sided mode - so it never reaches
    // under the future fill.
    pastFillLeft() {
      return this.pastOnly ? 0 : this.pastPosition();
    }

    pastFillRight() {
      return this.pastOnly ? this.pastPosition() : 50;
    }

    onKeyDown(side, event) {
      const delta = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[event.key];
      if (delta == null && event.key !== 'Home' && event.key !== 'End') {
        return;
      }
      event.preventDefault();

      const index = side === 'past' ? this._pastIndex : this._futureIndex;
      // In dual mode both thumbs grow outward from the centre, so the left
      // arrow widens the past side and narrows the future one. Single-sided,
      // larger is simply to the right.
      const signedDelta = side === 'past' && !this.pastOnly ? -delta : delta;
      let next = index;
      if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = this.maxIndex;
      } else {
        next = index + signedDelta;
      }
      this._applyIndex(side, this._clampIndex(next));
    }

    // The "Now" label: past closes to its innermost step (0 where the steps
    // have one), and future opens just to the smallest step above zero - so
    // "now" means what is on today and coming up next, rather than an empty
    // window that shows nothing at all.
    snapToNow() {
      const past = this._withinForIndex(Math.max(this._zeroIndex(), 0));
      const future = this._steps.find(step => this.postedSpan.approxDays(step) > 0) || past;
      this._applyBoth(past, future);
    }

    // The past header label. Opens that side to All unless the caller names
    // a span for it (the timeline passes the person's default).
    onPastLabelClick() {
      this.selectPreset('past', this.pastLabelSpan || null);
    }

    pastLabelTitle() {
      if (this.pastLabelSpan) {
        return `Use your default (${this.postedSpan.format(this.pastLabelSpan)})`;
      }
      return this.pastOnly ? 'Show pins posted at any time' : 'Show all past pins';
    }

    // Called by the pencil button.
    togglePanel() {
      if (this.panelOpen) {
        this.closePanel();
        return;
      }
      this.panelOpen = true;
      this.pastText = this.pastLabel();
      this.futureText = this.futureLabel();
      this.pastInvalid = false;
      this.futureInvalid = false;
    }

    closePanel() {
      this.panelOpen = false;
    }

    onPanelInputKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closePanel();
      }
    }

    // A preset button in the panel, or its "All" button (within === null).
    selectPreset(side, within) {
      this._applyExact(side, within);
    }

    // The panel's typed field, submitted by its own form.
    applyTyped(side) {
      const text = side === 'past' ? this.pastText : this.futureText;
      // A typed 0 is only accepted where 0 is itself one of the steps.
      const within = this.postedSpan.parseTyped(text, this._zeroIndex() !== -1);
      if (!within) {
        if (side === 'past') {
          this.pastInvalid = true;
        } else {
          this.futureInvalid = true;
        }
        return;
      }
      this.selectPreset(side, within);
    }

    // Private helper functions

    _percentFromCenter(index) {
      return this.maxIndex ? (index / this.maxIndex) * 50 : 0;
    }

    _formatWithin(within) {
      return within ? this.postedSpan.format(within) : 'All';
    }

    _withinForIndex(index) {
      return index >= this._steps.length ? null : this._steps[index];
    }

    // The step whose magnitude is closest to within, on a log scale so "10
    // days" reads as roughly as close to "1 week" as to "1 month" rather
    // than always favouring the larger of the two. Used only to place the
    // thumb for a value the panel typed in that is not itself one of the
    // fixed steps - the value actually applied is exact regardless.
    _nearestIndexForWithin(within) {
      if (!within) {
        return this.maxIndex;
      }
      const target = this.postedSpan.approxDays(within);
      if (target == null || !this._steps.length) {
        return this.maxIndex;
      }
      // Zero has no place on a log scale, so it goes straight to the zero
      // step (or the innermost one), and the zero step is skipped below.
      if (target === 0) {
        return Math.max(this._zeroIndex(), 0);
      }
      let bestIndex = 0;
      let bestDistance = Infinity;
      this._steps.forEach((step, index) => {
        const days = this.postedSpan.approxDays(step);
        if (!days) {
          return;
        }
        const distance = Math.abs(Math.log(days) - Math.log(target));
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      return bestIndex;
    }

    _zeroIndex() {
      return this._steps.findIndex(step => this.postedSpan.approxDays(step) === 0);
    }

    _clampIndex(index) {
      return Math.min(Math.max(index, 0), this.maxIndex);
    }

    _syncFromBindings() {
      this._pastExact = this.pastSpan || null;
      this._futureExact = this.futureSpan || null;
      this._pastIndex = this._nearestIndexForWithin(this._pastExact);
      this._futureIndex = this._nearestIndexForWithin(this._futureExact);
    }

    _startDrag(side, thumb, event) {
      event.preventDefault();
      this._drag = { side, rect: this._track.getBoundingClientRect() };
      thumb.focus();
      this._applyPointer(event);
    }

    _handlePointerMove(event) {
      if (!this._drag) {
        return;
      }
      this._applyPointer(event);
    }

    _endDrag() {
      this._drag = null;
    }

    // A position anywhere on the track resolves to an index on whichever
    // half the dragged thumb owns, clamped so it can never cross the centre
    // onto the other thumb's side. In single-sided mode the one thumb owns
    // the whole track, "Now" pinned to the left edge instead of the centre.
    _applyPointer(event) {
      const { rect } = this._drag;
      const clientX = event.clientX;
      const positionPercent = ((clientX - rect.left) / rect.width) * 100;

      if (this.pastOnly) {
        const percentFromNow = Math.min(Math.max(positionPercent, 0), 100);
        this._applyIndex('past', Math.round((percentFromNow / 100) * this.maxIndex));
        return;
      }

      // Stacked thumbs: the first move off "Now" picks the side, and the
      // drag stays with that side from then on.
      if (!this._drag.side) {
        if (positionPercent === 50) {
          return;
        }
        this._drag.side = positionPercent < 50 ? 'past' : 'future';
      }
      const side = this._drag.side;

      const percentFromCenter = side === 'past'
        ? Math.min(Math.max(50 - positionPercent, 0), 50)
        : Math.min(Math.max(positionPercent - 50, 0), 50);

      const index = Math.round((percentFromCenter / 50) * this.maxIndex);
      this._applyIndex(side, index);
    }

    // Drag and keyboard move by whole steps, so the value they land on is
    // always exactly that step's own within-code.
    _applyIndex(side, index) {
      this._applyExact(side, this._withinForIndex(index));
    }

    // The one path every change to a side's value goes through, whether it
    // came from the thumb snapping to a step or the panel's exact typed
    // value: sets the applied within, places the thumb at its nearest step,
    // and emits. $applyAsync rather than $apply - pointer events land
    // outside any digest, but the keyboard and panel paths arrive already
    // inside one, where $apply would throw "already in progress".
    _applyExact(side, within) {
      const next = within || null;
      this._applyBoth(
        side === 'past' ? next : this._pastExact,
        side === 'future' ? next : this._futureExact
      );
    }

    // Both sides in one change, so a caller that reloads on every change
    // (the map) reloads once rather than once per side.
    _applyBoth(past, future) {
      const nextPast = past || null;
      const nextFuture = future || null;
      if (this._pastExact === nextPast && this._futureExact === nextFuture) {
        return;
      }
      this.$scope.$applyAsync(() => {
        this._pastExact = nextPast;
        this._futureExact = nextFuture;
        this._pastIndex = this._nearestIndexForWithin(nextPast);
        this._futureIndex = this._nearestIndexForWithin(nextFuture);
        // The panel's fields follow every change, however it was made - a
        // drag with the panel open used to leave them on the old value.
        this.pastText = this.pastLabel();
        this.futureText = this.futureLabel();
        this.pastInvalid = false;
        this.futureInvalid = false;
        this.onChange({
          past: this._pastExact,
          pastLabel: this.pastLabel(),
          future: this._futureExact,
          futureLabel: this.futureLabel()
        });
      });
    }

  }

  angular.module('chronopinNodeApp')
    .component('timeRangeSlider', {
      templateUrl: 'components/time-range-slider/time-range-slider.html',
      controller: TimeRangeSliderController,
      bindings: {
        pastSpan: '<',
        futureSpan: '<',
        steps: '<',
        pastOnly: '<',
        pastLabelSpan: '<',
        onChange: '&'
      }
    });
})();
