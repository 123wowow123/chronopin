import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import config from './config';

let client: SNSClient | null = null;

function getClient() {
  if (!client) {
    client = new SNSClient({
      region: config.aws.region,
      credentials:
        config.aws.accessKeyId && config.aws.secretAccessKey
          ? { accessKeyId: config.aws.accessKeyId, secretAccessKey: config.aws.secretAccessKey }
          : undefined,
    });
  }
  return client;
}

// data is e.g. the new user: { to, email, firstName, lastName, provider, role }.
// Nothing publishes yet - the Express app had its new-user listener commented out.
export async function publish(arn: string, data: unknown) {
  try {
    return await getClient().send(new PublishCommand({ Message: JSON.stringify(data), TopicArn: arn }));
  } catch (err) {
    console.log(err);
    throw err;
  }
}
