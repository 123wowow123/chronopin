 /*jshint unused:false*/
 'use strict';

 (function() {

   angular.module('chronopinNodeApp')
     .config(function($stateProvider) {
       $stateProvider.state('main.modalScroller', {
         views: {
           'modalScroller@': {
             template: '<modal-scroller></modal-scroller>'
           }
         },
         onEnter: function($state) {
           $(document).on('keyup', function(e) {
             if (e.keyCode === 27) {
               $(document).off('keyup');
               $state.go('main');
             }
           });

           $(document).on('click', '.modal - backdrop, .modal - holder', function() {
             $state.go('main');
           });

           $(document).on('click', '.modal-box, .modal-box *', function(e) {
             e.stopPropagation();
           });

           $('body').addClass('modal-open');
         },
         onExit: function($state) {
           $('body').removeClass('modal-open');
         },
         abstract: true
       });

       $stateProvider.state('main.modalScroller.addPin', {
         url: 'addpin',
         views: {
           'modal': {
             template: '<pin-form class="modal-wrapper" title="Add Pin"></pin-form>'
           }
         }
       });

       $stateProvider.state('main.modalScroller.editPin', {
         url: 'editpin/:id',
         views: {
           'modal': {
             template: '<pin-form class="modal-wrapper" title="Edit Pin" mode="edit"></pin-form>'
           }
         }
       });

     });

 })();
