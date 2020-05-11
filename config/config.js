const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;

const config = {
  AWSConfig: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
    region: AWS_REGION,
    destinationBucketName: AWS_S3_BUCKET || 'opl-media'
  }
}

module.exports = config;
