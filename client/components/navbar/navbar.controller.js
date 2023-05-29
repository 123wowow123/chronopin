'use strict';

class NavbarController {

  constructor(Auth, $rootScope, $stateParams, $state, $scope, $element, $location, Util, searchService, appConfig, pinWebService, $transitions) {
    this.isLoggedIn = Auth.isLoggedIn;
    this.isAdmin = Auth.isAdmin;
    this.getCurrentUser = Auth.getCurrentUser;
    this.getCurrentUserName = Auth.getCurrentUserName;

    this.isCollapsed = true;
    this.searchControlsFocus = false;

    this.$rootScope = $rootScope;
    this.$stateParams = $stateParams;
    this.$state = $state;
    this.$location = $location;

    this.Util = Util;
    this.searchService = searchService;
    this.pinWebService = pinWebService;

    this.searchChoices = appConfig.searchChoices;
    this.$el = $element;
    this.$scope = $scope;
    this.$transitions = $transitions;

    this.registeredListeners = {};
    this.searchChoice = this.Util.sanitizeSearchChoice();
    this.searchCountSubmitted = 0;
  }

  $onInit() {
    const searchSubmitListener = this.$scope.$on('search:submit', (event, args) => {
      this.search = args.searchText;
      this.searchChoice = this.Util.sanitizeSearchChoice(args.searchChoiceText);
    });
    this.registeredListeners['search:submit'] = searchSubmitListener;
  }

  clearSuggestionsAndDismiss() {
    this.suggestions = [];
    this.showSuggestions = false;
  }

  submitSearch(searchText, searchChoiceText) {
    this.dismissAutoComplete();
    this.searchService.goSearch(searchText, searchChoiceText);
    this.searchCountSubmitted = 0;
  }

  autoComplete(searchText, searchChoiceText) {
    // TODO: add popular search suggestions
    if (!searchText) {
      this.clearSuggestionsAndDismiss();
    }
    const query = searchText;
    const filter = this.Util.sanitizeSearchChoice(searchChoiceText);

    this.searchCountSubmitted++;
    return this.pinWebService
      .autocomplete({
        q: query,
        f: filter && filter.value
      })
      .then(res => {
        return _.get(res, 'data.pins', []);
      })
      .then(suggestions => {
        this.suggestions = suggestions;
        if (this.searchCountSubmitted !== 0) {
          this.showSuggestions = !!_.get(this, 'suggestions.length');
        }
      })
      .catch(err => {
        throw err;
      })
      .finally(() => {
        if (this.searchCountSubmitted !== 0) {
          this.searchCountSubmitted--;
        }
      });
  }

  showLogo() {
    return !this.search && !this.searchControlsFocus;
  }

  clearSearchToMain() {
    this.clearSearch();
    // Empty search and filter will return home
    this.submitSearch(
      this.search,
      this.searchChoice.value,
    );
  }

  clearSearch() {
    this.search = null;
    this.searchChoice = this.searchChoices[0];
    return this;
  }

  searhFocusToggle(focus) {
    this.searchControlsFocus = focus;
  }

  searchChange(searchChoice) {
    this.searchChoice = searchChoice;
    this.submitSearch(this.search, searchChoice.value);
  }

  // onPressEnter($event, searchText, searchChoiceText) {
  //   if ($event.key === "Enter") {
  //     this.submitSearch(searchText, searchChoiceText);
  //   }
  // }

  showAutoComplete($event, searchText) {
    $event.stopPropagation();
    if (!searchText) {
      return this.clearSuggestionsAndDismiss();
    }

    if (_.get(this, 'suggestions.length', 0)) {
      this.showSuggestions = true;
    }
  }

  onAutoCompleteSelect($event) {
    this.search = $event.data.title;
    this.submitSearch(this.search, this.searchChoice.value);
  }

  dismissAutoComplete() {
    this.showSuggestions = false;
  }

  $onDestroy() {
    this._unRegisterListeners();
  }

  _unRegisterListeners() {
    if (this.registeredListeners['search:submit']) {
      this.registeredListeners['search:submit']();
      delete this.registeredListeners['search:submit'];
    }
  }

}

angular.module('chronopinNodeApp')
  .controller('NavbarController', NavbarController);

