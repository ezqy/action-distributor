# action-distributor
Distribute specific github actions to another organization's repository

## Local Test
```
cat <<EOF > .env.local
owmer='{owner}'
repo='{repo}'
GH_TOKEN='{GH_TOKEN}'
config='.github/action-distributor.config.json'
EOF

vi .github/action-distributor.config.json

npm install
npm run test

```