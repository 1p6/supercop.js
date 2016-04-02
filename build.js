var glob = require('glob')
var exec = require('child_process').exec

var files = glob.sync('vendor/src/*.c')
var command = 'emcc supercop.c ' + files.join(' ') + ' -o lib.js -O1'
var child = exec(command, function(err){
  if(err){
    throw err
  }
})
child.stdout.pipe(process.stdout)
child.stderr.pipe(process.stderr)
