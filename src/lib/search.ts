import { AppError } from './errors';
import { hostnameFromHost, tenantForHost } from './tenants';

type SearchPage = { url: string; title: string; description: string };

// Only verified public hosts qualify. Preview hosts, demos and administration stay noindex.
export async function searchPageForHost(host: string): Promise<SearchPage | null> {
  const hostname = hostnameFromHost(host);
  if (hostname === 'broneering.info' || hostname === 'www.broneering.info') {
    return {
      url: 'https://broneering.info/',
      title: 'Broneering.info – broneerimissüsteem ettevõtetele',
      description: 'Veebipõhine broneerimissüsteem teenuseettevõtetele. Oma broneerimisleht, teenused ja kliendi enda valitud aeg. Tutvu võimalustega ja proovi demot.',
    };
  }
  const reserved = ['haldus', 'app', 'api', 'admin', 'cdn', 'mail', 'demo', 'demo2'];
  if (!/^[a-z][a-z0-9-]*\.broneering\.info$/.test(hostname) || reserved.includes(hostname.split('.')[0])) return null;
  try {
    const tenant = await tenantForHost(host);
    if (!tenant.active || tenant.demo) return null;
    return {
      url: `https://${hostname}/`,
      title: `${tenant.name} – broneeri aeg | broneering.info`,
      description: `Broneeri aeg ettevõttes ${tenant.name}. Vali teenus, töötaja ja endale sobiv aeg. ${tenant.address}`,
    };
  } catch (error) {
    if (error instanceof AppError && error.status === 404) return null;
    throw error;
  }
}
