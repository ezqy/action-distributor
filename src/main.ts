import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import * as fetch from "node-fetch";
import { Octokit } from "@octokit/rest";

interface JsonFile {
  [key: string]: Organization;
}
interface Organization {
  [key: string]: Repository;
}
interface Repository {
  workflows: string[];
  actions: string[];
}

interface TreeItem {
  path?: string | undefined;
  mode?: "100644" | "100755" | "040000" | "160000" | "120000" | undefined;
  type?: "blob" | "commit" | "tree" | undefined;
  sha?: string | null | undefined;
  content?: string | undefined;
}

export async function run() {
  try{
    const owner = core.getInput('owner');
    const repo = core.getInput('repo');
    const commitMessage = core.getInput('commit-message');
    const token = process.env.GH_TOKEN || '';
    const config = core.getInput('config')
    const configPath = path.join(process.cwd(), config);
    const parentBranch = 'main'
    const childBranch = core.getInput('branchName') || `feature/action-distributor`;
    const childBranchWithDate = `${childBranch}-${Date.now()}`;

    const octokit = new Octokit({
      auth: token,
      log: console,
      request: {
        fetch: fetch,
      }
    });

    const json: JsonFile = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    core.debug(`config: ${JSON.stringify(json)}`)


    const org: Organization = json[owner as keyof JsonFile] as Organization;
    const target: Repository = org[repo as keyof Organization] as Repository;

    core.info(`json: ${JSON.stringify(target)}`)

    const workflows: string[] = target.workflows || []
    const actions: string[] = target.actions || []

    const treeItems:TreeItem[] = []

    core.info('add workflows')
    if(workflows.length > 0){
      await Promise.all(workflows.map(async workflow => {
        const fromPath = path.join(process.cwd(),'.github', 'workflows', workflow);
        if(fs.existsSync(fromPath)){
          const content = fs.readFileSync(fromPath, 'utf8');
          const toPath = `.github/workflows/${workflow}`;
          treeItems.push({
            path: toPath,
            content,
            mode: '100644',
            type: 'blob',
          })
          core.debug(`workflow: ${workflow}`)
        }else{
          core.warning(`workflow: ${workflow} is not found`)
        }
      }))
    }

    core.info('add actions')
    if(actions.length > 0){
      await Promise.all(actions.map(async action => {
        const fromPath = path.join(process.cwd(),'.github', 'actions', action);
        if(fs.existsSync(fromPath)){
          const files: string[] = fs.readdirSync(fromPath, 'utf8');
          files.forEach(file => {
            const filePath = path.join(fromPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const toPath = `.github/actions/${action}/${file}`;
            treeItems.push({
              path: toPath,
              content,
              mode: '100644',
              type: 'blob',
            })
            core.debug(`action: ${toPath}`)
          })
        }else{
          core.warning(`action: ${action} is not found`)
        }
      }))
    }

    core.info('getRef')
    const baseTree = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${parentBranch}`,
    })

    core.info('createRef')
    const newBranchRef = await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${childBranchWithDate}`,
      sha: baseTree.data.object.sha,
    })

    core.info('getCommit')
    const currentCommit = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: newBranchRef.data.object.sha,
    })

    core.info('createTree')
    const tree = await octokit.git.createTree({
      owner,
      repo,
      base_tree: currentCommit.data.tree.sha,
      tree: treeItems,
    })

    core.info('createCommit')
    const commit = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: tree.data.sha,
      parents: [currentCommit.data.sha],
    })

    const compare = await octokit.repos.compareCommits({
      owner,
      repo,
      base: currentCommit.data.sha,
      head: commit.data.sha,
    }) 

    const diff: any = compare.data.files || []

    if(diff.length !== 0){
      core.info('ListBranches')
      const branches = await octokit.rest.repos.listBranches({ 
        owner,
        repo,
      })

      const matchingBranches = branches.data.filter((b) => 
        b.name.startsWith(childBranch)
      ) || []

      await Promise.all(matchingBranches.map(async branch => {
        if(branch.name !== childBranchWithDate){
          await octokit.rest.git.deleteRef({
            owner,
            repo,
            ref: `heads/${branch.name}`,
          });
          core.info(`deleteBranches ${branch.name}`) 
        }
      }))

      core.info('updateRef')
      const response = await octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${childBranchWithDate}`,
        sha: commit.data.sha,
      });
      core.setOutput('url', response.data.url);
      
      core.info('createPullRequest')
      const pullRequest = await octokit.pulls.create({
        owner,
        repo,
        title: commitMessage,
        head: childBranchWithDate,
        base: parentBranch,
      })
      core.info(`Pull Request created successfully: ${pullRequest.data.html_url}`);

    }else{
      core.info('no change')
      core.info(`deleteRef ${childBranchWithDate}`)
      await octokit.git.deleteRef({
        owner,
        repo,
        ref: `heads/${childBranchWithDate}`,
      });
      core.setOutput('url', '');
    }
    

  }catch(error: any){
    core.setFailed(error);
  }
}
