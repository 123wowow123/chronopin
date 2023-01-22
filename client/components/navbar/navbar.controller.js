'use strict';

class NavbarController {
  //end-non-standard

  //start-non-standard

  constructor(Auth, $rootScope, $state, $scope, $element, Util, appConfig, pinWebService) {
    this.isLoggedIn = Auth.isLoggedIn;
    this.isAdmin = Auth.isAdmin;
    this.getCurrentUser = Auth.getCurrentUser;
    this.getCurrentUserName = Auth.getCurrentUserName;

    this.isCollapsed = true;
    this.searchControlsFocus = false;

    this.$rootScope = $rootScope;
    this.$state = $state;

    this.Util = Util;
    this.pinWebService = pinWebService;

    this.searchChoices = appConfig.searchChoices;
    this.$el = $element;
    this.$scope = $scope;
  }

  $onInit() {
    this.search = this.$state.params.q;
    this.searchChoice = this.Util.sanitizeSearchChoice(this.$state.params.f);
  }

  clearSuggestionsAndDismiss() {
    // TODO: add popular search suggestions
    this.suggestions = [];
    this.showSuggestions = false;
  }

  submitSearch(searchText, searchChoiceText) {
    this.dismissAutoComplete();
    this.$state.go('search', { q: searchText, f: searchChoiceText });
    return this;
  }

  autoComplete(searchText, searchChoiceText) {
    //debugger
    if (!searchText) {
      debugger;
      this.clearSuggestionsAndDismiss();
    }
    const query = searchText;
    const filter = this.Util.sanitizeSearchChoice(searchChoiceText);

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
        this.showSuggestions = !!_.get(this, 'suggestions.length');
      })
      .catch(err => {
        throw err;
      });
  }

  showLogo() {
    //debugger
    return !this.search && !this.searchControlsFocus;
  }

  clearSearchToMain() {
    return this
      .clearSearch()
      .goToMain();
  }

  clearSearch() {
    this.search = null;
    return this;
  }

  goToMain() {
    this.$state.go('main');
    return this;
  }

  searhFocusToggle(focus) {
    //debugger
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
    //console.log(JSON.stringify($event));
    $event.stopPropagation();

    if (!searchText) {
      //debugger;
      return  this.clearSuggestionsAndDismiss();
    }

    if (_.get(this, 'suggestions.length', 0)) {
      this.showSuggestions = true;
    }
  }

  onAutoCompleteSelect($event) {
    //console.log(JSON.stringify($event.data));
    this.search = $event.data.title;
    this.submitSearch(this.search, this.searchChoice.value);
  }

  dismissAutoComplete() {
    //console.log("On autocomplete dismiss", JSON.stringify())
    //debugger;
    this.showSuggestions = false;
  }

}

angular.module('chronopinNodeApp')
  .controller('NavbarController', NavbarController);

