import {createApp} from './app.ts';
import {config} from './platform/config.ts';
import {pool,routePool} from './platform/db/index.ts';
const app=createApp();
const server=app.listen(config.port,'127.0.0.1',()=>console.log('API listening on loopback port',config.port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{void Promise.all([pool.end(),routePool.end()]).then(()=>process.exit(0));}));
