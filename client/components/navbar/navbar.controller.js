'use strict';

class NavbarController {
  //end-non-standard

  //start-non-standard

  constructor(Auth, $rootScope, $state, Util, appConfig) {
    this.isLoggedIn = Auth.isLoggedIn;
    this.isAdmin = Auth.isAdmin;
    this.getCurrentUser = Auth.getCurrentUser;
    this.getCurrentUserName = Auth.getCurrentUserName;

    this.isCollapsed = true;

    this.$rootScope = $rootScope;
    this.$state = $state;

    this.Util = Util;

    this.searchChoices = appConfig.searchChoices;
  }

  $onInit() {
    this.search = this.$state.params.q;
    this.searchChoice = this.Util.sanitizeSearchChoice(this.$state.params.f);
  }

  submitSearch(searchText, searchChoiceText) {
    this.$state.go('search', { q: searchText, f: searchChoiceText });
    return this;
  }

  autoComplete(searchText) {
    // this.$rootScope.$broadcast('navbar.search', {
    //   searchText: searchText
    // })
    // return this;
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

  searchChange(searchChoice) {
    this.searchChoice = searchChoice;
    this.submitSearch(this.search, searchChoice.value);
  }

}

angular.module('chronopinNodeApp')
  .controller('NavbarController', NavbarController);
