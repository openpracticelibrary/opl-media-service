const { AWSConfig } = require('../config/config');
const AWSS3Uploader = require('./AWSS3Uploader');

const s3Uploader = new AWSS3Uploader(AWSConfig);

module.exports = { s3Uploader };
