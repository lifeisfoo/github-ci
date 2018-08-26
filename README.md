# github-ci

`github-ci` is a Docker-based continuous integration and continuous delivery application for Github organizations.

It tries to follow the [KISS principle](https://en.wikipedia.org/wiki/KISS_principle) and the [convention over configuration](https://en.wikipedia.org/wiki/Convention_over_configuration) paradigm.

Read more about it in [this introductory post](https://miliucci.org/p/introducting-github-ci.html).

## Installation

Clone this repository on your server, then create a `docker-compose.yml` file inside the directory:

```
version: "3"

services:
  github-ci:
    build: .
    ports:
      - "3000:80"
    volumes:
      - ./logs:/logs
      - ./builds:/builds
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - GITHUB_ACCESS_TOKEN=<your-github-org-access-token>
      - DOCKER_REGISTRY=<registry.hub.docker.com or your-registry.example>
      - DOCKER_USER=<your docker registry user>
      - DOCKER_PASS=<your docker registry user>
      - DEFAULT_GITHUB_ORG=<your github org name>
      - DEFAULT_DOCKER_REGISTRY_ORG=<your docker registry org/scope name>
      - ACTIVE_REPOS=<comma separated list of github repository names>
      - BUILD_LOGS_BASE_URL=<http://the-host-that-will-serve-your-logs>
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
  redis:
    image: redis:4
    volumes:
      - ./redis-data:/data
```

Now follow the below checklist to setup the environment and then run the app with `docker-compose up --detach`.

### Setup checklist

- [ ] create a Github [personal access token](https://github.com/settings/tokens) with access limited to the `repo` scope.
- [ ] creare a Github org webhook at `https://github.com/organizations/<your-org>/settings/hooks` that sends events to `http://your-host:3000/events-handler` with content-type `application/json` and selected events: branch or tag creation, pull requests, pushes, releases, statuses
- [ ] run `ufw allow 3000` to open the port on the host firewall
- [ ] setup NGINX to serve build logs, see `examples/logs-web-server-nginx.conf`
- [ ] add a firewall (e.g. Digital Ocean Firewall) to allow webhook requests only from [Github IPs](https://help.github.com/articles/about-github-s-ip-addresses/)


## Env vars

### Required

- GITHUB_ACCESS_TOKEN
- DOCKER_REGISTRY
- DOCKER_USER
- DOCKER_PASS
- DEFAULT_GITHUB_ORG
- DEFAULT_DOCKER_REGISTRY_ORG
- ACTIVE_REPOS
- BUILD_LOGS_BASE_URL
- REDIS_URL

### Optional

- PORT (default to `80`)
- BUILDS_DIR (default to `/builds`)
- LOGS_DIR (default to `/logs`)
- REPOS_SKIP_TEST_AND_SKIP_PUSH
- REPOS_IMAGES_MAP
- DOCKER_BUILD_ARGS

---

## Contributing

You can open issues for bugs you've found or features you think are missing. You can also submit pull requests to this repository.

## License

Copyright (C) 2018 Alessandro Miliucci & other github-ci contributors (see AUTHORS.md)

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.

---