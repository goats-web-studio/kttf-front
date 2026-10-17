import { describe, expect, it } from 'vitest';

import { instagramHandle, instagramHref, phoneHref, whatsappHref } from './contacts';

describe('контакты клуба', () => {
  it('телефон в любом написании даёт рабочий номер', () => {
    expect(phoneHref('+7 (701) 123-45-67')).toBe('tel:+77011234567');
    expect(whatsappHref('+7 701 123 45 67')).toBe('https://wa.me/77011234567');
  });

  it('инстаграм с собакой, ссылкой и без них ведёт в один профиль', () => {
    expect(instagramHandle('@kttf.kz')).toBe('kttf.kz');
    expect(instagramHandle('kttf.kz')).toBe('kttf.kz');
    expect(instagramHandle('https://www.instagram.com/kttf.kz/?hl=ru')).toBe('kttf.kz');
    expect(instagramHref('@kttf.kz')).toBe('https://www.instagram.com/kttf.kz');
  });
});
