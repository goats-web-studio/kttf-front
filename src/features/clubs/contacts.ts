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

/** wa.me принимает номер без плюса и без разделителей. */
export function whatsappHref(phone: string): string {
  return `https://wa.me/${digits(phone)}`;
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
