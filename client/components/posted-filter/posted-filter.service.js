'use strict';

(function () {

  // The vocabulary of "posted within" spans: the windows on offer, the words
  // they are shown as, and what a person is allowed to type for one. Shared by
  // the timeline filter and the settings page that chooses the span the filter
  // starts on, so the two cannot drift into offering different windows.

  // What the panel lists. Any other span is typed into the field above them.
  // "1 day" rather than "24 hours": the same window under two labels would
  // leave whichever one was not clicked looking unselected.
  const SPAN_OPTIONS = ['12h', '1d', '3d', '5d', '1w', '1mo', '1y'];

  // What the combo button shows before anything has been chosen, and what it
  // falls back to for someone who has saved no preference of their own.
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

  // Wire form ("5d") to the count and unit behind it. "mo" has to precede "m"
  // in the alternation, or it matches as minutes and the "o" fails the anchor.
  function _parseSpan(within) {
    const match = /^(\d+(?:\.\d+)?)(mo|m|h|d|w|y)$/.exec(within || '');
    const unit = match && _findUnit(match[2]);
    return unit ? { count: parseFloat(match[1]), unit: unit } : null;
  }

  function PostedSpanService() {

    // "5d" reads back as "5 days", which is what the button shows, so a span
    // picked from the list and the same span typed by hand look identical.
    function format(within) {
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
    function parseTyped(text) {
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

    // A span is only usable if it reads back as a label - anything else would
    // show as an empty button.
    function isSpan(within) {
      return !!format(within);
    }

    return {
      DEFAULT_SPAN: DEFAULT_SPAN,
      options: () => SPAN_OPTIONS.map(within => ({
        within: within,
        label: format(within)
      })),
      format: format,
      parseTyped: parseTyped,
      isSpan: isSpan
    };
  }

  angular.module('chronopinNodeApp')
    .factory('postedSpan', PostedSpanService);
})();
