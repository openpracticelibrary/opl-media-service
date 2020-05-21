const { Octokit } = require('@octokit/rest');
const { AWSConfig, GitHubConfig } = require('../config/config');
const AWSS3Uploader = require('./AWSS3Uploader');
const GitHubUploader = require('./GitHubUploader');

const s3Uploader = new AWSS3Uploader(AWSConfig);
const gitUploader = new GitHubUploader(GitHubConfig, Octokit);

module.exports = { gitUploader, s3Uploader };
