import {pool,transaction} from '../services/api/src/platform/db/index.ts';
import {reconcileErasure} from '../services/api/src/modules/privacy/index.ts';
if(new URL(process.env.DATABASE_URL!).pathname!=='/suraksha_restore_test')throw Error('Rehearsal only runs against suraksha_restore_test');
try{await transaction(reconcileErasure);}finally{await pool.end();}
