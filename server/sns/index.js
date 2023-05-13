const AWS = require("aws-sdk");
const Promise = require("bluebird");
import config from '../config/environment';

export function publish(arn, data) {

  // data = {
  //   "to": "flynni2008@gmail.com",
  //   "facebookId": 10100470408434696,
  //   "firstName": "Ian",
  //   "lastName": "Flynn",
  //   "gender": "Male",
  //   "locale": "en_US",
  //   "pictureUrl": "https://graph.facebook.com/10100470408434696/picture?type=large",
  //   "fbUpdatedTime": "2018-03-08T05:55:49.620Z",
  //   "fbVerified": true,
  //   "googleVerified": true,
  //   "email": "new_user@gmail.com",
  //   "role": "user",
  //   "provider": "facebook",
  //   "about": "check out www.DiceManiac.com"
  // }
  let params = {
    Message: JSON.stringify(data), /* required */
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

  const sns = new AWS.SNS({
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
    region: config.aws.region
  });

  const snsPublish = Promise.promisify(sns.publish, { context: sns });

  return snsPublish(params)
    .then((data) => {
      // console.log(data); // successful response
      return data;
    })
    .catch((err) => {
      console.log(err, err.stack); // an error occurred
      throw err;
    });

}

