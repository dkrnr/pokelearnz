"""Reproducible HEAD probe of every numbered normal/shiny jsDelivr GIF (no keys)."""
import concurrent.futures, datetime, json, time, urllib.request, urllib.error
from pathlib import Path
BASE='https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/'
def probe(pair):
    ident, shiny=pair; url=BASE+('shiny/' if shiny else '')+str(ident)+'.gif'
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,method='HEAD'),timeout=12) as response:
                mime=response.headers.get('Content-Type','').split(';')[0]
                return dict(id=ident,shiny=shiny,status=response.status,available=response.status==200 and mime=='image/gif',bytes=int(response.headers.get('Content-Length','0')),mime=mime)
        except urllib.error.HTTPError as e:
            if e.code==404:return dict(id=ident,shiny=shiny,status=404,available=False)
            status=e.code
        except Exception:status='network'
        time.sleep(.3*(attempt+1))
    return dict(id=ident,shiny=shiny,status=status,available=False,unverified=True)
if __name__=='__main__':
    results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
        for result in pool.map(probe,[(i,s) for i in range(1,1026) for s in [False,True]]):
            results.append(result)
            if len(results)%100==0:print('Probed',len(results),'/',2050,flush=True)
    out=Path('docs/redesign/sprite-probe.json')
    out.write_text(json.dumps(dict(at=datetime.datetime.now(datetime.timezone.utc).isoformat(),base=BASE,method='HEAD, 3 attempts; only 200 image/gif is available; only 404 confirms absence',results=results),indent=2)+'\n')
    Path('animated-coverage.json').write_text(json.dumps({('shiny' if s else 'normal'):{str(r['id']):r['bytes'] for r in results if r['shiny']==s and r['available']} for s in [False,True]},separators=(',',':'))+'\n')
    print('Available:',sum(r['available'] for r in results),'Unverified:',sum(r.get('unverified',False) for r in results),flush=True)
