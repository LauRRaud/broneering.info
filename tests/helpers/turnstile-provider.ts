// A local boundary double for Cloudflare; React and next/script remain real.
export function installTurnstileProvider() {
  let sequence=0;
  const widgets=new Map<string,{element:HTMLElement;callback:(token:string)=>void}>();
  window.turnstile={
    render(element,options){
      const id=String(++sequence);
      const callback=options.callback as (token:string)=>void;
      widgets.set(id,{element,callback});
      const button=document.createElement('button');
      button.type='button';button.textContent='Solve challenge';
      button.onclick=()=>callback(`token-${id}`);
      element.append(button);
      return id;
    },
    remove(id){widgets.get(id)?.element.replaceChildren();widgets.delete(id);},
    reset(id){
      const widget=widgets.get(id);
      if(widget){
        widget.callback('');
        widget.element.querySelector('button')!.onclick=()=>widget.callback(`refreshed-${++sequence}`);
      }
    },
  };
}

export function finishScriptLoad(){
  const script=document.querySelector('script[src*="challenges.cloudflare.com"]');
  if(!script)throw new Error('Turnstile script was not requested');
  script.dispatchEvent(new Event('load'));
}
