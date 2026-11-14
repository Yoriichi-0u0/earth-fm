export const PAGE_PATHS = {home:'/',listen:'/listen',create:'/create',data:'/data',about:'/about'} as const;
export type StudioPage = keyof typeof PAGE_PATHS;
export function pageForPath(path:string):StudioPage {
  const normalized=path.replace(/\/+$/,'') || '/';
  return (Object.keys(PAGE_PATHS) as StudioPage[]).find(page=>PAGE_PATHS[page]===normalized) ?? 'home';
}
export function pageUrl(page:StudioPage,station:'climate'|'arctic'|'all'=page==='listen'?'all':'climate',visual?:'motion'){
  const params=new URLSearchParams();
  // Listen opens the jukebox (every player); ?station=climate|arctic opens that record's guided story.
  if(page==='listen'){if(station!=='all')params.set('station',station);}
  else if(station!=='climate'&&['create','data'].includes(page))params.set('station',station==='all'?'climate':station);
  if(page==='listen'&&visual==='motion')params.set('visual','motion');
  return PAGE_PATHS[page]+(params.size?'?'+params.toString():'');
}
export function goToPage(page:StudioPage,station:'climate'|'arctic'|'all'=page==='listen'?'all':'climate',visual?:'motion'){
  const path=pageUrl(page,station,visual);
  if(location.pathname+location.search!==path || location.hash){
    history.pushState({},'',path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}
