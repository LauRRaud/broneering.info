// Bounded aggregate signals. Never accept request URLs, tokens, emails or raw errors.
const windows=new Map<string,{until:number;count:number}>();
export function recordSecurityRejection(code:string,status:number) {
  if(![401,403,410].includes(status))return;
  const safeCode=/^[A-Z_]{1,64}$/.test(code)?code:'REJECTED';
  const now=Date.now(),key=`${status}:${safeCode}`;
  for(const [k,v] of windows)if(v.until<=now)windows.delete(k);
  if(!windows.has(key)&&windows.size>=128)return;
  const window=windows.get(key)??{until:now+60000,count:0};
  window.count=Math.min(window.count+1,1_000_000);windows.set(key,window);
  // First rejection and exponentially spaced cumulative counts avoid log flooding.
  if((window.count&(window.count-1))===0)console.warn(JSON.stringify({event:'security.rejected',code:safeCode,status,count:window.count,windowEndsAt:new Date(window.until).toISOString()}));
}
