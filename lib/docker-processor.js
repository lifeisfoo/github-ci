const commands = require('./commands');


module.exports = function(job, done){
    console.log('Job is', JSON.stringify(job));

    const clone_build_test_cmd = commands.clone_build_test(job.data.github, job.data.docker, job.data.build_dir); 

    clone_build_test_cmd.on('close', (exit_code) => {
        console.log(`git clone, build and test exited with code ${exit_code}`);
        if (exit_code === 0) {
            done();
        } else {
            const build_err = new Error('Build exited with code '+exit_code);
            build_err.is_build_error = true;
            done(build_err);
        }
    });
    clone_build_test_cmd.on('error', (err) => {
        done(err);
    });
}