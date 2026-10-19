import { StrictMode } from 'react';
import { z } from 'zod';
import { createRoot } from 'react-dom/client';

import App from './app/app';
import { rememberTrafficSource } from './features/clubs/track';
import './styles.css';

const container = document.getElementById('root');

if (container === null) {
  throw new Error('Корневой элемент #root не найден: разошлись index.html и точка входа');
}

// Zod 4 ускоряет разбор, собирая код строкой через `new Function`. CSP сайта
// исполнение строк запрещает (ADR-055) — разбор идёт без этой оптимизации.
z.config({ jitless: true });

// Метки рекламы есть только в адресе первой страницы — запоминаем сразу (ADR-055).
rememberTrafficSource(window.location.search);

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
