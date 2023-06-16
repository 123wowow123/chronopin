'use strict';

angular.module('chronopinNodeApp')
  .factory('Modal', function ($rootScope, $uibModal) {
    /**
     * Opens a modal
     * @param  {Object} scope      - an object to be merged with modal's scope
     * @param  {String} modalClass - (optional) class(es) to be applied to the modal
     * @return {Object}            - the instance $uibModal.open() returns
     */
    function openModal(scope = {}, modalClass = 'modal-default') {
      var modalScope = $rootScope.$new();

      angular.extend(modalScope, scope);

      return $uibModal.open({
        templateUrl: 'components/modal/modal.html',
        windowClass: modalClass,
        scope: modalScope
      });
    }

    // Public API here
    return {

      /* Confirmation modals */
      confirm: {

        delete() {
          return function () {
            let args = Array.prototype.slice.call(arguments),
              name = args.shift(),
              deleteModal;

            deleteModal = openModal({
              modal: {
                dismissable: true,
                title: 'Confirm Delete',
                html: '<p>Are you sure you want to delete <strong>' + name +
                  '</strong> ?</p>',
                buttons: [{
                  classes: 'btn-danger',
                  text: 'Delete',
                  click: function (e) {
                    deleteModal.close(e);
                  }
                }, {
                  classes: 'btn-default',
                  text: 'Cancel',
                  click: function (e) {
                    deleteModal.dismiss(e);
                  }
                }]
              }
            }, 'modal-danger');

            return deleteModal.result
          };
        },

        navigate() {
          return function (name) {
            let deleteModal = openModal({
              modal: {
                dismissable: true,
                title: 'Confirm Navigate',
                html: '<p>Are you sure you want to navigate away? Your changes will be lost.</p>',
                buttons: [{
                  classes: 'btn-warning',
                  text: 'Yes',
                  click: function (e) {
                    deleteModal.close(e);
                  }
                }, {
                  classes: 'btn-primary',
                  text: 'Cancel',
                  click: function (e) {
                    deleteModal.dismiss(e);
                  }
                }]
              }
            }, 'modal-warning');

            return deleteModal.result
          };
        },


      }
    };
  });
