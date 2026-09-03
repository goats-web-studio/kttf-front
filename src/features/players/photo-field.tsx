import { PHOTO_CONTENT_TYPES, rejectPhoto, type PhotoRejection } from '@kttf/shared/types';
import { useMutation } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import { uploadPlayerPhoto } from '@/features/players/api';

/**
 * Фото игрока — ТЗ 2.2, ADR-036.
 *
 * Файл проверяется до отправки той же функцией, что и на сервере (ADR-029):
 * ждать загрузку пяти мегабайт по залу с плохим Wi-Fi, чтобы получить отказ,
 * который был виден сразу, — не то, за что стоит платить трафиком.
 *
 * Загрузка отдельна от сохранения профиля: путь кладётся в форму, а в базу
 * уезжает вместе с остальными полями по кнопке. Иначе человек, передумавший
 * на середине, оставил бы за собой поменянное фото.
 */
export default function PhotoField({
  value,
  onChange,
}: {
  readonly value: string | null;
  readonly onChange: (url: string | null) => void;
}): ReactNode {
  const t = useT();
  const [rejection, setRejection] = useState<PhotoRejection>(null);

  const upload = useMutation({
    mutationFn: uploadPlayerPhoto,
    onSuccess: (uploaded) => {
      onChange(uploaded.url);
    },
  });

  return (
    <fieldset className="border-t border-slate-200 pt-4">
      <legend className="text-sm font-semibold text-slate-900">{t('player.form.photo')}</legend>

      <div className="mt-3 flex items-center gap-4">
        {value === null ? (
          <div className="grid size-20 place-items-center rounded-full bg-slate-100 text-xs text-slate-400">
            {t('player.form.noPhoto')}
          </div>
        ) : (
          <img src={value} alt="" className="size-20 rounded-full object-cover" />
        )}

        <div className="text-sm">
          <label className="cursor-pointer text-blue-700 underline">
            {upload.isPending ? t('common.loading') : t('player.form.photoChoose')}
            <input
              type="file"
              className="sr-only"
              accept={PHOTO_CONTENT_TYPES.join(',')}
              onChange={(event) => {
                const file = event.target.files?.[0];

                // Сброс значения: выбор того же файла второй раз иначе не
                // считается изменением и события не даёт.
                event.target.value = '';

                if (file === undefined) return;

                const problem = rejectPhoto({ type: file.type, size: file.size });

                setRejection(problem);

                if (problem === null) upload.mutate(file);
              }}
            />
          </label>

          {value !== null && (
            <button
              type="button"
              className="ml-4 text-slate-600 underline"
              onClick={() => {
                setRejection(null);
                onChange(null);
              }}
            >
              {t('player.form.photoRemove')}
            </button>
          )}

          <p className="mt-1 text-xs text-slate-500">{t('player.form.photoHint')}</p>

          {rejection !== null && (
            <p role="alert" className="mt-1 text-red-700">
              {t(REJECTION_KEYS[rejection])}
            </p>
          )}

          {upload.error !== null && (
            <p role="alert" className="mt-1 text-red-700">
              {t(errorMessageKey(upload.error))}
            </p>
          )}
        </div>
      </div>
    </fieldset>
  );
}

/** Причина отказа — в текст. Тип из общего кода: новая причина ломает сборку. */
const REJECTION_KEYS: Readonly<Record<NonNullable<PhotoRejection>, MessageKey>> = {
  TYPE: 'player.form.photoType',
  SIZE: 'player.form.photoSize',
};
