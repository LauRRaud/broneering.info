import {it,expect,vi,afterEach} from 'vitest';
import {generateServiceTranslations,translationConfigured} from '../src/lib/translation-provider';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
const source={name:'Lõikus',description:'',language:'et' as const};
it('does not call a provider until credentials and model are configured',async()=>{
  vi.stubEnv('OPENAI_API_KEY','');vi.stubEnv('TRANSLATION_MODEL','');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  expect(translationConfigured()).toBe(false);await expect(generateServiceTranslations(source,['en'])).rejects.toMatchObject({code:'TRANSLATION_UNAVAILABLE'});expect(fetch).not.toHaveBeenCalled();
});
it('sends only source text and validates a complete structured response',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-only');vi.stubEnv('TRANSLATION_MODEL','configured-model');
  const fetch=vi.fn().mockResolvedValue(Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({translations:[{language:'en',name:'Haircut',description:''}]})}]}]}));vi.stubGlobal('fetch',fetch);
  expect(await generateServiceTranslations(source,['en'])).toEqual([{language:'en',name:'Haircut',description:''}]);
  const sent=JSON.parse(fetch.mock.calls[0][1].body);expect(sent.store).toBe(false);expect(JSON.parse(sent.input)).toEqual({sourceLanguage:'Estonian',name:'Lõikus',description:'',targetLanguages:['en']});expect(sent.text.format.strict).toBe(true);
});
it.each([
  {status:'incomplete',output:[]},
  {status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'no'}]}]},
  {status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({translations:[{language:'ru',name:'Wrong language',description:''}]})}]}]},
  {status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({translations:[{language:'en',name:'x'.repeat(151),description:''}]})}]}]},
])('rejects incomplete, refused or invalid output without exposing provider content',async body=>{
  vi.stubEnv('OPENAI_API_KEY','test-only');vi.stubEnv('TRANSLATION_MODEL','configured-model');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(body)));
  await expect(generateServiceTranslations(source,['en'])).rejects.toMatchObject({code:'TRANSLATION_FAILED',status:502});
});
