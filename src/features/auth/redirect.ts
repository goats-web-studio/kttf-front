import { z } from 'zod';

/**
 * Куда вернуть человека после входа или регистрации — `?redirect=`.
 *
 * Кладёт его охрана кабинета: гость, нажавший «Стать тренером» на главной,
 * попадает на вход с адресом страницы тренера. Раньше адрес помнил только
 * вход: кто вместо входа шёл регистрироваться, после регистрации оказывался
 * в кабинете и терял, зачем пришёл.
 *
 * Только путь своего сайта: `https://…` и `//чужой.сайт` из ссылки в чате
 * увели бы только что вошедшего человека на чужую страницу.
 */
export function safeRedirect(value: string | undefined): string | undefined {
  if (!value?.startsWith('/')) return undefined;
  if (value.startsWith('//') || value.startsWith('/\\')) return undefined;
  return value;
}

/** Схема поиска страниц входа и регистрации. Чужой адрес отбрасывается. */
export const redirectSearchSchema = z.object({
  redirect: z
    .string()
    .optional()
    .transform((value) => safeRedirect(value)),
});

/** Ссылка на вход или регистрацию, которая несёт адрес возврата дальше. */
export function authHref(path: '/login' | '/sign-up', redirect: string | undefined): string {
  return redirect === undefined ? path : `${path}?${new URLSearchParams({ redirect }).toString()}`;
}
