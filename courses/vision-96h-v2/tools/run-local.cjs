'use strict';
const {applyLocalConfig,loadLocalConfig,LocalConfigError}=require('./local-config.cjs');
let config;
try{config=loadLocalConfig();}catch(e){if(!(e instanceof LocalConfigError))throw e;console.error(e.message);process.exit(1);}
for(const line of config.notices)console.log(line);
for(const line of config.warnings)console.warn(`설정 경고: ${line}`);
applyLocalConfig(config.values);
const {createServer}=require('./server.cjs');
const app=createServer();
app.listen(8765,'127.0.0.1').then(()=>{console.log('현장 리스크 대시보드: http://127.0.0.1:8765');}).catch(e=>{console.error(e.message);process.exit(1);});
// Windows sends SIGHUP when the console window is closed and SIGBREAK on Ctrl+Break.
require('./shutdown.cjs').installShutdown(app);
