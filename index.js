const express = require('express');
const bodyParser = require('body-parser');
const fse = require('fs-extra');
const github = require('octonode');
const Queue = require('bull');

require('dotenv').config();

const GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

const DOCKER_USER = process.env.DOCKER_USER;
const DOCKER_PASS = process.env.DOCKER_PASS;
const DOCKER_REGISTRY = process.env.DOCKER_REGISTRY || 'registry.hub.docker.com';

const BUILDS_DIR = process.env.BUILDS_DIR || './builds';

const ACTIVE_REPOS = process.env.ACTIVE_REPOS.split(',');
const REPOS_IMAGES_MAP = process.env.REPOS_IMAGES_MAP.split(',').reduce((acc, cur) => {
    const repo_image = cur.split(' ');
    acc[repo_image[0]] = repo_image[1];
    return acc;
}, {});

console.log('Active repositories are', JSON.stringify(ACTIVE_REPOS));
console.log('Active repositories/images mapping are', JSON.stringify(REPOS_IMAGES_MAP));
console.log('Using', BUILDS_DIR, 'as builds dir');

fse.ensureDir(BUILDS_DIR)
    .then(() => {
        console.log('Builds dir created!')
    })
    .catch(err => {
        console.error(err)
    });

const client = github.client(GITHUB_ACCESS_TOKEN);//ACCESS as a user

const builds_queue = new Queue('builds', {redis: {port: 6379, host: '127.0.0.1'}});
builds_queue.process(1, __dirname+'/lib/docker-processor.js');
builds_queue.on('completed', function(job, result){
    // Job completed with output result!
    console.log('Completed job', JSON.stringify(job), 'with result', JSON.stringify(result));
    const ghrepo = client.repo(job.data.github.base_repo_full_name);
    ghrepo.status(job.data.github.commit_sha, {
      "state": "success",
      "target_url": "http://ci.mycompany.com/job/hub/3",
      "description": "Build completed, merge!"
    },(err, data, headers) => {console.log('PR state set to success');});
});

builds_queue.on('failed', function(job, err){
    // A job failed with reason `err`!
    console.log('Job failed, err:', JSON.stringify(err), 'Job:', JSON.stringify(job));
    const ghrepo = client.repo(job.data.github.base_repo_full_name);
    if (err.is_build_error) {
        ghrepo.status(job.data.github.commit_sha, {
          "state": "error",
          "target_url": "http://ci.mycompany.com/job/hub/3",
          "description": "Build error, fix it and retry!"
        },(err, data, headers) => {console.log('PR state set to error');});
    } else {
        ghrepo.status(job.data.github.commit_sha, {
          "state": "failed",
          "target_url": "http://ci.mycompany.com/job/hub/3",
          "description": "Build failed, a CI internal error status!"
        },(err, data, headers) => {console.log('PR state set to failed');});
    }
});

const app = express();
app.use(bodyParser.json());

app.post('/events-handler', (req, res) => {
    if (req.headers['x-github-event'] === 'push') {
        const push = req.body;
        const last_commit_sha = push.head_commit.id;
        const repo_full_name = push.repository.full_name;
        const mapped_image_name = REPOS_IMAGES_MAP[repo_full_name] ?
            REPOS_IMAGES_MAP[repo_full_name] : base_repo_full_name; // by convention

        console.log('Info about a Push:');
        console.log('Repo is ', repo_full_name);
        console.log('Latest commit is ', last_commit_sha);
        console.log('Image name is', mapped_image_name);

        console.log('Skipping build, not implemented yet');
        res.status(200).end();

    } else if (req.headers['x-github-event'] === 'release') {
        const release = req.body;
        const tag_released = release.release.tag_name;
        const repo_full_name = release.repository.full_name;
        const mapped_image_name = REPOS_IMAGES_MAP[repo_full_name] ?
            REPOS_IMAGES_MAP[repo_full_name] : base_repo_full_name; // by convention

        console.log('Info about a Release:');
        console.log('Repo is ', repo_full_name);
        console.log('Tag released is ', tag_released);
        console.log('Image name is', mapped_image_name);

        console.log('Skipping build, not implemented yet');
        res.status(200).end();

    } else if (req.headers['x-github-event'] === 'pull_request') {
        // use this only for repo active check
        const repo = req.body.repository.full_name;

        if (ACTIVE_REPOS.indexOf(repo) === -1) {
            console.log(repo, 'not active for CI');
            return res.status(200).end();
        }

        console.log('Info about a Pull Request:');
        const pr = req.body.pull_request;
        const last_commit_sha = pr.head.sha;
        const base_repo_full_name = pr.base.repo.full_name;
        const source_repo_full_name = pr.head.repo.full_name;
        const source_repo_branch_name = pr.head.ref;
        const pr_number = pr.number;
        const mapped_image_name = REPOS_IMAGES_MAP[base_repo_full_name] ?
            REPOS_IMAGES_MAP[base_repo_full_name] : base_repo_full_name; // by convention

        console.log('Main repo is ', base_repo_full_name);
        console.log('Source repo is ', source_repo_full_name);
        console.log('Source branch is ', source_repo_branch_name);
        console.log('Latest commit is ', last_commit_sha);
        console.log('PR number is ', pr_number);
        console.log('Image name is', mapped_image_name);

        const out_dir = `${__dirname}/builds/${base_repo_full_name}:${source_repo_full_name}:${source_repo_branch_name}:${last_commit_sha}`;
        const builds_dir = `${__dirname}/builds`;
        const pr_commit_dir = `PR-${pr_number}-${source_repo_full_name}:${source_repo_branch_name}:${last_commit_sha}`.replace('/', '_');
        const pr_checkout_dir = `${builds_dir}/${base_repo_full_name}/${pr_commit_dir}`;

        const github_conf = {
            access_token: GITHUB_ACCESS_TOKEN,
            full_repo_name: source_repo_full_name,
            branch_name: source_repo_branch_name,
            commit_sha: last_commit_sha,
            base_repo_full_name: base_repo_full_name
        };
        const docker_conf = {
            registry: DOCKER_REGISTRY,
            user: DOCKER_USER,
            pass: DOCKER_PASS,
            image_name: mapped_image_name,
            image_tag: `PR-${pr_number}`
        };
        
        const ghrepo = client.repo(base_repo_full_name);
        ghrepo.status(last_commit_sha, {
          "state": "pending",
          "target_url": "http://ci.mycompany.com/job/hub/3",
          "description": "Build is running, please be patient."
        }, (err, data, headers) => {
            builds_queue.add({
                github: github_conf,
                docker: docker_conf,
                out_dir: pr_checkout_dir
            });
        });

    } else if (req.headers['x-github-event'] === 'status') {
        console.log('Received a status:');
        console.log('Repository is ', req.body.name);
        console.log('State is ', req.body.state);
        console.log('Description is ', req.body.description);
        console.log('Commit is ', req.body.sha);
        console.log('Target url is ', req.body.target_url);
        res.status(200).end();
    } else {
        console.log(req.headers);
        console.log(req.query);
        console.log(req.params);
        console.log(req.body);
        res.status(200).end();
    }
    console.log('\n\n\n');
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));