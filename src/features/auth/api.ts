import type {
  AuthSession,
  AuthUserView,
  RequestCodeResult,
  TokenPair,
  VerifyCodeInput,
} from '@kttf/shared/types';

import { apiRequest } from '@/common/api';

/** Контракт ТС 7.1, один в один. Формы запросов и ответов заданы документом. */

export function requestCode(phone: string): Promise<RequestCodeResult> {
  return apiRequest<RequestCodeResult>('/auth/request-code', {
    method: 'POST',
    body: { phone },
    anonymous: true,
  });
}

export function verifyCode(input: VerifyCodeInput): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/verify-code', {
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
