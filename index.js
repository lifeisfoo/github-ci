const express = require('express');
const bodyParser = require('body-parser');
const fse = require('fs-extra');
const github = require('octonode');
const commands = require('./lib/commands');

const GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

const DOCKER_USER = process.env.DOCKER_USER;
const DOCKER_PASS = process.env.DOCKER_PASS;
const DOCKER_REGISTRY = process.env.DOCKER_REGISTRY || 'registry.hub.docker.com';

const BUILDS_DIR = process.env.BUILDS_DIR || './builds';


console.log('Using', BUILDS_DIR, 'as builds dir');

fse.ensureDir(BUILDS_DIR)
    .then(() => {
        console.log('success!')
    })
    .catch(err => {
        console.error(err)
    });

const client = github.client(GITHUB_ACCESS_TOKEN);
const ghrepo = client.repo('lifeisfoo/test-ci');
const ghpr = client.pr('lifeisfoo/test-ci', 1);

const app = express();
app.use(bodyParser.json());

app.post('/events-handler', (req, res) => {
    if (req.headers['x-github-event'] === 'pull_request') {
        console.log('Info about a Pull Request:');
        const pr = req.body.pull_request;
        const last_commit_sha = pr.head.sha;
        const main_repo_full_name = pr.base.repo.full_name;
        const source_repo_full_name = pr.head.repo.full_name;
        const source_repo_branch_name = pr.head.ref;
        const pr_number = pr.number;
        console.log('Main repo is ', main_repo_full_name);
        console.log('Source repo is ', source_repo_full_name);
        console.log('Source branch is ', source_repo_branch_name);
        console.log('Latest commit is ', last_commit_sha);
        console.log('PR number is ', pr_number);

        // TODO: checkout the PR code using a queue and listen for response

        // CLONE + CHECKOUT
        // The clone is of the full branch (without --depth 1) because we need
        // to checkout a specific commit. Why? Because the PR event can be delivered delayed
        // or because the queue delay. In this case the branch HEAD could be different from
        // the event commit sha

        // TODO: the build job will checkout
        // and execute docker on a remote host/VM to build
        // code is given from here (no github credential passing)

// State be one of error, failure, pending, or success:
//    marked has failed because the job failed to complete
//    marked as error because the job did complete, but exited with a non-zero status
//    marked as success because the job did complete, and exited with a zero status

        const out_dir = `${__dirname}/builds/${main_repo_full_name}:${source_repo_full_name}:${source_repo_branch_name}:${last_commit_sha}`;
        const builds_dir = `${__dirname}/builds`;
        const pr_commit_dir = `PR-${pr_number}-${source_repo_full_name}:${source_repo_branch_name}:${last_commit_sha}`.replace('/', '_');
        const pr_checkout_dir = `${builds_dir}/${main_repo_full_name}/${pr_commit_dir}`;
        ghrepo.status(last_commit_sha, {
          "state": "pending",
          "target_url": "http://ci.mycompany.com/job/hub/3",
          "description": "Build is running, please be patient."
        }, (err, data, headers) => {
            //console.log('PR status set to pending');
            const github_conf = {
                access_token: GITHUB_ACCESS_TOKEN,
                full_repo_name: source_repo_full_name,
                branch_name: source_repo_branch_name,
                commit_sha: last_commit_sha
            };
            const docker_conf = {
                registry: DOCKER_REGISTRY,
                user: DOCKER_USER,
                pass: DOCKER_PASS,
                image_name: main_repo_full_name, // by convention
                image_tag: `PR-${pr_number}`
            };

            console.log('Cloning the repository...');
            const clone_build_test_cmd = commands.clone_build_test(github_conf, docker_conf, pr_checkout_dir); 
                /*GITHUB_ACCESS_TOKEN,
                source_repo_full_name,
                source_repo_branch_name,
                last_commit_sha,
                pr_checkout_dir);*/
            clone_build_test_cmd.on('close', (exit_code) => {
                console.log(`git clone, build and test exited with code ${exit_code}`);
                if (exit_code === 0) {
                    ghrepo.status(last_commit_sha, {
                      "state": "success",
                      "target_url": "http://ci.mycompany.com/job/hub/3",
                      "description": "Build completed, merge!"
                    },(err, data, headers) => {console.log('PR state set to success');});
                } else {
                    ghrepo.status(last_commit_sha, {
                      "state": "error",
                      "target_url": "http://ci.mycompany.com/job/hub/3",
                      "description": "Build error, fix it and retry!"
                    },(err, data, headers) => {console.log('PR state set to error');});
                }
            });
            clone_build_test_cmd.on('error', (err) => {
                console.log(err);
                ghrepo.status(last_commit_sha, {
                      "state": "failed",
                      "target_url": "http://ci.mycompany.com/job/hub/3",
                      "description": "Build failed, a CI internal error status!"
                    },(err, data, headers) => {console.log('PR state set to failed');});
            })
            //setTimeout(() => {
                
            //}, 10000)
        }); // created status

    } else if (req.headers['x-github-event'] === 'status') {
        console.log('Received a status:');
        console.log('Repository is ', req.body.name);
        console.log('State is ', req.body.state);
        console.log('Description is ', req.body.description);
        console.log('Commit is ', req.body.sha);
        console.log('Target url is ', req.body.target_url);
    } else {
        console.log(req.headers);
        console.log(req.query);
        console.log(req.params);
        console.log(req.body);
    }
    console.log('\n\n\n');
    //ghpr.info((err, data, headers) => {
    //    console.log('PR GET NOW\n');
    //      console.log("error: " + err);
    //      console.log("data: " + JSON.stringify(data));
    //      console.log("headers:" + JSON.stringify(headers));
    //    console.log('\n\n\n');
    //});
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));