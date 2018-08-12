'use strict';

class NavbarController {
  //end-non-standard

  searchChoice = [
    { name: 'All', value: 'all' },
    { name: 'Watched', value: 'watch' }
    //'People'
  ];

  searchSelect;

  //start-non-standard
  constructor(Auth, $rootScope, $state) {
    this.isLoggedIn = Auth.isLoggedIn;
    this.isAdmin = Auth.isAdmin;
    this.getCurrentUser = Auth.getCurrentUser;
    this.getCurrentUserName = Auth.getCurrentUserName;

    this.isCollapsed = true;

    this.$rootScope = $rootScope;
    this.$state = $state;

    this.searchSelect = this.searchChoice[0];
  }

  $onInit() {
    this.search = this.$state.params.q;
  }

  submitSearch(searchText, searchSelectText) {
    this.$state.go('search', { q: searchText, f: searchSelectText });
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

  searchChange(selectText) {
    this.searchSelect = selectText;
  }

}

angular.module('chronopinNodeApp')
  .controller('NavbarController', NavbarController);
