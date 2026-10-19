// Первым: схемы Zod решают, собирать ли код строкой, при создании (ADR-055).
import './zod-config';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './app/app';
import { rememberTrafficSource } from './features/clubs/track';
import './styles.css';

const container = document.getElementById('root');

if (container === null) {
  throw new Error('Корневой элемент #root не найден: разошлись index.html и точка входа');
}

// Метки рекламы есть только в адресе первой страницы — запоминаем сразу (ADR-055).
rememberTrafficSource(window.location.search);

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
