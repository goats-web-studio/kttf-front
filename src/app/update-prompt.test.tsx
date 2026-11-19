import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { notifyNavigated } from './navigation-events';
import { hasTypedText, isGuardedPath } from './update-policy';
import UpdatePrompt from './update-prompt';

const sw = vi.hoisted(() => ({
  needRefresh: false,
  update: vi.fn<(reload?: boolean) => Promise<void>>(() => Promise.resolve()),
}));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [sw.needRefresh, () => undefined],
    updateServiceWorker: sw.update,
  }),
}));

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('isGuardedPath', () => {
  it('охраняет консоль судьи и экран зала', () => {
    expect(isGuardedPath('/console')).toBe(true);
    expect(isGuardedPath('/console/')).toBe(true);
    expect(isGuardedPath('/console/7f1c')).toBe(true);
    expect(isGuardedPath('/screen/abc')).toBe(true);
  });

  it('не охраняет обычные страницы', () => {
    expect(isGuardedPath('/')).toBe(false);
    expect(isGuardedPath('/tournaments')).toBe(false);
    expect(isGuardedPath('/consoles')).toBe(false);
    expect(isGuardedPath('/forum/screen')).toBe(false);
  });
});

describe('hasTypedText', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('пустая страница — ничего не набрано', () => {
    document.body.innerHTML =
      '<input type="text"><textarea></textarea><input type="checkbox" value="on">';

    expect(hasTypedText()).toBe(false);
  });

  it('видит текст в поле, в textarea и в редакторе', () => {
    document.body.innerHTML = '<textarea>черновик</textarea>';
    expect(hasTypedText()).toBe(true);

    document.body.innerHTML = '<div contenteditable="true">пост</div>';
    expect(hasTypedText()).toBe(true);

    document.body.innerHTML = '<input type="search">';
    const field = document.querySelector('input');

    if (field === null) {
      throw new Error('нет поля');
    }

    field.value = 'Алматы';
    expect(hasTypedText()).toBe(true);
  });

  it('не считает поля только для чтения', () => {
    document.body.innerHTML =
      '<input type="text" value="1" readonly><input type="text" value="2" disabled>';

    expect(hasTypedText()).toBe(false);
  });
});

describe('UpdatePrompt', () => {
  beforeEach(() => {
    sw.needRefresh = true;
    sw.update.mockClear();
    setVisibility('visible');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    document.body.innerHTML = '';
  });

  it('без новой версии ничего не делает', () => {
    sw.needRefresh = false;
    render(<UpdatePrompt />);

    act(() => {
      notifyNavigated('/tournaments');
    });

    expect(sw.update).not.toHaveBeenCalled();
    expect(screen.queryByText('Доступна новая версия')).toBeNull();
  });

  it('на обычной странице не спрашивает и обновляется при переходе', () => {
    render(<UpdatePrompt />);

    expect(screen.queryByText('Доступна новая версия')).toBeNull();
    expect(sw.update).not.toHaveBeenCalled();

    act(() => {
      notifyNavigated('/tournaments');
    });

    expect(sw.update).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('на обычной странице обновляется, когда вкладка уходит в фон', () => {
    render(<UpdatePrompt />);

    act(() => {
      setVisibility('hidden');
    });

    expect(sw.update).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('в фоне не обновляется, если на странице что-то набрано', () => {
    render(
      <>
        <textarea defaultValue="недописанное сообщение" />
        <UpdatePrompt />
      </>,
    );

    act(() => {
      setVisibility('hidden');
    });

    expect(sw.update).not.toHaveBeenCalled();
  });

  it('в консоли судьи спрашивает и сам не обновляется', () => {
    window.history.replaceState(null, '', '/console/7f1c');
    render(<UpdatePrompt />);

    expect(screen.getByText('Доступна новая версия')).toBeTruthy();

    act(() => {
      setVisibility('hidden');
    });
    act(() => {
      notifyNavigated('/console');
    });

    expect(sw.update).not.toHaveBeenCalled();
  });

  it('уход из консоли на обычную страницу ставит новую версию', () => {
    window.history.replaceState(null, '', '/console/7f1c');
    render(<UpdatePrompt />);

    act(() => {
      notifyNavigated('/tournaments');
    });

    expect(sw.update).toHaveBeenCalledExactlyOnceWith(true);
    expect(screen.queryByText('Доступна новая версия')).toBeNull();
  });

  it('на экране зала спрашивает', () => {
    window.history.replaceState(null, '', '/screen/abc');
    render(<UpdatePrompt />);

    expect(screen.getByText('Доступна новая версия')).toBeTruthy();
    expect(sw.update).not.toHaveBeenCalled();
  });
});
