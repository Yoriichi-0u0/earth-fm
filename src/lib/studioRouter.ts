export const PAGE_PATHS = {home:'/',listen:'/listen',create:'/create',data:'/data',about:'/about'} as const;
export type StudioPage = keyof typeof PAGE_PATHS;
export function pageForPath(path:string):StudioPage {
  const normalized=path.replace(/\/+$/,'') || '/';
  return (Object.keys(PAGE_PATHS) as StudioPage[]).find(page=>PAGE_PATHS[page]===normalized) ?? 'home';
}
export function goToPage(page:StudioPage){
  const path=PAGE_PATHS[page];
  if(location.pathname!==path || location.search || location.hash){
    history.pushState({},'',path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}
