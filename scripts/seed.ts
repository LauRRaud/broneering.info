import pg from 'pg';

async function main() {
  if (process.env.ALLOW_DEMO_SEED !== 'true' || !process.env.MIGRATION_DATABASE_URL) throw new Error('Demo seeding requires ALLOW_DEMO_SEED=true and MIGRATION_DATABASE_URL');
  const client = new pg.Client({ connectionString: process.env.MIGRATION_DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    for (const salon of [
      { slug: 'ilutegu', name: 'Ilutegu', address: 'Tabasalu · näidisandmed', description: 'Aeg iseendale. Vali teenus ja leia endale sobiv hetk.', staff: ['Mari', 'Kertu'] },
      { slug: 'teine', name: 'Stuudio Kask', address: 'Tallinn · väljamõeldud demosalong', description: 'Väike paus sinu päevas. Juuksed, ilu ja hea enesetunne.', staff: ['Anna', 'Liis'] }
    ]) {
      const added = await client.query('INSERT INTO tenants(slug,name,address,description) VALUES($1,$2,$3,$4) ON CONFLICT(slug) DO NOTHING RETURNING id', [salon.slug,salon.name,salon.address,salon.description]);
      if (!added.rowCount) { console.log(`Already seeded ${salon.slug}; left existing data unchanged`); continue; }
      const tenant = added.rows[0].id;
      await client.query("SELECT set_config('app.tenant_id',$1,true)",[tenant]);
      await client.query('INSERT INTO tenant_domains(hostname,tenant_id) VALUES($1,$2)', [`${salon.slug}.localhost`,tenant]);
      const staffIds: string[] = [];
      for (const name of salon.staff) {
        const result = await client.query('INSERT INTO staff(tenant_id,name,title) VALUES($1,$2,$3) RETURNING id', [tenant,name,'Juuksur ja iluteenindaja']);
        staffIds.push(result.rows[0].id);
      }
      for (const [index, service] of [
        { name: 'Naiste lõikus', description: 'Konsultatsioon, juuste lõikus ja viimistlus.', category: 'Juuksed', price: 3500, duration: 45 },
        { name: 'Meeste lõikus', description: 'Värske lõikus, mis sobib sinu stiiliga.', category: 'Juuksed', price: 2500, duration: 30 },
        { name: 'Lõõgastav massaaž', description: 'Rahulik tund pingete leevendamiseks.', category: 'Heaolu', price: 4500, duration: 60 },
        { name: 'Spa-pediküür', description: 'Hoolitsetud jalad ja kerge enesetunne.', category: 'Ilu', price: 3500, duration: 60 }
      ].entries()) {
        const result = await client.query('INSERT INTO services(tenant_id,name,description,category) VALUES($1,$2,$3,$4) RETURNING id',[tenant,service.name,service.description,service.category]);
        for (const [staffIndex,staffId] of staffIds.entries()) {
          if (index >= 2 && staffIndex === 0) continue;
          await client.query('INSERT INTO staff_services(tenant_id,staff_id,service_id,price,duration,buffer_after) VALUES($1,$2,$3,$4,$5,10)',[tenant,staffId,result.rows[0].id,service.price+(staffIndex===1 && index===0 ? 500:0),service.duration]);
        }
      }
      for (let day=1;day<=6;day++) {
        for (const staffId of [null,...staffIds]) {
          for (const [start,end] of [[540,720],[780,1080]]) {
            await client.query('INSERT INTO weekly_hours(tenant_id,staff_id,weekday,start_minute,end_minute) VALUES($1,$2,$3,$4,$5)',[tenant,staffId,day,start,end]);
          }
        }
      }
      console.log(`Seeded ${salon.slug}.localhost (fictional demo schedules and staff)`);
    }
    if (process.env.PUBLISH_DEMO_DOMAINS === 'broneering.info') {
      for (const [slug,hostname] of [['ilutegu','demo.broneering.info'],['teine','demo2.broneering.info']]) {
        const result = await client.query('SELECT id FROM tenants WHERE slug=$1 AND demo=true',[slug]);
        if (result.rowCount !== 1) throw new Error(`Expected a demo tenant for ${slug}`);
        await client.query('INSERT INTO tenant_domains(hostname,tenant_id) VALUES($1,$2) ON CONFLICT(hostname) DO NOTHING',[hostname,result.rows[0].id]);
        const mapping = await client.query('SELECT tenant_id FROM tenant_domains WHERE hostname=$1',[hostname]);
        if (mapping.rows[0].tenant_id !== result.rows[0].id) throw new Error(`Domain ${hostname} already belongs to another tenant`);
        console.log(`Mapped demo domain ${hostname}`);
      }
    }
    await client.query('COMMIT');
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
