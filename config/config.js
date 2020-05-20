const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
const GITHUB_PAT = process.env.GITHUB_PAT;

const config = {
  AWSConfig: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
    region: AWS_REGION,
    destinationBucketName: AWS_S3_BUCKET || "opl-media",
  },
  GitHubConfig: {
    pat: GITHUB_PAT,
    org: 'openpracticelibrary',
    repo: 'opl-media'
  },
};

module.exports = config;
