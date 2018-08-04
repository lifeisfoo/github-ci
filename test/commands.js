const chai = require('chai');
const expect = chai.expect;

const path = require("path");
const commands = require('../lib/commands');

const file = path.resolve('test/support/big-real-log.txt');

describe('Commands', function() {
    describe('#convert_log_to_html()', function() {
        it('should convert big log files without throwing "stdout maxBuffer exceeded" error', function(done) {
            const convert = commands.convert_log_to_html(file, `${file}.html`);
            convert.on('exit', (code, signal) => {
                if (code === 0) {
                    done();
                } else {
                    done(new Error(`Convert log to html exited with code ${code} and signal ${signal}`));
                }
            });
            convert.on('error', (err) => {
                done(err);
            });
        });
    });
});
