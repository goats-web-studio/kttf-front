import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import { installFakeEventSource } from './event-source';

// Без этого разметка предыдущего теста остаётся в документе и запросы находят
// элементы уже отработавшего случая.
afterEach(cleanup);

// Роутер восстанавливает позицию прокрутки на каждом переходе, а jsdom
// прокрутку не реализует и пишет об этом при каждом рендере. Поведение,
// которое проверяют тесты, от заглушки не зависит.
window.scrollTo = () => undefined;

// jsdom не реализует EventSource, а экран зала открывает поток при
// монтировании (ТС 7.7). Без заглушки маршрут падает ReferenceError.
installFakeEventSource();
