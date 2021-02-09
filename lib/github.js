const CLI = require('clui');
const Configstore = require('configstore');
const { Octokit } = require('@octokit/rest');
const Spinner = CLI.Spinner;
const { createBasicAuth } = require('@octokit/auth-basic');

const inquirer = require('./inquirer');
const pkg = require('../package.json');

const conf = new Configstore(pkg.name);

let octokit;

module.exports = {
  getInstance: () => octokit,
  getStoredGithubToken: () => conf.get('github.token'),
  getPersonalAccessToken: async () => {
    const token = await inquirer.askGithubToken();
    return token;
  },
  getPersonalAccessTokenOG: async () => {
    const credentials = await inquirer.askGithubCreds();
    const status = new Spinner('Authenticating you, please wait...');

    status.start();

    const auth = createBasicAuth({
      username: credentials.username,
      password: credentials.password,
      async on2Fa() {
        status.stop();
        const res = await inquirer.getTwoFactorAuthCode();
        status.start();
        return res.twoFactorAuthenticationCode;
      },
      token: {
        scopes: ['user', 'public_repo', 'repo', 'repo:status'],
        note: 'ginit, the command-line tool for initializing Git repos',
      }
    });

    try {
      const res = await auth();

      console.log(res);
      
      if (res.token) {
        conf.set('github.token', res.token);
        return res.token;
      }
    } catch (error) {
      throw new Error('Github token was not found in the response');
    } finally {
      status.stop();
    }
  },
  githubAuth: (token) => {
    octokit = new Octokit({
      auth: token
    });
  },
};
