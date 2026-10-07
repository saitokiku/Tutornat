'use strict';
// Prints the owner connection's server identity. A file, not `node -e`: the
// reviewer sandbox denies inline evaluation (issue #10, item 5).
const h=require('./harness.cjs');
(async()=>{const c=await h.owner();try{console.log(JSON.stringify(await h.serverIdentity(c)));}finally{await c.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
