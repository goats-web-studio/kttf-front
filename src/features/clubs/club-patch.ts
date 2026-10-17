import type { ClubView, CreateClubInput, UpdateClubInput } from '@kttf/shared/types';

const FIELDS = [
  'name',
  'shortName',
  'city',
  'address',
  'tableCount',
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
 * Стёртое необязательное поле сюда не попадает: контракт правки не умеет
 * обнулять значения, только задавать новые.
 */
export function clubPatch(club: ClubView, values: CreateClubInput): UpdateClubInput | null {
  const patch: Record<string, string | number> = {};

  for (const field of FIELDS) {
    const next = values[field];

    if (next !== undefined && next !== club[field]) {
      patch[field] = next;
    }
  }

  return Object.keys(patch).length === 0 ? null : patch;
}
