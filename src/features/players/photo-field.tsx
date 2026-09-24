import { PHOTO_CONTENT_TYPES, rejectPhoto, type PhotoRejection } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { useState, type ChangeEvent, type ReactNode } from 'react';

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
    <Box
      component="fieldset"
      sx={{ m: 0, p: 0, pt: 2, border: 0, borderTop: 1, borderColor: 'divider', minWidth: 0 }}
    >
      <Typography component="legend" variant="h4" sx={{ p: 0, mb: 1.5 }}>
        {t('player.form.photo')}
      </Typography>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        {/* Без фото — подпись словами внутри круга, а не пустое место. */}
        <Avatar
          {...(value === null ? {} : { src: value })}
          alt=""
          sx={{
            width: 80,
            height: 80,
            fontSize: 12,
            textAlign: 'center',
            bgcolor: 'action.hover',
            color: 'text.secondary',
          }}
        >
          {t('player.form.noPhoto')}
        </Avatar>

        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Button
              component="label"
              size="small"
              loading={upload.isPending}
              sx={{ minHeight: { xs: 44, sm: 32 } }}
            >
              {t('player.form.photoChoose')}
              <Box
                component="input"
                type="file"
                accept={PHOTO_CONTENT_TYPES.join(',')}
                sx={VISUALLY_HIDDEN}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
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
            </Button>

            {value !== null && (
              <Button
                variant="text"
                size="small"
                sx={{ minHeight: { xs: 44, sm: 32 } }}
                onClick={() => {
                  setRejection(null);
                  onChange(null);
                }}
              >
                {t('player.form.photoRemove')}
              </Button>
            )}
          </Stack>

          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
            {t('player.form.photoHint')}
          </Typography>

          {rejection !== null && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {t(REJECTION_KEYS[rejection])}
            </Alert>
          )}

          {upload.error !== null && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {t(errorMessageKey(upload.error))}
            </Alert>
          )}
        </Box>
      </Stack>
    </Box>
  );
}

/** Поле файла прячется от глаз, но не от клавиатуры и чтения с экрана. */
const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
} as const;

/** Причина отказа — в текст. Тип из общего кода: новая причина ломает сборку. */
const REJECTION_KEYS: Readonly<Record<NonNullable<PhotoRejection>, MessageKey>> = {
  TYPE: 'player.form.photoType',
  SIZE: 'player.form.photoSize',
};
