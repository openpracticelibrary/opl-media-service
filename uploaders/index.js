const { AWSConfig } = require('../config/config');
const AWSS3Uploader = require('./AWSS3Uploader');

console.log(AWSConfig);
const s3Uploader = new AWSS3Uploader(AWSConfig);

module.exports = { s3Uploader };
