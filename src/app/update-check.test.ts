import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyUpdate, UPDATE_CHECK_MS, watchForUpdates } from './update-check';

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
}

function setOnline(value: boolean): void {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}

describe('watchForUpdates', () => {
  const registration = {
    installing: null as ServiceWorker | null,
    update: vi.fn<() => Promise<ServiceWorkerRegistration>>(),
  };
  let stop: () => void = () => undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    registration.installing = null;
    registration.update.mockReset();
    registration.update.mockResolvedValue({} as ServiceWorkerRegistration);
    setOnline(true);
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  it('спрашивает о новой версии раз в пять минут', () => {
    stop = watchForUpdates(registration);

    vi.advanceTimersByTime(UPDATE_CHECK_MS - 1);
    expect(registration.update).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(registration.update).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(UPDATE_CHECK_MS);
    expect(registration.update).toHaveBeenCalledTimes(2);
  });

  it('спрашивает, когда к вкладке возвращаются, но не когда уходят', () => {
    stop = watchForUpdates(registration);

    setVisibility('hidden');
    expect(registration.update).not.toHaveBeenCalled();
    setVisibility('visible');
    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it('без сети и во время установки не спрашивает', () => {
    stop = watchForUpdates(registration);

    setOnline(false);
    vi.advanceTimersByTime(UPDATE_CHECK_MS);
    expect(registration.update).not.toHaveBeenCalled();

    setOnline(true);
    registration.installing = {} as ServiceWorker;
    vi.advanceTimersByTime(UPDATE_CHECK_MS);
    expect(registration.update).not.toHaveBeenCalled();
  });

  it('ошибка проверки не всплывает, после остановки проверок нет', async () => {
    registration.update.mockRejectedValue(new Error('offline'));
    stop = watchForUpdates(registration);

    vi.advanceTimersByTime(UPDATE_CHECK_MS);
    await Promise.resolve();
    expect(registration.update).toHaveBeenCalledTimes(1);

    stop();
    vi.advanceTimersByTime(UPDATE_CHECK_MS * 3);
    setVisibility('visible');
    expect(registration.update).toHaveBeenCalledTimes(1);
  });
});

describe('applyUpdate', () => {
  /** Ждущий работник: состояние меняется руками, как это делает браузер. */
  function waitingWorker(): { worker: ServiceWorker; become: (state: ServiceWorkerState) => void } {
    const target = new EventTarget();
    const worker = Object.assign(target, { state: 'installed' });
    return {
      worker: worker as unknown as ServiceWorker,
      become: (state) => {
        worker.state = state;
        target.dispatchEvent(new Event('statechange'));
      },
    };
  }

  it('включает ждущую версию и перезагружает вкладку, когда она включилась', () => {
    const { worker, become } = waitingWorker();
    const skipWaiting = vi.fn();
    const reload = vi.fn();

    applyUpdate({ waiting: worker }, skipWaiting, reload);
    expect(skipWaiting).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();

    // Вкладкой без работника смены управляющего не будет — перезагрузка
    // всё равно приходит, по включению новой версии.
    become('activating');
    expect(reload).not.toHaveBeenCalled();
    become('activated');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('ждущего уже нет — версию включила другая вкладка: сразу перезагрузка', () => {
    const skipWaiting = vi.fn();
    const reload = vi.fn();

    applyUpdate({ waiting: null }, skipWaiting, reload);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(skipWaiting).not.toHaveBeenCalled();
  });
});
