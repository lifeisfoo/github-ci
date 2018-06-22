const { spawn, exec } = require('child_process');
const fs = require('fs');

const clone_build_test = (github_conf, docker_conf, build_dir) => {
    return spawn('sh', ['clone_build_test.sh'], {
        //stdio: [ 'inherit', log_stream, log_stream ],
        cwd: __dirname,
        env: {
            BRANCH: github_conf.branch,
            GITHUB_ACCESS_TOKEN: github_conf.access_token,
            REPO: github_conf.pr_repo ? github_conf.pr_repo : github_conf.repo,
            BUILD_DIR: build_dir,
            COMMIT: github_conf.commit,
            DOCKER_REGISTRY: docker_conf.registry,
            IMAGE_NAME: docker_conf.image_name,
            IMAGE_TAG: docker_conf.image_tag,
            DOCKER_USER: docker_conf.user,
            DOCKER_PASS: docker_conf.pass,
            DOCKER_BUILD_ARGS: docker_conf.build_args
    }});
};

const convert_log_to_html = (log_file, log_file_html) => {
    exec(`cat ${log_file} | aha `, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        fs.writeFile(log_file_html, stdout, function(err) {
            if(err) {
                return console.log(err);
            }
            console.log('Html file saved');
        });
    });
};

exports.clone_build_test = clone_build_test;
exports.convert_log_to_html = convert_log_to_html;