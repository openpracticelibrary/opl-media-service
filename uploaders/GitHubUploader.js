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

    return new Promise(function (resolve, reject) {
      gm(stream, filename)
        .resize(2000, null, '>')
        .quality(60)
        .stream(function (err, stdout) {
          if (err) {
            reject(new Error(`${filename} errored with ${err}!`));
          }

          const bufs = [];
          stdout.on('data', function (d) {
            bufs.push(d);
          });

          stdout.on('end', function () {
            this.outputStream = Buffer.concat(bufs);
            resolve({ filename, mimetype, encoding, stream: this.outputStream });
          });
        });
    });
  }

  async deleteFileAfterCommit(file) {
    return new Promise(function (resolve) {
      console.info(`${file} committed and removed successfully`);
      resolve(true);
    });
  }

  async uploadToRepo(parent, { file }) {
    try {
      const { filename, mimetype, encoding, stream } = await this.compressFile(file);
      const currentCommit = await this.getCurrentCommit();
      const fileBlob = await this.createBlob(stream);
      const newTree = await this.createNewTree(fileBlob, currentCommit.treeSha, filename);

      const commitMessage = 'File upload from OPL';

      const { data: newCommit } = await this.createNewCommit(
        commitMessage,
        newTree.sha,
        currentCommit.commitSha
      );

      await this.setBranchToCommit(newCommit.sha);

      await this.deleteFileAfterCommit(filename);

      return {
        filename,
        mimetype,
        encoding,
        url: `${this.baseUrl}/${filename}`,
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

  async createBlob(stream) {
    const content = await this._getFileAsUtf8(stream);
    const blobData = await this.octo.git.createBlob({
      owner: this.org,
      repo: this.repo,
      content,
      encoding: 'base64',
    });

    return blobData.data;
  }

  async createNewTree(blob, parentTreeSha, filename) {
    const { data } = await this.octo.git.createTree({
      owner: this.org,
      repo: this.repo,
      tree: [
        {
          path: `images/${filename}`,
          mode: '100644',
          type: 'blob',
          sha: blob.sha,
        },
      ],
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
