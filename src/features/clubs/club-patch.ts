import type { ClubView, CreateClubInput, UpdateClubInput } from '@kttf/shared/types';

/** Поля, которые форма задаёт всегда: без них клуба нет. */
const REQUIRED = ['name', 'city', 'tableCount'] as const satisfies readonly (keyof CreateClubInput &
  keyof ClubView)[];

/** Необязательные поля формы — их можно и задать, и стереть (ADR-043). */
const OPTIONAL = [
  'shortName',
  'address',
  'phone',
  'whatsapp',
  'instagram',
  'description',
] as const satisfies readonly (keyof CreateClubInput & keyof ClubView)[];

/**
 * Правка клуба — только изменённые поля.
 *
 * Форма отдаёт клуб целиком, а ТС 7.4 отвергает пустую правку: «сохранить»
 * без изменений — не ошибка человека, и до сервера такой запрос не доходит.
 * `null` значит «изменений нет».
 *
 * Стёртое в форме необязательное поле уходит `null`: убранный телефон
 * обязан исчезнуть и со страницы клуба.
 */
export function clubPatch(club: ClubView, values: CreateClubInput): UpdateClubInput | null {
  const patch: Record<string, string | number | null> = {};

  for (const field of REQUIRED) {
    const next = values[field];

    if (next !== undefined && next !== club[field]) {
      patch[field] = next;
    }
  }

  for (const field of OPTIONAL) {
    const next = values[field] ?? null;

    if (next !== club[field]) {
      patch[field] = next;
    }
  }

  return Object.keys(patch).length === 0 ? null : patch;
}
