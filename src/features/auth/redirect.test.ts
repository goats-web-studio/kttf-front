import { describe, expect, it } from 'vitest';

import { authHref, redirectSearchSchema, safeRedirect } from './redirect';

describe('safeRedirect', () => {
  it('пропускает путь своего сайта', () => {
    expect(safeRedirect('/cabinet/coach')).toBe('/cabinet/coach');
    expect(safeRedirect('/players?search=Ким')).toBe('/players?search=Ким');
  });

  it('отбрасывает чужие адреса', () => {
    expect(safeRedirect('https://evil.example')).toBeUndefined();
    expect(safeRedirect('//evil.example')).toBeUndefined();
    expect(safeRedirect('/\\evil.example')).toBeUndefined();
    expect(safeRedirect('javascript:alert(1)')).toBeUndefined();
    expect(safeRedirect(undefined)).toBeUndefined();
  });
});

describe('redirectSearchSchema', () => {
  it('чужой адрес в поиске превращается в «нет адреса»', () => {
    expect(redirectSearchSchema.parse({ redirect: '//evil.example' })).toEqual({
      redirect: undefined,
    });
    expect(redirectSearchSchema.parse({ redirect: '/cabinet/coach' })).toEqual({
      redirect: '/cabinet/coach',
    });
  });
});

describe('authHref', () => {
  it('несёт адрес возврата со входа на регистрацию', () => {
    expect(authHref('/sign-up', '/cabinet/coach')).toBe('/sign-up?redirect=%2Fcabinet%2Fcoach');
    expect(authHref('/sign-up', undefined)).toBe('/sign-up');
  });
});
