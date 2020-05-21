const { AWS_REGION } = process.env;
const { AWS_ACCESS_KEY } = process.env;
const { AWS_SECRET_KEY } = process.env;
const { AWS_S3_BUCKET } = process.env;
const { GITHUB_PAT } = process.env;

const config = {
  AWSConfig: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
    region: AWS_REGION,
    destinationBucketName: AWS_S3_BUCKET || 'opl-media',
  },
  GitHubConfig: {
    pat: GITHUB_PAT,
    org: 'openpracticelibrary',
    repo: 'opl-media',
  },
};

module.exports = config;
