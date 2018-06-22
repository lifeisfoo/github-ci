
## Manual install

ubuntu 16.04:

```
apt-get install redis-server
apt-get install aha
systemctl status redis
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
apt-get install nodejs
git clone https://github.com/lifeisfoo/github-ci.git
cd gituhub-ci
npm install
npm install pm2 -g
vim .env
pm2 start index.js
ufw allow 3000
pm2 logs
pm2 reload all #dopo update
```

install docker
https://docs.docker.com/install/linux/docker-ce/ubuntu/#install-using-the-repository

install compose
https://docs.docker.com/compose/install/#prerequisites

```
sudo curl -L https://github.com/docker/compose/releases/download/1.19.0/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose
```

https://help.github.com/articles/about-github-s-ip-addresses/
https://api.github.com/meta

## NGINX conf

```
server {
        listen 80 default_server;
        listen [::]:80 default_server;

        root /var/www/builds-logs;
        index index.html index.htm index.nginx-debian.html;

        server_name _;

        location / {
          autoindex off;

          # automatically serve html version (with colors) if available
          try_files $uri.html $uri =404;

          # http://nginx.org/en/docs/http/ngx_http_core_module.html#types          
          ## REQUIRED to force mimetype, only if logfiles extension is unknow (eg. .log)
          #types { }
          #default_type text/plain;
        }
}
```

## TODO

 - [ ] WIP checkout the PR code using a queue and listen for response

        // TODO: the build job will checkout
        // and execute docker on a remote host/VM to build
        // code is given from here (no github credential passing)

// State be one of error, failure, pending, or success:
//    marked has failed because the job failed to complete
//    marked as error because the job did complete, but exited with a non-zero status
//    marked as success because the job did complete, and exited with a zero status

## Internals

### Job queue

The job queue is provided by Bull using Redis. A job object in the queue has this structure:

```
{
  "id": "2",
  "name": "__default__",
  "data": {
    "github": {
      "access_token": "562e77axxx",
      "full_repo_name": "Variazioni/test-ci",
      "branch_name": "fix-from-FORK",
      "commit_sha": "690c7c9f792915a84692be2c58e146adddf14b4b",
      "main_repo_full_name": "lifeisfoo/test-ci"
    },
    "docker": {
      "registry": "registry.hub.docker.com",
      "user": "lifeisfoo",
      "pass": "password",
      "image_name": "lifeisfoo/test-ci",
      "image_tag": "PR-2"
    },
    "out_dir": "/Users/alessandro/Dev/github-ci/builds/lifeisfoo/test-ci/PR-2-Variazioni_test-ci:fix-from-FORK:690c7c9f792915a84692be2c58e146adddf14b4b"
  }
}
```

### Repositories clone + checkout

The PR branch is fully cloned (without --depth 1) because we need to checkout a specific commit.
Why? Because the PR event can be delivered delayed or because the queue delay.
In this case the branch HEAD could be different from the event commit sha.