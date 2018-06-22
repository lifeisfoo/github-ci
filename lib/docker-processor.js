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
    const log_stream_html = fs.createWriteStream(`${log_file}.html`, {flags: 'a'}); //append
    const log_convert_cmd = commands.convert_log_to_html(log_file); 
    log_convert_cmd.stdout.pipe(log_stream_html);
    log_convert_cmd.stderr.pipe(log_stream_html);
    log_convert_cmd.on('close', (exit_code) => {
        console.log(`log2html exited with code ${exit_code}`);
    });
    log_convert_cmd.on('error', (err) => {
        console.log(`log2html thrown an error`, err);
    });
}

module.exports = function(job, done){

    const log_stream = fs.createWriteStream(job.data.log_file, {flags: 'w'});
    log_stream.on('close', () => {
        console.log('Log stream closed');
        convert_log_to_html(job.data.log_file);//non blocking
    });
    const clone_build_test_cmd = commands.clone_build_test(job.data.github, job.data.docker, job.data.build_dir); 

    const start_date = new Date();
    log_stream.write(`Build started at ${start_date}!\n`);

    clone_build_test_cmd.stdout.pipe(log_stream);
    clone_build_test_cmd.stderr.pipe(log_stream);

    clone_build_test_cmd.on('close', (exit_code) => {
        log_build_duration(job.data.log_file, start_date);

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
        log_build_duration(job.data.log_file, start_date);
        done(err);
    });
}