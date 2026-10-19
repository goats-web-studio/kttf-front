import {
  CLUB_IMAGE_MAX_BYTES,
  clubImageVariant,
  rejectPhoto,
  type ClubImageKind,
  type ClubView,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';

import { updateClub, uploadClubImage } from '../api';
import ClubMark from '../club-mark';
import { clubKeys } from '../queries';
import EditorSection from './editor-section';

/**
 * Логотип и обложка — ADR-055. Картинка сохраняется сразу после загрузки:
 * человек выбрал файл и видит его на месте, вторая кнопка «сохранить» тут
 * ничего не добавляет. Правило приёма — общее с сервером (`rejectPhoto`):
 * форма отказывает тому же файлу и не ждёт десять мегабайт по Wi-Fi зала.
 */
export default function ImagesEditor({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();

  return (
    <EditorSection title={t('manage.page.images')} lead={t('manage.page.imageHint')}>
      <Box sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' } }}>
        <ImageField club={club} kind="logo" />
        <ImageField club={club} kind="cover" />
      </Box>
    </EditorSection>
  );
}

function ImageField({
  club,
  kind,
}: {
  readonly club: ClubView;
  readonly kind: ClubImageKind;
}): ReactNode {
  const t = useT();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [rejected, setRejected] = useState<MessageKey | null>(null);
  const field = kind === 'logo' ? 'logoUrl' : 'coverUrl';
  const current = club[field];

  const save = useMutation({
    mutationFn: async (file: File | null) => {
      const url = file === null ? null : (await uploadClubImage(club.id, file)).url;

      return updateClub(club.id, { [field]: url });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clubKeys.all });
    },
  });

  return (
    <Box>
      <Typography sx={{ fontWeight: 600, mb: 1 }} id={`${id}-label`}>
        {t(kind === 'logo' ? 'manage.page.logo' : 'manage.page.cover')}
      </Typography>
      {kind === 'logo' ? (
        <ClubMark club={club} size={96} />
      ) : current === null ? (
        <Box
          sx={{
            aspectRatio: '21 / 6',
            borderRadius: 3,
            border: '1px dashed var(--line-strong)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink-500)',
          }}
        >
          <ImagePlus size={28} aria-hidden />
        </Box>
      ) : (
        <Box
          component="img"
          src={clubImageVariant(current, 960)}
          alt=""
          sx={{
            display: 'block',
            width: '100%',
            aspectRatio: '21 / 6',
            objectFit: 'cover',
            borderRadius: 3,
          }}
        />
      )}
      {kind === 'cover' && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('manage.page.coverHint')}
        </Typography>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        aria-labelledby={`${id}-label`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';

          if (file === undefined) return;

          const rejection = rejectPhoto(file, CLUB_IMAGE_MAX_BYTES);

          if (rejection !== null) {
            setRejected(rejection === 'SIZE' ? 'manage.page.imageTooBig' : 'manage.page.imageType');
            return;
          }

          setRejected(null);
          save.mutate(file);
        }}
      />
      <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant="outlined"
          disabled={save.isPending}
          onClick={() => input.current?.click()}
          sx={{ minHeight: 44 }}
        >
          {save.isPending
            ? t('manage.page.uploading')
            : t(current === null ? 'manage.page.upload' : 'manage.page.replace')}
        </Button>
        {current !== null && (
          <Button
            disabled={save.isPending}
            onClick={() => {
              save.mutate(null);
            }}
            sx={{ minHeight: 44 }}
          >
            {t('manage.page.remove')}
          </Button>
        )}
      </Box>
      {rejected !== null && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {t(rejected)}
        </Alert>
      )}
      {save.error !== null && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {t(errorMessageKey(save.error))}
        </Alert>
      )}
    </Box>
  );
}
