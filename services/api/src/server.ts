import {createApp} from './app.ts';
import {config} from './platform/config.ts';
import {pool,routePool} from './platform/db/index.ts';
import {recoverErasureLedger} from './modules/privacy/ledger.ts';
await recoverErasureLedger();
const app=createApp();
const server=app.listen(config.port,config.host,()=>console.log('API listening on configured interface, port',config.port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{void Promise.all([pool.end(),routePool.end()]).then(()=>process.exit(0));}));
