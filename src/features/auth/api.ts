import type {
  AuthSession,
  AuthUserView,
  LoginInput,
  SignUpInput,
  TokenPair,
} from '@kttf/shared/types';

import { apiRequest } from '@/common/api';

/** Контракт ТС 7.1, один в один. Формы запросов и ответов заданы документом. */

/** Вход логином или телефоном — ADR-034. */
export function signIn(input: LoginInput): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: input,
    anonymous: true,
  });
}

/** Регистрация: аккаунт и, если человек себя назвал, привязка к игроку. */
export function signUp(input: SignUpInput): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/sign-up', {
    method: 'POST',
    body: input,
    anonymous: true,
  });
}

export function refreshTokens(refreshToken: string): Promise<TokenPair> {
  // anonymous обязателен: иначе отказ здесь запустит обновление,
  // которое дожидается само себя.
  return apiRequest<TokenPair>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    anonymous: true,
  });
}

export async function endSession(refreshToken: string): Promise<void> {
  // 204 без тела: разбирать нечего, но дождаться ответа нужно.
  await apiRequest<undefined>('/auth/logout', {
    method: 'POST',
    body: { refreshToken },
    anonymous: true,
  });
}

export function fetchMe(): Promise<AuthUserView> {
  return apiRequest<AuthUserView>('/auth/me');
}
