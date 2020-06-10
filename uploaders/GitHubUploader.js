const gm = require('gm');
const { readFile, unlink } = require('fs-extra');

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

  async compressFile(file, type) {
    const { createReadStream, filename, mimetype, encoding } = await file;
    const stream = createReadStream();

    return new Promise(function (resolve, reject) {
      if (type === 'cover') {
        const thumbname = `thumb_${filename}`;
        gm(stream, filename)
          .resize(500, 300)
          .quality(60)
          .write(thumbname, function (err) {
            if (err) {
              reject(new Error(`thumb_${filename} errored with ${err}!`));
            }
          });
      }
      gm(stream, filename)
        .resize(2000, null, '>')
        .quality(60)
        .write(filename, function (err) {
          if (err) {
            reject(new Error(`${filename} errored with ${err}!`));
          }

          resolve({
            filename,
            mimetype,
            encoding,
          });
        });
    });
  }

  async deleteFileAfterCommit(file, type) {
    return new Promise(function (resolve, reject) {
      if (type === 'cover') {
        unlink(`thumb_${file}`, function (err) {
          if (err) reject(err);
          console.info(`thumb_${file} committed and removed successfully`);
        });
      }

      unlink(file, function (err) {
        if (err) reject(err);
        console.info(`${file} committed and removed successfully`);
        resolve(true);
      });
    });
  }

  async uploadCover(parent, { file }) {
    this.uploadToRepo(parent, { file, type: 'cover' });

    return true;
  }

  async uploadToRepo(parent, { file, type = 'library' }) {
    try {
      const { filename, mimetype, encoding } = await this.compressFile(file, type);
      const currentCommit = await this.getCurrentCommit();
      const fileBlob = await this.createBlob(filename, type);
      const newTree = await this.createNewTree(fileBlob, currentCommit.treeSha, filename, type);

      const commitMessage = 'File upload from OPL';

      const { data: newCommit } = await this.createNewCommit(
        commitMessage,
        newTree.sha,
        currentCommit.commitSha
      );

      await this.setBranchToCommit(newCommit.sha);

      await this.deleteFileAfterCommit(filename, type);

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
    return readFile(file, 'base64');
  }

  async createBlob(file, type) {
    const blobArr = [];
    const content = await this._getFileAsUtf8(file);
    const blobData = await this.octo.git.createBlob({
      owner: this.org,
      repo: this.repo,
      content,
      encoding: 'base64',
    });
    blobArr.push(blobData.data);

    if (type === 'cover') {
      const thumbContent = await this._getFileAsUtf8(`thumb_${file}`);
      const thumbData = await this.octo.git.createBlob({
        owner: this.org,
        repo: this.repo,
        content: thumbContent,
        encoding: 'base64',
      });
      blobArr.push(thumbData.data);
    }
    return blobArr;
  }

  async createNewTree(blob, parentTreeSha, filename, type) {
    const myTree = [
      {
        path: `images/${filename}`,
        mode: '100644',
        type: 'blob',
        sha: blob[0].sha,
      },
    ];

    if (type === 'cover') {
      const tmp = {
        path: `images/thumb_${filename}`,
        mode: '100644',
        type: 'blob',
        sha: blob[1].sha,
      };
      myTree.push(tmp);
    }

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
