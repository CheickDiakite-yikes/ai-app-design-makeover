import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ApiKeyWrapper } from './ApiKeyWrapper.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApiKeyWrapper>
      <App />
    </ApiKeyWrapper>
  </StrictMode>,
);
