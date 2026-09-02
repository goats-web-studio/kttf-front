/**
 * Заглушка `EventSource` — jsdom его не реализует.
 *
 * Без неё экран зала падает на первом же рендере: поток открывается при
 * монтировании (ТС 7.7). Заглушка ставится в `setup.ts` для всех тестов,
 * а тесты самого экрана берут открытый поток отсюда и шлют в него события.
 */

type Listener = (event: MessageEvent<string>) => void;

export class FakeEventSource {
  readonly url: string;
  closed = false;
  onerror: (() => void) | null = null;

  private readonly listeners = new Map<string, Listener[]>();

  constructor(url: string) {
    this.url = url;
    openStreams.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close(): void {
    this.closed = true;
  }

  /** Событие от сервера. */
  emit(type: string, data: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data: JSON.stringify(data) } as MessageEvent<string>);
    }
  }

  /** Обрыв связи: `EventSource` в этом случае зовёт `onerror` и переподключается сам. */
  fail(): void {
    this.onerror?.();
  }
}

/** Потоки, открытые с начала теста. Последний — тот, что на экране. */
export const openStreams: FakeEventSource[] = [];

export function installFakeEventSource(): void {
  openStreams.length = 0;
  globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;
}
