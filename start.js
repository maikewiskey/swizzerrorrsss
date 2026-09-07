// start.js
const { spawn } = require('child_process');

function launch(file) {
  const proc = spawn('node', [file], { stdio: 'inherit' });
  proc.on('exit', code => {
    console.log(`${file} exited with code ${code}`);
    process.exit(code);          // if one dies, stop the whole container
  });
}

launch('server.js');
launch('bot.js');
