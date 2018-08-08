'use strict';

class NavbarController {
  //end-non-standard

  //start-non-standard
  constructor(Auth, $rootScope, $state) {
    this.isLoggedIn = Auth.isLoggedIn;
    this.isAdmin = Auth.isAdmin;
    this.getCurrentUser = Auth.getCurrentUser;
    this.getCurrentUserName = Auth.getCurrentUserName;

    this.isCollapsed = true;

    this.$rootScope = $rootScope;
    this.$state = $state;
  }

  $onInit() {
    this.search = this.$state.params.q;
}

  submitSearch(searchText) {
    this.$state.go('search', { q: searchText });
    return this;
  }

  autoComplete(searchText) {
    // this.$rootScope.$broadcast('navbar.search', {
    //   searchText: searchText
    // })
    // return this;
  }

  clearSearch(searchText) {
    this.search = null;
    this.$state.go('main', { q: searchText });
    return this;
  }

}

angular.module('chronopinNodeApp')
  .controller('NavbarController', NavbarController);
