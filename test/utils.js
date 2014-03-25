exports.clear = clear;

var exec = require('child_process').exec;

function clear (path, done) {
  var command = 'rm -rf ' + path;
  exec(command, function(err, stdout, stderr) {
    done();
  });
}