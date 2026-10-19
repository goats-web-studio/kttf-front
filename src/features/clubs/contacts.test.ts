import { describe, expect, it } from 'vitest';

import {
  instagramHandle,
  instagramHref,
  phoneHref,
  primaryContactOf,
  routeHref,
  telegramHandle,
  websiteLabel,
  whatsappHref,
} from './contacts';

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

describe('связь со страницы клуба (ADR-055)', () => {
  it('WhatsApp открывается с готовым текстом', () => {
    expect(whatsappHref('+7 701 123 45 67', 'Хочу на тренировку')).toBe(
      'https://wa.me/77011234567?text=%D0%A5%D0%BE%D1%87%D1%83%20%D0%BD%D0%B0%20%D1%82%D1%80%D0%B5%D0%BD%D0%B8%D1%80%D0%BE%D0%B2%D0%BA%D1%83',
    );
  });

  it('Telegram — имя из собаки и ссылки', () => {
    expect(telegramHandle('@kttf_club')).toBe('kttf_club');
    expect(telegramHandle('https://t.me/kttf_club')).toBe('kttf_club');
    expect(telegramHandle('t.me/kttf_club?start=1')).toBe('kttf_club');
  });

  it('сайт читается без протокола', () => {
    expect(websiteLabel('https://www.club.kz/')).toBe('club.kz');
  });

  it('маршрут — карточка 2GIS клуба, без неё — поиск по адресу', () => {
    const base = { address: 'ул. Абая, 1', cityName: 'Алматы', name: 'Ракетка' };

    expect(routeHref({ ...base, twoGisUrl: 'https://2gis.kz/almaty/firm/1' })).toBe(
      'https://2gis.kz/almaty/firm/1',
    );
    expect(routeHref({ ...base, twoGisUrl: null })).toBe(
      `https://2gis.kz/search/${encodeURIComponent('Алматы, ул. Абая, 1')}`,
    );
    expect(routeHref({ ...base, address: null, twoGisUrl: null })).toBe(
      `https://2gis.kz/search/${encodeURIComponent('Алматы, Ракетка')}`,
    );
  });

  it('главная кнопка — выбранная клубом, если она заполнена, иначе WhatsApp', () => {
    const club = { primaryContact: null, phone: '+7 701', whatsapp: '+7 702', telegram: null };

    expect(primaryContactOf(club)).toBe('WHATSAPP');
    expect(primaryContactOf({ ...club, primaryContact: 'PHONE' })).toBe('PHONE');
    expect(primaryContactOf({ ...club, primaryContact: 'TELEGRAM' })).toBe('WHATSAPP');
    expect(
      primaryContactOf({ primaryContact: null, phone: null, whatsapp: null, telegram: null }),
    ).toBeNull();
  });
});
