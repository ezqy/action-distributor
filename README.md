# action-distributor
Distribute specific github actions to another organization's repository

## Local Test
```
cat <<EOF > .env.local
repo='{repo}'
GH_TOKEN='{GH_TOKEN}'
EOF

vi .action-distributor/config.json

npm install
npm run test

```

## Permissions
```
contents
workflows
pull_requests
```

## Settings
Read and write permission