"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

exports.publish = publish;

var _environment = require("../config/environment");

var _environment2 = _interopRequireDefault(_environment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var AWS = require("aws-sdk");
var Promise = require("bluebird");
function publish(arn, data) {

  // data = {
  //   "to": "flynni2008@gmail.com",
  //   "facebookId": 10100470408434696,
  //   "firstName": "Ian",
  //   "lastName": "Flynn",
  //   "gender": "Male",
  //   "locale": "en_US",
  //   "pictureUrl": "https://graph.facebook.com/10100470408434696/picture?type=large",
  //   "fbUpdatedTime": "2018-03-08T05:55:49.620Z",
  //   "fbverified": true,
  //   "email": "new_user@gmail.com",
  //   "role": "user",
  //   "provider": "facebook",
  //   "about": "check out www.DiceManiac.com"
  // }
  var params = {
    Message: (0, _stringify2.default)(data), /* required */
    // MessageAttributes: {
    //   '<String>': {
    //     DataType: 'STRING_VALUE', /* required */
    //     BinaryValue: new Buffer('...') || 'STRING_VALUE' /* Strings will be Base-64 encoded on your behalf */,
    //     StringValue: 'STRING_VALUE'
    //   },
    //   /* '<String>': ... */
    // },
    // MessageStructure: 'json',
    // PhoneNumber: 'STRING_VALUE',
    // Subject: 'STRING_VALUE',
    // TargetArn: 'STRING_VALUE',
    TopicArn: arn
  };

  var sns = new AWS.SNS({
    accessKeyId: _environment2.default.aws.accessKeyId,
    secretAccessKey: _environment2.default.aws.secretAccessKey,
    region: _environment2.default.aws.region
  });

  var snsPublish = Promise.promisify(sns.publish, { context: sns });

  return snsPublish(params).then(function (data) {
    // console.log(data); // successful response
    return data;
  }).catch(function (err) {
    console.log(err, err.stack); // an error occurred
    throw err;
  });
}
//# sourceMappingURL=index.js.map
