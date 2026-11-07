import React, {lazy, Suspense, useEffect, useState} from 'react';
import ReactDOM from 'react-dom/client';
import {isLegacyEntry} from './lib/entry';
import {AppearanceProvider} from './lib/AppearanceProvider';
import './styles.css';
const App=lazy(()=>import('./App'));
const SymphonyStudio=lazy(()=>import('./components/SymphonyStudio'));
function Entry(){
  const [legacy,setLegacy]=useState(()=>isLegacyEntry(location.search,location.hash));
  useEffect(()=>{const update=()=>setLegacy(isLegacyEntry(location.search,location.hash));window.addEventListener('hashchange',update);window.addEventListener('popstate',update);return()=>{window.removeEventListener('hashchange',update);window.removeEventListener('popstate',update);};},[]);
  return <Suspense fallback={<p>Loading Earth FM…</p>}>{legacy?<App/>:<SymphonyStudio/>}</Suspense>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AppearanceProvider><Entry/></AppearanceProvider></React.StrictMode>);
