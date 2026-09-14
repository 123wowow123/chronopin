import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import config from '../config/environment';

let client = null;

function getClient() {
  if (!client) {
    client = new SNSClient({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey
      }
    });
  }
  return client;
}

// data is the new user, e.g. { to, email, firstName, lastName, provider, role }
export function publish(arn, data) {
  return getClient()
    .send(new PublishCommand({
      Message: JSON.stringify(data),
      TopicArn: arn
    }))
    .catch((err) => {
      console.log(err, err.stack);
      throw err;
    });
}
