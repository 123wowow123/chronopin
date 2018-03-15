'use strict';

class NavbarController {
  //end-non-standard

  //start-non-standard
  constructor(Auth, $rootScope) {
    this.isLoggedIn = Auth.isLoggedIn;
    this.isAdmin = Auth.isAdmin;
    this.getCurrentUser = Auth.getCurrentUser;
    this.getCurrentUserName = Auth.getCurrentUserName;

    this.isCollapsed = true;

    this.$rootScope = $rootScope;
  }

  submitSearch(searchText) {
    this.$rootScope.$broadcast('navbar.search', {
      searchText: searchText
    });
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
    this.$rootScope.$broadcast('navbar.clearSearch', {
      prevSearchText: searchText
    });
    return this;
  }

}

angular.module('chronopinNodeApp')
  .controller('NavbarController', NavbarController);
