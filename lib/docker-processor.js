const commands = require('./commands');
const fs = require('fs');

function log_build_duration(log_file, start_date) {
    const log_stream = fs.createWriteStream(log_file, {flags: 'a'}); //append

    const end_date = new Date();
    const build_duration_mills = Math.abs(end_date.getTime() - start_date.getTime());
    const build_duration_secs = Math.ceil(build_duration_mills / 1000);
    
    log_stream.write(`Build ended in ${build_duration_secs} seconds\n`);
}

function convert_log_to_html(log_file) {
    const convert = commands.convert_log_to_html(log_file, `${log_file}.html`);
    convert.on('error', (err) => {
        console.log('Convert error', err);
    });
    convert.on('close', (exit_code) => {
        console.log('Convert close with exit code', exit_code);
    });
};

module.exports = function(job, done){
    const log_stream = fs.createWriteStream(job.data.log_file, {flags: 'w'});
    log_stream.on('close', () => {
        console.log('Log stream closed');
        convert_log_to_html(job.data.log_file);//non blocking
    });
    const clone_and_build = commands.clone_build(job.data.github, job.data.docker, job.data.build_dir); 

    const start_date = new Date();
    log_stream.write(`Build started at ${start_date}!\n`);

    clone_and_build.stdout.pipe(log_stream);
    clone_and_build.stderr.pipe(log_stream);

    clone_and_build.on('close', (exit_code) => {
        if (exit_code !== 0) {
            const build_err = new Error('Build exited with code '+exit_code);
            build_err.is_build_error = true;
            done(build_err);
        } else if (job.data.skip_test_and_skip_push) {
            log_build_duration(job.data.log_file, start_date);
            console.log(`git clone and build exited with code ${exit_code}`);
            done();
        } else {
            const log_stream_2 = fs.createWriteStream(job.data.log_file, {flags: 'a'});
            log_stream_2.on('close', () => {
                console.log('Log stream 2 closed');
                convert_log_to_html(job.data.log_file);//non blocking
            });
            const test_and_push = commands.test_and_push(job.data.github, job.data.docker, job.data.build_dir);
            test_and_push.stdout.pipe(log_stream_2);
            test_and_push.stderr.pipe(log_stream_2);

            test_and_push.on('close', (exit_code) => {
                log_build_duration(job.data.log_file, start_date);

                console.log(`docker test and push exited with code ${exit_code}`);
                if (exit_code === 0) {
                    done();
                } else {
                    const build_err = new Error('Build exited with code '+exit_code);
                    build_err.is_build_error = true;
                    done(build_err);
                }
            });
        }
    });
    clone_and_build.on('error', (err) => {
        log_build_duration(job.data.log_file, start_date);
        done(err);
    });
}