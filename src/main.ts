import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Octokit } from "@octokit/rest";

const tmp_dir = path.join(process.cwd(), 'tmp')

interface Repository {
  org: string;
  repo: string;
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
    const repo = core.getInput('repo');
    const owner = repo.split('/')[0];
    const name = repo.split('/')[1];
    const token = process.env.GH_TOKEN || '';
    const config = core.getInput('config')
    const configPath = path.join(process.cwd(), config);
    const parentBranch = 'main'
    const childBranch = `feature/action-distributor-${Date.now()}`;

    const octokit = new Octokit({
      auth: token,
      log: console
    });

    const json: Repository[] = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    core.debug(`config: ${JSON.stringify(json)}`)

    const target: Repository = json.find(c => c.repo === repo) as Repository;
    core.debug(target.repo)

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
      owner: owner,
      repo: name,
      ref: `heads/${parentBranch}`,
    })

    core.info('createRef')
    const newBranchRef = await octokit.git.createRef({
      owner: owner,
      repo: name,
      ref: `refs/heads/${childBranch}`,
      sha: baseTree.data.object.sha,
    })

    core.info('getCommit')
    const currentCommit = await octokit.git.getCommit({
      owner: owner,
      repo: name,
      commit_sha: newBranchRef.data.object.sha,
    })

    core.info('createTree')
    const tree = await octokit.git.createTree({
      owner: owner,
      repo: name,
      base_tree: currentCommit.data.tree.sha,
      tree: treeItems,
    })

    core.info('createCommit')
    const commit = await octokit.git.createCommit({
      owner: owner,
      repo: name,
      message: 'sync workflows',
      tree: tree.data.sha,
      parents: [currentCommit.data.sha],
    })

    const compare = await octokit.repos.compareCommits({
      owner: owner,
      repo: name,
      base: currentCommit.data.sha,
      head: commit.data.sha,
    }) 

    const diff: any = compare.data.files || []

    if(diff.length !== 0){
      core.info('updateRef')
      const response = await octokit.git.updateRef({
        owner: owner,
        repo: name,
        ref: `heads/${childBranch}`,
        sha: commit.data.sha,
      });
      core.setOutput('url', response.data.url);

      core.info('createPullRequest')
      const pullRequest = await octokit.pulls.create({
        owner: owner,
        repo: name,
        title: 'sync workflows',
        head: childBranch,
        base: parentBranch,
      })
      core.info(`Pull Request created successfully: ${pullRequest.data.html_url}`);

    }else{
      core.info('no change')
      core.info(`deleteRef ${childBranch}`)
      await octokit.git.deleteRef({
        owner: owner,
        repo: name,
        ref: `heads/${childBranch}`,
      });
      core.setOutput('url', '');
    }
    

  }catch(error: any){
    core.setFailed(error);
  }
}
