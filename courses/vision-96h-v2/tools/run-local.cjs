'use strict';
const {applyLocalConfig,loadLocalConfig,LocalConfigError,resolveModes}=require('./local-config.cjs');
let config,modes;
try{config=loadLocalConfig();}catch(e){if(!(e instanceof LocalConfigError))throw e;console.error(e.message);process.exit(1);}
for(const line of config.notices)console.log(line);
for(const line of config.warnings)console.warn(`설정 경고: ${line}`);
applyLocalConfig(config.values);
// Switch values and combinations are checked before the port is taken; a refused combination stops here.
try{modes=resolveModes(process.env);}catch(e){if(!(e instanceof LocalConfigError))throw e;console.error(e.message);process.exit(1);}
process.env.NOTEBOOKLM_DISABLE_HEADLESS_REFRESH='1';
const {createServer,startupModesLine}=require('./server.cjs');
const app=createServer({storageMode:modes.storage,geminiMode:modes.gemini,notebooklmMode:modes.notebooklm});
app.listen(8765,'127.0.0.1').then(()=>{console.log('현장 리스크 대시보드: http://127.0.0.1:8765');console.log(startupModesLine(modes));}).catch(e=>{console.error(e.message);process.exit(1);});
// Windows sends SIGHUP when the console window is closed and SIGBREAK on Ctrl+Break; both must release the job lock.
require('./shutdown.cjs').installShutdown(app);
