# action-distributor
Distribute specific github actions to another organization's repository.

## Usage
**Basic:**
```
steps:
- uses: actions/checkout@v3
- uses: ezqy/action-distributor@v1
  with:
    owner: 'owner'
    repo: 'repo'
    config: '.action-distributor/config.json
    commit-message: "Distribute actions from ${{ github.repository }}"
  env:
    GH_TOKEN: ${{ steps.generate_token.outputs.token }}
```

If you use Github Apps, see [test.yml](./github/workflows/test.yml)

## Install
### Create config
A configuration file must be created and specified for this action.

This file must contain information about the repository to distribute to and what do distribute.

**sample:**
```
{
  "{org}": {
    "{repository}": {
      "workflows": ["sample.yml", "sample2.yml"], # under .github/workflows
      "actions": ["sample-action", "sample-action2"] # under .github/actions
    }
  }
}

```

### Permissions
The repository implementing this action must have the following permissions to the distribution repository.
```
actions
contents
workflows
pull_requests
```
