import * as core from '@actions/core';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Octokit } = require("@octokit/rest");

const tmp_dir = path.join(process.cwd(), 'tmp')

export async function run() {
  try{
    const repo = core.getInput('repo');
    const owner = core.getInput('owner');
    const path = core.getInput('path');
    const token = process.env['GH_TOKEN']

    //login to github
    const octokit = new Octokit();

    fs.mkdirSync(tmp_dir);

    await execSync(`git clone https://${token}@github.com/${owner}/${repo}.git ${tmp_dir}`)
    
    core.setOutput('result', 'success');
  }catch(error: any){
    core.setFailed(error.message);
  }
}
