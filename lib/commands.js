const { spawn } = require('child_process');


const docker_compose_test = (working_dir) => {
    return spawn('docker-compose', [
        '-f', 'docker-compose.test.yml',
        'up',
        '--build',
        '--force-recreate',
        '--abort-on-container-exit',
        '--exit-code-from', 'sut'
        ], { stdio: 'inherit' });
};

// alternative to stdio:inherit
//ls.stdout.on('data', (data) => {
//  console.log(`${data}`);
//});
//ls.stderr.on('data', (data) => {
//  console.error(`${data}`);
//});

const git_clone = (access_token, full_repo_name, branch_name, out_dir) => {
    return spawn('git', [
        'clone',
        '-b', branch_name,
        '--single-branch',
        '--depth', '1',
        `https://${access_token}@github.com/${full_repo_name}.git`,
        out_dir
        ], { stdio: 'inherit' });
};

// access_token, full_repo_name, branch_name, commit, out_dir, docker_creds
const clone_build_test = (github_conf, docker_conf, out_dir) => {
    return spawn('sh', ['clone_build_test.sh'], {
        stdio: 'inherit',
        cwd: __dirname,
        env: {
            BRANCH_NAME: github_conf.branch_name,
            GITHUB_ACCESS_TOKEN: github_conf.access_token,
            REPO_FULL_NAME: github_conf.full_repo_name,
            OUT_DIR: out_dir,
            COMMIT: github_conf.commit_sha,
            REGISTRY_ADDRESS: docker_conf.registry_address,
            IMAGE_NAME: docker_conf.image_name,
            IMAGE_TAG: docker_conf.image_tag,
            DOCKER_USER: docker_conf.registry_user,
            DOCKER_PASS: docker_conf.registry_pass
    }});
}

exports.docker_compose_test = docker_compose_test;
exports.git_clone = git_clone;
exports.clone_build_test = clone_build_test;