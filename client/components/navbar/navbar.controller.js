'use strict';

class NavbarController {
  //end-non-standard

  searchChoices = [
    { name: 'All', value: 'all' },
    { name: 'Watched', value: 'watch' }
    //'People'
  ];

  //start-non-standard
  constructor(Auth, $rootScope, $state) {
    this.isLoggedIn = Auth.isLoggedIn;
    this.isAdmin = Auth.isAdmin;
    this.getCurrentUser = Auth.getCurrentUser;
    this.getCurrentUserName = Auth.getCurrentUserName;

    this.isCollapsed = true;

    this.$rootScope = $rootScope;
    this.$state = $state;

    this.searchChoice = this.searchChoices[0];
  }

  $onInit() {
    this.search = this.$state.params.q;
  }

  submitSearch(searchText, searchChoice) {
    this.$state.go('search', { q: searchText, f: searchChoice });
    return this;
  }

  autoComplete(searchText) {
    // this.$rootScope.$broadcast('navbar.search', {
    //   searchText: searchText
    // })
    // return this;
  }

  clearSearch() {
    this.search = null;
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
