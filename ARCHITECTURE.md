# Architecture

## Jobs queue

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

## Repositories clone + checkout

The PR branch is fully cloned (without --depth 1) because we need to checkout a specific commit.
Why? Because the PR event can be delivered delayed or because the queue delay.
In this case the branch HEAD could be different from the event commit sha.
