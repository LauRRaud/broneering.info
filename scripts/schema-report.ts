import {writeFile} from 'node:fs/promises';
import pg from 'pg';
// Schema-only report: no business rows, connection strings or credentials are read.
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
const cell=(value:unknown)=>String(value??'—').replaceAll('|','\\|').replaceAll('\n',' ');
await db.connect();
try{
  const migrations=(await db.query('SELECT name FROM schema_migrations ORDER BY name')).rows.map(r=>r.name);
  const tables=await db.query<{oid:number;name:string;kind:string;rls:boolean;forced:boolean;options:string[]|null}>("SELECT c.oid,c.relname AS name,c.relkind AS kind,c.relrowsecurity AS rls,c.relforcerowsecurity AS forced,c.reloptions AS options FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','v') ORDER BY c.relname");
  const parts=['# Andmebaasiskeem','', 'Genereeritud käsuga `npm run db:schema`. Sisaldab ainult skeemi, mitte ettevõtete andmeid. Äriliste objektide seosed ja API piirid on [DATA-MODEL.md](DATA-MODEL.md).','',`Migratsioonid: ${migrations.join(', ')}.`,''];
  for(const table of tables.rows){
    parts.push(`## ${table.name}`,'',`${table.kind==='v'?'Vaade':'Tabel'}; RLS: ${table.rls?'jah':'ei'}; FORCE RLS: ${table.forced?'jah':'ei'}${table.options?`; ${table.options.join(', ')}`:''}.`,'');
    const fields=await db.query('SELECT a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS required,pg_get_expr(d.adbin,d.adrelid) AS default FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=$1 AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum',[table.oid]);
    parts.push('| Väli | Tüüp | NOT NULL | Vaikeväärtus |','| --- | --- | --- | --- |',...fields.rows.map(f=>`| ${cell(f.name)} | ${cell(f.type)} | ${f.required?'jah':'ei'} | ${cell(f.default)} |`),'');
    const constraints=await db.query('SELECT conname AS name,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid=$1 ORDER BY conname',[table.oid]);
    if(constraints.rowCount)parts.push('Piirangud:','',...constraints.rows.map(c=>`- ${c.name}: \`${c.definition}\``),'');
    const indexes=await db.query('SELECT pg_get_indexdef(indexrelid) AS definition FROM pg_index WHERE indrelid=$1 ORDER BY indexrelid::regclass::text',[table.oid]);
    if(indexes.rowCount)parts.push('Indeksid:','',...indexes.rows.map(i=>`- \`${i.definition}\``),'');
    const triggers=await db.query('SELECT pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid=$1 AND NOT tgisinternal ORDER BY tgname',[table.oid]);
    if(triggers.rowCount)parts.push('Päästikud (funktsioonide sisu on migratsioonides):','',...triggers.rows.map(t=>`- \`${t.definition}\``),'');
    const policies=await db.query('SELECT policyname,qual,with_check FROM pg_policies WHERE schemaname=\'public\' AND tablename=$1 ORDER BY policyname',[table.name]);
    for(const policy of policies.rows)parts.push(`RLS ${policy.policyname}: USING \`${policy.qual??'—'}\`; WITH CHECK \`${policy.with_check??'(USING)'}\`.`,'');
    const privileges=await db.query("SELECT privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name=$1 AND grantee='booking_app' ORDER BY privilege_type",[table.name]);
    parts.push(`booking_app: ${privileges.rows.map(r=>r.privilege_type).join(', ')||'õigused puuduvad'}.`,'');
    if(table.kind==='v')parts.push('```sql',(await db.query('SELECT pg_get_viewdef($1::oid,true) AS definition',[table.oid])).rows[0].definition,'```','');
  }
  await writeFile('docs/SCHEMA.md',parts.join('\n'));
  console.log(`Documented ${tables.rowCount} tables/views and ${migrations.length} migrations; no row data included.`);
}finally{await db.end();}

