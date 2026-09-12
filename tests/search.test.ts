import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../src/lib/errors';
import { searchPageForHost } from '../src/lib/search';
import { tenantForHost, type Tenant } from '../src/lib/tenants';

vi.mock('../src/lib/tenants', async importOriginal => ({
  ...await importOriginal<typeof import('../src/lib/tenants')>(),
  tenantForHost: vi.fn(),
}));
const lookup = vi.mocked(tenantForHost);
beforeEach(() => lookup.mockReset());

describe('Search visibility', () => {
  it('indexes the public site with one canonical www/non-www URL', async () => {
    for (const host of ['ajasta.ee', 'www.ajasta.ee', 'broneering.info', 'www.broneering.info']) {
      expect(await searchPageForHost(host)).toMatchObject({url:'https://ajasta.ee/', title:'Ajasta – broneerimissüsteem teenusepakkujatele'});
    }
    expect(lookup).not.toHaveBeenCalled();
  });
  it('excludes administration, demos, local previews and foreign hosts', async () => {
    for (const host of ['haldus.broneering.info', 'demo.broneering.info', 'demo2.broneering.info', 'localhost:3107', 'ilutegu.localhost:3107', 'broneering.info.example.com', 'ajasta.ee.example.com', 'salong.ajasta.ee']) {
      expect(await searchPageForHost(host)).toBeNull();
    }
    expect(lookup).not.toHaveBeenCalled();
  });
  it('indexes an active real company only after verified domain lookup', async () => {
    lookup.mockResolvedValue({name:'Päris salong',address:'Tallinn',demo:false,active:true} as Tenant);
    expect(await searchPageForHost('salong.broneering.info')).toMatchObject({url:'https://salong.broneering.info/',title:'Päris salong – broneeri aeg | broneering.info'});
    expect(lookup).toHaveBeenCalledWith('salong.broneering.info');
  });
  it('keeps unregistered, inactive and demo company pages out of search', async () => {
    lookup.mockRejectedValueOnce(new AppError(404,'TENANT_NOT_FOUND','Missing'));
    expect(await searchPageForHost('missing.broneering.info')).toBeNull();
    lookup.mockResolvedValueOnce({demo:true,active:true} as Tenant);
    expect(await searchPageForHost('salong.broneering.info')).toBeNull();
    lookup.mockResolvedValueOnce({demo:false,active:false} as Tenant);
    expect(await searchPageForHost('salong.broneering.info')).toBeNull();
  });
});
