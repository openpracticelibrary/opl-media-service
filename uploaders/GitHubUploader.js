const { Octokit } = require("@octokit/rest");
const gm = require("gm");
const stream = require("stream");
const { readFile } = require("fs-extra");

class GitHubUploader {
  constructor(config) {
    this.octo = new Octokit({
      auth: config.pat,
      userAgent: "opl-media-service v0.0.1",
    });
    this.org = config.org;
    this.repo = config.repo;
    this.baseUrl = "https://openpracticelibrary.github.io/opl-media/images";
    this.branch = "master";
  }

  async getImages(parent, args) {
    const { data: content } = await this.octo.repos.getContents({
      owner: this.org,
      repo: this.repo,
      path: "/images",
    });

    console.log(args);
    const resolver = content.map(({ type, size, name, path, html_url }) => {
      return {
        type,
        size,
        name,
        link: `${this.baseUrl}/${name}`,
        rawGHLink: html_url,
      };
    });

    if (args.sort) {
      const sortOrder = args.sort === 'size_ASC' ? (a, b) => a.size - b.size : (a, b) => b.size - a.size;
      console.log(sortOrder.toString());
      return resolver.sort(sortOrder);
    } else {
      return resolver;
    }
  }

  async compressFile(file) {
    const { createReadStream, filename, mimetype, encoding } = await file;
    const stream = createReadStream();

    return new Promise(function (resolve, reject) {
      gm(stream, filename)
        .resize(2000, null, ">")
        .quality(60)
        .write(filename, function (err) {
          if (err) {
            reject(`${filename} errored with ${err}!`);
          }

          resolve({
            filename,
            mimetype,
            encoding,
          });
        });
    });
  }

  async uploadToRepo(parent, { file }) {
    try {
      const { filename, mimetype, encoding } = await this.compressFile(file);
      const currentCommit = await this.getCurrentCommit();
      const fileBlob = await this.createBlob(filename);
      const newTree = await this.createNewTree(
        fileBlob,
        currentCommit.treeSha,
        filename
      );

      const commitMessage = "File upload from OPL";

      const { data: newCommit } = await this.createNewCommit(
        commitMessage,
        newTree.sha,
        currentCommit.commitSha
      );

      await this.setBranchToCommit(newCommit.sha);

      return {
        filename,
        mimetype,
        encoding,
        url: `${this.baseUrl}/${filename}`,
      };
    } catch (err) {
      console.error(err);
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
    return readFile(file, "base64");
  }

  async createBlob(file) {
    const content = await this._getFileAsUtf8(file);
    const blobData = await this.octo.git.createBlob({
      owner: this.org,
      repo: this.repo,
      content,
      encoding: "base64",
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
          mode: "100644",
          type: "blob",
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
