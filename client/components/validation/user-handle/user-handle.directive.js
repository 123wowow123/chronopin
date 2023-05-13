angular.module('chronopinNodeApp')
  .directive('userHandle', (Auth) => {
    return {
      require: 'ngModel',
      link: function (scope, element, attr, mCtrl) {
        function handleValidation(value) {
          const prefixedHandle = '@' + value;
          Auth.checkHandle(prefixedHandle).then((res) => {
            const data = res.data;
            mCtrl.$setValidity('handleAvailable', data.available);
            // console.log('handleAvailable')
          }).catch((err) => {
            mCtrl.$setValidity('handleAvailable', false);
            // console.error(err);
          })
          return value;
        }
        mCtrl.$parsers.push(handleValidation);
      }
    };
  });