// Read only. Prints configuration presence, never hosts, users, recipients or keys.
const names=['SMTP_HOST','SMTP_USER','SMTP_PASSWORD','SMTP_FROM','MAKECOMMERCE_SHOP_ID','MAKECOMMERCE_SECRET_KEY','MAKECOMMERCE_PUBLISHABLE_KEY','MAKECOMMERCE_SERVER_IP'];
const present=Object.fromEntries(names.map(name=>[name,Boolean(process.env[name]?.trim())]));
const mode=name=>['disabled','smtp','capture','test','live'].includes(process.env[name]||'disabled')?(process.env[name]||'disabled'):'unrecognized';
console.log(JSON.stringify({at:new Date().toISOString(),present,modes:Object.fromEntries(['AUTH_MAIL_MODE','BOOKING_MAIL_MODE','BILLING_MAIL_MODE','MAKECOMMERCE_MODE'].map(name=>[name,mode(name)]))}));
