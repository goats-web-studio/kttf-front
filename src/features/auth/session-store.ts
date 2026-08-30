import type { AuthSession, AuthUserView } from '@kttf/shared/types';
import { create } from 'zustand';

import { clearRefreshToken, writeRefreshToken } from './token-storage';

interface SessionState {
  /** `null` — не вошёл. Тот же тип, что отдаёт ТС 7.1. */
  readonly user: AuthUserView | null;
  /**
   * Access-токен живёт только здесь.
   *
   * На диск он не попадает: срок жизни 15 минут, а отзыва у JWT нет —
   * записанный токен работал бы даже после выхода.
   */
  readonly accessToken: string | null;
  /** Пока идёт восстановление сессии, охрану маршрутов запускать нельзя. */
  readonly isRestoring: boolean;
  readonly signedIn: (session: AuthSession) => void;
  readonly tokensRefreshed: (accessToken: string, refreshToken: string) => void;
  readonly userLoaded: (user: AuthUserView, accessToken: string) => void;
  readonly signedOut: () => void;
  readonly restoreFinished: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  accessToken: null,
  isRestoring: true,

  signedIn: (session) => {
    writeRefreshToken(session.refreshToken);
    set({ user: session.user, accessToken: session.accessToken, isRestoring: false });
  },

  tokensRefreshed: (accessToken, refreshToken) => {
    writeRefreshToken(refreshToken);
    set({ accessToken });
  },

  userLoaded: (user, accessToken) => {
    set({ user, accessToken, isRestoring: false });
  },

  signedOut: () => {
    clearRefreshToken();
    set({ user: null, accessToken: null, isRestoring: false });
  },

  restoreFinished: () => {
    set({ isRestoring: false });
  },
}));
