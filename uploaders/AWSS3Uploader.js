const AWS = require('aws-sdk');
const stream = require('stream');

class AWSS3Uploader {
  constructor(config) {
    AWS.config = new AWS.Config();
    AWS.config.update({
      region: config.region || 'us-east-1',
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    });

    this.s3 = new AWS.S3();
    this.config = config;
  }

  createUploadStream(key) {
    const pass = new stream.PassThrough();
    return {
      writeStream: pass,
      promise: this.s3.upload({
        Bucket: this.config.destinationBucketName,
        Key: key,
        Body: pass
      }).promise()
    };
  }

  async singleUploadResolver(parent, { file }) {
    const { stream, filename, mimetype, encoding } = await file;
    const uploadStream = this.createUploadStream(filename);

    stream.pipe(uploadStream.writeStream);
    const result = await uploadStream.promise;

    return { filename, mimetype, encoding, url: result.Location };
  }

  async multipleUploadResolver(parent, { file }) {
    return Promise.all(
      files.map(f => this.singleUploadResolver(null, { file: f }))
    );
  }
}

module.exports = AWSS3Uploader;
