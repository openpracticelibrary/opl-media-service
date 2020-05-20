const AWS = require('aws-sdk');
const stream = require('stream');

class AWSS3Uploader {
  constructor(config) {
    AWS.config = new AWS.Config();
    AWS.config.update({
      region: config.region || 'us-east-1',
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });

    this.s3 = new AWS.S3();
    this.config = config;
  }

  getUploads() {
    const that = this;
    return new Promise((resolve, reject) => {
      that.s3.listObjects(
        {
          Bucket: that.config.destinationBucketName,
        },
        (err, data) => {
          if (err) reject(err);
          else {
            const result = data.Contents.map((item) => {
              return {
                filename: item.Key,
                url: `https://${that.config.destinationBucketName}.s3.amazonaws.com/${item.Key}`,
              };
            });

            resolve(result);
          }
        }
      );
    });
  }

  createUploadStream(key) {
    const pass = new stream.PassThrough();
    return {
      writeStream: pass,
      promise: this.s3
        .upload({
          Bucket: this.config.destinationBucketName,
          Key: key,
          Body: pass,
        })
        .promise(),
    };
  }

  async getUploadsResolver() {
    try {
      const result = await this.getUploads();

      return result;
    } catch (err) {
      console.error(err, err.stack);
      throw err;
    }
  }

  async singleUploadResolver(parent, { file }) {
    const { createReadStream, filename, mimetype, encoding } = await file;
    const rs = createReadStream();
    const uploadStream = this.createUploadStream(filename);

    rs.pipe(uploadStream.writeStream);
    const data = await uploadStream.promise;

    return { filename, mimetype, encoding, url: data.Location };
  }
}

module.exports = AWSS3Uploader;
