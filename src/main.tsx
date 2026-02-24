import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './app/AppShell';
import { Router } from './app/Router';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppShell>
      <Router />
    </AppShell>
  </StrictMode>,
);
