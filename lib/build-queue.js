const Queue = require('bull');
const github = require('octonode');
const fse = require('fs-extra');

const GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const BUILDS_DIR = process.env.BUILDS_DIR || '/builds';
const LOGS_DIR = process.env.LOGS_DIR || '/logs';
const BUILD_LOGS_BASE_URL = process.env.BUILD_LOGS_BASE_URL || LOGS_DIR;

const DOCKER_USER = process.env.DOCKER_USER;
const DOCKER_PASS = process.env.DOCKER_PASS;
const DOCKER_REGISTRY = process.env.DOCKER_REGISTRY || 'registry.hub.docker.com';

const DEFAULT_DOCKER_REGISTRY_ORG = process.env.DEFAULT_DOCKER_REGISTRY_ORG || '';

const DOCKER_BUILD_ARGS = process.env.DOCKER_BUILD_ARGS ? process.env.DOCKER_BUILD_ARGS.split(',').reduce((acc, cur) => {
    const arg_and_val = cur.split(' ');
    acc +=  ` --build-arg ${arg_and_val[0]}=${arg_and_val[1]} `
    return acc;
}, '') : '';

const REPOS_IMAGES_MAP = process.env.REPOS_IMAGES_MAP ? process.env.REPOS_IMAGES_MAP.split(',').reduce((acc, cur) => {
    const repo_image = cur.split(' ');
    acc[repo_image[0]] = repo_image[1];
    return acc;
}, {}) : {};

const REPOS_SKIP_TEST_AND_SKIP_PUSH = process.env.REPOS_SKIP_TEST_AND_SKIP_PUSH ?
    process.env.REPOS_SKIP_TEST_AND_SKIP_PUSH.split(',') : [];

console.log('Default Docker registry organization is', DEFAULT_DOCKER_REGISTRY_ORG);
console.log('Active repositories/images mapping are', JSON.stringify(REPOS_IMAGES_MAP));
console.log('Skipping tests and push for these repositories', JSON.stringify(REPOS_SKIP_TEST_AND_SKIP_PUSH));
console.log('Using', BUILDS_DIR, 'as builds dir');

fse.ensureDir(BUILDS_DIR)
    .then(() => {
        console.log('Builds dir created!')
    })
    .catch(err => {
        console.error(err)
    });
fse.ensureDir(LOGS_DIR)
    .then(() => {
        console.log('Logs dir created!')
    })
    .catch(err => {
        console.error(err)
    });

const client = github.client(GITHUB_ACCESS_TOKEN);//ACCESS as a user

function get_registry_image_name(repo_name, repo_full_name) {
    const mapped_name = REPOS_IMAGES_MAP[repo_name];
    const alternate_name = `${DEFAULT_DOCKER_REGISTRY_ORG}/${repo_name}`;

    if (mapped_name) {
        return mapped_name;
    } else if (DEFAULT_DOCKER_REGISTRY_ORG) { // if it's defined
        return alternate_name;
    } else { // fallback
        return repo_full_name
    }
}
function skip_test_and_skip_push(repo) {
    return REPOS_SKIP_TEST_AND_SKIP_PUSH.indexOf(repo) !== -1;
}
function get_docker_conf(image_name, image_tag) {
    const docker_build_args = `${DOCKER_BUILD_ARGS} --build-arg CI_IMAGE_TAG=${image_tag} --build-arg CI_IMAGE_NAME=${image_name}`;
    return {
        registry: DOCKER_REGISTRY,
        user: DOCKER_USER,
        pass: DOCKER_PASS,
        image_name: image_name,
        image_tag: image_tag,
        build_args: docker_build_args
    };
}
function get_github_conf(repo_name, branch_name, commit, pr_repo_name) {
    return {
        access_token: GITHUB_ACCESS_TOKEN,
        repo: repo_name,
        branch: branch_name,
        commit: commit,
        pr_repo: pr_repo_name //to checkout if is a pr event, see commands.js
    };
}
function get_build_dir(commit) {
    return `${BUILDS_DIR}/${new Date().getTime()}-${commit}`;
}
function get_log_file_name(commit) {
    return `${new Date().getTime()}-${commit}-log.txt`;
}
function get_log_file_path(log_file_name) {
    return `${LOGS_DIR}/${log_file_name}`;
}
function get_log_file_url(log_file_name) {
    return `${BUILD_LOGS_BASE_URL}/${log_file_name}`;
}
function print_build_info(github_info, docker_info, build_dir, log_file, skip_test_and_skip_push) {
    console.log(`# Main repo is ${github_info.repo}
# PR repo is ${github_info.pr_repo}
# Branch is ${github_info.branch}
# Commit is ${github_info.commit}
# Docker image is ${docker_info.image_name}:${docker_info.image_tag}
# Build dir is ${build_dir}
# Log file is ${log_file}
# Skip test and skip push is ${skip_test_and_skip_push}`);
}
function set_status_pending_and_enqueue(github_conf, docker_conf, skip_test_and_skip_push) {
    const build_dir = get_build_dir(github_conf.commit);
    const log_file_name = get_log_file_name(github_conf.commit);
    const log_file = get_log_file_path(log_file_name);
    const log_url = get_log_file_url(log_file_name);

    print_build_info(github_conf, docker_conf, build_dir, log_file, skip_test_and_skip_push);

    const ghrepo = client.repo(github_conf.repo);
    ghrepo.status(github_conf.commit, {
      "state": "pending",
      "target_url": log_url,
      "description": "Build is running, please be patient.",
      "context": "ci"
    }, (err, data, headers) => {
        builds_queue.add({
            github: github_conf,
            docker: docker_conf,
            build_dir: build_dir,
            log_file: log_file,
            log_url: log_url,
            skip_test_and_skip_push: skip_test_and_skip_push
        });
    });
}

var builds_queue;

module.exports = function BuildQueue(redis_url) {
    builds_queue = new Queue('builds', redis_url);

    builds_queue.process(1, __dirname+'/docker-processor.js');

    builds_queue.on('completed', function(job, result){
        // Job completed with output result!
        //console.log('Completed job', JSON.stringify(job), 'with result', JSON.stringify(result));
        console.log('Job completed without errors');
        const ghrepo = client.repo(job.data.github.repo);
        ghrepo.status(job.data.github.commit, {
          "state": "success",
          "target_url": job.data.log_url,
          "description": "Build completed, merge!",
          "context": "ci"
        },(err, data, headers) => {console.log('PR state set to success');});
    });

    builds_queue.on('failed', function(job, err){
        // A job failed with reason `err`!
        const ghrepo = client.repo(job.data.github.repo);
        if (err.is_build_error) {
            console.log('Job failed with a build error');
            ghrepo.status(job.data.github.commit, {
              "state": "error",
              "target_url": job.data.log_url,
              "description": "Build error, fix it and retry!",
              "context": "ci"
            },(err, data, headers) => {console.log('PR state set to error');});
        } else {
            console.log('Job failed THIS IS A BUG, err:', JSON.stringify(err), 'Job:', JSON.stringify(job));
            ghrepo.status(job.data.github.commit, {
              "state": "failed",
              "target_url": job.data.log_url,
              "description": "Build failed, a CI internal error status!",
              "context": "ci"
            },(err, data, headers) => {console.log('PR state set to failed');});
        }
    });

    return {
        handle_pull_request: function handle_pull_request(req) {
            console.log('Handling Pull Request');

            // extract event info
            const pr = req.body.pull_request;
            const commit = pr.head.sha;
            const base_repo_name = pr.base.repo.full_name;
            const base_repo_name_no_user = pr.base.repo.name;
            const pr_repo_name = pr.head.repo.full_name;
            const pr_repo_branch = pr.head.ref;
            const pr_number = pr.number;
            const mapped_image_name = get_registry_image_name(base_repo_name_no_user, base_repo_name); // by convention

            // generate build info
            const github_conf = get_github_conf(base_repo_name, pr_repo_branch, commit, pr_repo_name);
            const docker_conf = get_docker_conf(mapped_image_name, `PR-${pr_number}`);

            set_status_pending_and_enqueue(github_conf, docker_conf, skip_test_and_skip_push(base_repo_name));
        },
        handle_push: function handle_push(req) {
            console.log('Handling Push', req.body.ref);

            // extract event info
            const push = req.body;
            // build only commits push, not tags
            // https://git-scm.com/book/en/v2/Git-Internals-Git-References
            const ref_type = push.ref.substr(5,5);
            if (ref_type !== 'heads') { //tags build via create event
                console.log('Push', ref_type, 'is not of a head, skip');
                return;
            }
            const commit = push.head_commit.id;
            const repo_name = push.repository.full_name;
            const repo_name_no_user = push.repository.name;

            const branch_name = push.ref.substr(11); // "refs/heads/master" => "master"
            const mapped_image_name = get_registry_image_name(repo_name_no_user, repo_name); // by convention

            // generate build info
            const github_conf = get_github_conf(repo_name, branch_name, commit);
            const docker_conf = get_docker_conf(mapped_image_name, branch_name);

            set_status_pending_and_enqueue(github_conf, docker_conf, skip_test_and_skip_push(repo_name));
        },
        handle_create: function handle_create(req) {
            console.log('Handling Create', req.body.ref_type, req.body.ref);

            // extract event info
            const create = req.body;
            // https://developer.github.com/v3/activity/events/types/#events-api-payload-1
            const ref_type = create.ref_type;
            if (ref_type === 'repository') { //Can be one of "repository", "branch", or "tag"
                console.log('Ref is repository, skip');
                return;
            }

            const commit = create.ref;
            const repo_name = create.repository.full_name;
            const repo_name_no_user = create.repository.name;

            const branch_name = create.ref; //branch name or tag (just created)
            const mapped_image_name = get_registry_image_name(repo_name_no_user, repo_name); // by convention

            // generate build info
            const github_conf = get_github_conf(repo_name, branch_name, commit);
            const docker_conf = get_docker_conf(mapped_image_name, branch_name);

            set_status_pending_and_enqueue(github_conf, docker_conf, skip_test_and_skip_push(repo_name));
        },
        handle_status: function handle_status(req) {
            console.log('Handling Status - TBD');
        }
    };
};