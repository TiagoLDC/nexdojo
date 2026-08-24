// ⚠️ CÓDIGO MORTO — NÃO É O ENTRY POINT REAL DO APP.
// `index.html` carrega `/src/main.tsx` (não este arquivo). O app que roda de verdade é
// `src/main.tsx` → `src/App.tsx` (BrowserRouter + `src/pages/*Page.tsx`). Este arquivo e o
// `App.tsx` da raiz (HashRouter, com sua própria Sidebar/menu mobile embutidos) nunca são
// executados no navegador — confirmado em 24/08/2026 (ver PLANO_GRADUACAO.md, seção
// "Descoberta de app duplicado"). Editar `App.tsx`/`index.tsx` da raiz não tem efeito
// nenhum na aplicação real; qualquer mudança de UI precisa ir em `src/App.tsx` +
// `src/pages/*Page.tsx` (que na maioria dos casos só embrulham os componentes em `views/*.tsx`
// — esses SIM são reaproveitados e ficam ativos). Candidato a remoção numa limpeza futura.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './services/LanguageContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
