import type { ClubView, ContactKind } from '@kttf/shared/types';

/**
 * Контакты клуба — в ссылки.
 *
 * Организатор вписывает их как привык: телефон с пробелами и скобками,
 * инстаграм с собакой, ссылкой или голым именем. Ссылка обязана открыть
 * звонок, чат или профиль при любом из этих видов, а не страницу ошибки.
 */

/** Цифры номера с ведущим плюсом, как их ждут `tel:` и WhatsApp. */
function digits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function phoneHref(phone: string): string {
  return `tel:+${digits(phone)}`;
}

/**
 * wa.me принимает номер без плюса и без разделителей.
 *
 * Готовый текст — ADR-055, решение 3: клуб видит в своём WhatsApp, что
 * человек пришёл со страницы на KTTF, а мы не храним ничьих контактов.
 */
export function whatsappHref(phone: string, text?: string): string {
  const base = `https://wa.me/${digits(phone)}`;

  return text === undefined ? base : `${base}?text=${encodeURIComponent(text)}`;
}

/**
 * Имя в Telegram из того, что вписал организатор: `@club`, `t.me/club`,
 * `https://t.me/club` или голое имя. Сервер ждёт имя без собаки.
 */
export function telegramHandle(value: string): string {
  const trimmed = value.trim();
  const fromUrl = /t(?:elegram)?\.me\/([^/?#]+)/i.exec(trimmed);

  return (fromUrl?.[1] ?? trimmed).replace(/^@/, '');
}

export function telegramHref(handle: string): string {
  return `https://t.me/${telegramHandle(handle)}`;
}

/** Сайт без протокола и хвостового слэша — так его читают: «club.kz». */
export function websiteLabel(url: string): string {
  return url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
}

/**
 * Маршрут в 2GIS: ссылка клуба на свою карточку, а без неё — поиск по
 * адресу. Встроенной карты нет (ADR-055, решение 11).
 */
export function routeHref(club: {
  readonly twoGisUrl: string | null;
  readonly address: string | null;
  readonly cityName: string;
  readonly name: string;
}): string {
  if (club.twoGisUrl !== null) return club.twoGisUrl;

  const query =
    club.address === null ? `${club.cityName}, ${club.name}` : `${club.cityName}, ${club.address}`;

  return `https://2gis.kz/search/${encodeURIComponent(query)}`;
}

/** Имя профиля без собаки и без адреса вокруг него. */
export function instagramHandle(value: string): string {
  const trimmed = value.trim();
  const fromUrl = /instagram\.com\/([^/?#]+)/i.exec(trimmed);

  return (fromUrl?.[1] ?? trimmed).replace(/^@/, '');
}

export function instagramHref(value: string): string {
  return `https://www.instagram.com/${instagramHandle(value)}`;
}

/**
 * Главный способ связи: выбранный клубом, если он заполнен, иначе первый
 * заполненный из WhatsApp, телефона, Telegram. В РК пишут в WhatsApp чаще,
 * чем звонят, поэтому он первый.
 */
export function primaryContactOf(
  club: Pick<ClubView, 'primaryContact' | 'phone' | 'whatsapp' | 'telegram'>,
): ContactKind | null {
  const available: readonly ContactKind[] = [
    ...(club.whatsapp === null ? [] : (['WHATSAPP'] as const)),
    ...(club.phone === null ? [] : (['PHONE'] as const)),
    ...(club.telegram === null ? [] : (['TELEGRAM'] as const)),
  ];

  if (club.primaryContact !== null && available.includes(club.primaryContact)) {
    return club.primaryContact;
  }

  return available[0] ?? null;
}
