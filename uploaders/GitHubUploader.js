const gm = require('gm');

class GitHubUploader {
  constructor(config, Octokit) {
    this.octo = new Octokit({
      auth: config.pat,
      userAgent: 'opl-media-service v0.0.1',
    });
    this.org = config.org;
    this.repo = config.repo;
    this.baseUrl = config.pagesUrl;
    this.branch = 'master';
    this.outputStream = [];
    this.outputThumbStream = [];
  }

  async getImages(parent, args) {
    const { data: content } = await this.octo.repos.getContents({
      owner: this.org,
      repo: this.repo,
      path: '/images',
    });

    const resolver = content.map(({ type, size, name, html_url: htmlUrl }) => {
      return {
        type,
        size,
        name,
        link: `${this.baseUrl}/${name}`,
        rawGHLink: htmlUrl,
      };
    });

    if (args.sort) {
      const sortOrder =
        args.sort === 'size_ASC' ? (a, b) => a.size - b.size : (a, b) => b.size - a.size;
      return resolver.sort(sortOrder);
    }
    return resolver;
  }

  async compressFile(file) {
    const { createReadStream, filename, mimetype, encoding } = await file;
    const stream = createReadStream();

    const streamArray = ['outputStream', 'outputThumbStream'].map(function (i) {
      return new Promise(function (resolve, reject) {
        let w = 2000;
        let q = 60;
        if (i == 'outputStream') {
          w = 2000;
          q = 60;
        } else {
          w = 500;
          q = 50;
        }
        gm(stream, filename)
          .resize(w, null, '>')
          .quality(q)
          .stream(function (err, stdout) {
            if (err) {
              reject(new Error(`${filename} errored with ${err}!`));
            }

            const bufs = [];
            stdout.on('data', function (d) {
              bufs.push(d);
            });

            stdout.on('end', function () {
              this[i] = Buffer.concat(bufs);
              resolve({ filename, mimetype, encoding, stream: this[i] });
            });
          });
      });
    });

    return streamArray;
  }

  async uploadToRepo(parent, { file, type = 'library' }) {
    try {
      const streamArray = await this.compressFile(file);
      const [imageStream, thumbStream] = await Promise.all(streamArray);
      const currentCommit = await this.getCurrentCommit();
      const fileBlob = await this.createBlob([imageStream.stream, thumbStream.stream]);
      const newTree = await this.createNewTree(
        fileBlob,
        currentCommit.treeSha,
        imageStream.filename
      );

      const commitMessage = 'File upload from OPL';

      const { data: newCommit } = await this.createNewCommit(
        commitMessage,
        newTree.sha,
        currentCommit.commitSha
      );

      await this.setBranchToCommit(newCommit.sha);

      return {
        filename: imageStream.filename,
        mimetype: imageStream.mimetype,
        encoding: imageStream.encoding,
        url: `${this.baseUrl}/${imageStream.filename}`,
      };
    } catch (err) {
      console.error(err);
      return {
        filename: err,
      };
    }
  }

  async getCurrentCommit() {
    const { data: refData } = await this.octo.git.getRef({
      owner: this.org,
      repo: this.repo,
      ref: `heads/${this.branch}`,
    });

    const commitSha = refData.object.sha;

    const { data: commitData } = await this.octo.git.getCommit({
      owner: this.org,
      repo: this.repo,
      commit_sha: commitSha,
    });

    return {
      commitSha,
      treeSha: commitData.tree.sha,
    };
  }

  _getFileAsUtf8(file) {
    return file.toString('base64');
  }

  async createBlob(file) {
    const blobArr = [];
    for (let i = 0; i < file.length; i += 1) {
      const content = file[i].toString('base64');
      // eslint-disable-next-line no-await-in-loop
      const tmp = await this.octo.git.createBlob({
        owner: this.org,
        repo: this.repo,
        content,
        encoding: 'base64',
      });
      blobArr.push(tmp.data);
    }

    return Promise.resolve(blobArr);
  }

  async createNewTree(blob, parentTreeSha, filename) {
    const myTree = [
      {
        path: `images/${filename}`,
        mode: '100644',
        type: 'blob',
        sha: blob[0].sha,
      },
      {
        path: `thumbs/${filename}`,
        mode: '100644',
        type: 'blob',
        sha: blob[1].sha,
      },
    ];

    const { data } = await this.octo.git.createTree({
      owner: this.org,
      repo: this.repo,
      tree: myTree,
      base_tree: parentTreeSha,
    });

    return data;
  }

  async createNewCommit(message, currentTreeSha, currentCommitSha) {
    return this.octo.git.createCommit({
      owner: this.org,
      repo: this.repo,
      message,
      tree: currentTreeSha,
      parents: [currentCommitSha],
    });
  }

  async setBranchToCommit(commitSha) {
    return this.octo.git.updateRef({
      owner: this.org,
      repo: this.repo,
      ref: `heads/${this.branch}`,
      sha: commitSha,
    });
  }
}

module.exports = GitHubUploader;
