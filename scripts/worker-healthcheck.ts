import {checkHeartbeat,heartbeatPath} from '../src/lib/worker-health';
try{
 const ok=await checkHeartbeat(heartbeatPath(process.argv[2]??''),Number(process.env.WORKER_HEARTBEAT_MAX_AGE_MS??300000));
 console.log(JSON.stringify({status:ok?'healthy':'unhealthy'}));process.exitCode=ok?0:1;
}catch{console.log(JSON.stringify({status:'unhealthy'}));process.exitCode=1;}
