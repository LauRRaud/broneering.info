import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';

const fixture=JSON.parse(await readFile('output/playwright/acceptance-g03/fixture.json','utf8'));
const booking=`http://${fixture.tenants[0].slug}.localhost:3108`;
const server=createServer((request,response)=>{
 const url=new URL(request.url,'http://127.0.0.1:3110');
 const parent=`http://${request.headers.host}`;
 const script=url.pathname==='/no-script'?'':`<script src="${booking}/widget/v1.js" defer></script>`;
 response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
 response.end(`<!doctype html><html lang="et"><meta name="viewport" content="width=device-width,initial-scale=1"><title>G03 synthetic embedding host</title><body><h1>G03 testkoduleht</h1><button id="outside">Väline nupp</button><a id="opener" href="${booking}/" data-booking-modal>Broneeri modaali kaudu</a><a id="second" href="${booking}/" data-booking-modal>Teine avaja</a>${url.pathname==='/inline'?`<iframe title="Manustatud broneerimine" data-booking-frame src="${booking}/embed?parent=${encodeURIComponent(parent)}" width="100%" height="700"></iframe>`:''}<a id="fallback" href="${booking}/">Ava broneerimisleht</a>${script}</body></html>`);
});
server.listen(3110,'127.0.0.1',()=>console.log('Synthetic embedding host listening at http://127.0.0.1:3110'));
