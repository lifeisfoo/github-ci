# github-ci

`github-ci` is an opinionated continuous integration app (CI) for Github organizations. 

It tries to follow the [KISS principle](https://en.wikipedia.org/wiki/KISS_principle) and the [convention over configuration](https://en.wikipedia.org/wiki/Convention_over_configuration) paradigm.

It's a self hosted application to build, test and publish your projects using Dockerfiles and docker-compose files.

It's main purpose is to publish Docker images to a registry, but it can be used to build and publish anything you want. 

## Installation

> Tested with ubuntu 16.04 && 18.04

    curl -o- https://raw.githubusercontent.com/lifeisfoo/github-ci/master/install.sh

### Post installation

- **REQUIRED** create a Github personal access token
- **REQUIRED** add a configuration file `.env` inside the app dir, see `examples/example.env`
- **REQUIRED** setup NGINX to serve build logs, see `examples/logs-web-server-nginx.conf`
- **REQUIRED** run the app using `pm2 start index.js`
- **RECCOMENDED** add a Digital Ocean Firewall to allow webhook requests only from [Github IPs](https://help.github.com/articles/about-github-s-ip-addresses/)
- start making p


## TODO

- [ ] Explain scope of the project and its limits
- [ ] Better installation documentation
- [ ] Explain conventions
- [ ] Explain how to use pm2 for logs and restart
- [ ] Add a complete example of a project
- [ ] Add a non-Docker project example (e.g. a npm library)

## Internals

### Jobs queue

The jobs queue is provided by [Bull](https://github.com/OptimalBits/bull) using [Redis](https://redis.io/). A job object in the queue has the following structure:

```
{
  "id": "2",
  "name": "__default__",
  "data": {
    "github": {
      "access_token": "562e77axxx",
      "full_repo_name": "another-user/test-ci",
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
    "out_dir": "/Users/alessandro/Dev/github-ci/builds/lifeisfoo/test-ci/PR-2-another-user_test-ci:fix-from-FORK:690c7c9f792915a84692be2c58e146adddf14b4b"
  }
}
```

### Repositories clone + checkout

The PR branch is fully cloned (without --depth 1) because we need to checkout a specific commit.
Why? Because the PR event can be delivered delayed or because the queue delay.
In this case the branch HEAD could be different from the event commit sha.

### Common errors

#### Redis errors

    message: 'MISCONF Redis is configured to save RDB snapshots, but is currently not able to persist on disk. Commands that may modify the data set are disabled. Please check Redis logs for details about the error.', 

> config set stop-writes-on-bgsave-error no

https://stackoverflow.com/a/21484282/3340702

#### Build queue is stuck

    redis-cli

look for a `bull:builds:ID:lock` key

then

    DEL bull:builds:904:lock

---

## Contributing

You can open issues for bugs you've found or features you think are missing. You can also submit pull requests to this repository.

## License

Copyright (C) 2018 Alessandro Miliucci & other github-ci contributors (see AUTHORS.md)

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.

---