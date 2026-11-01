import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
const SymphonyStudio = lazy(() => import('./components/SymphonyStudio'));
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{new URLSearchParams(location.search).has('studio') ? <Suspense fallback={<p>Loading Earth Symphony Studio…</p>}><SymphonyStudio /></Suspense> : <App />}</React.StrictMode>,
);
