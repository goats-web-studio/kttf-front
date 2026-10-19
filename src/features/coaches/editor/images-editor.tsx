import {
  CLUB_IMAGE_MAX_BYTES,
  coachImageVariant,
  rejectPhoto,
  type CoachImageKind,
  type CoachView,
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
import PlayerAvatar from '@/common/ui/player-avatar';
import EditorSection from '@/features/clubs/page-editor/editor-section';

import { updateCoach, uploadCoachImage } from '../api';
import { coachPhoto } from '../labels';
import { coachKeys } from '../queries';

/**
 * Фото и обложка тренера — как логотип и обложка клуба (ADR-055): картинка
 * сохраняется сразу после загрузки. Без своего фото на странице — фото из
 * профиля игрока.
 */
export default function CoachImagesEditor({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();

  return (
    <EditorSection title={t('coach.editor.images')} lead={t('coach.editor.imagesHint')}>
      <Box sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' } }}>
        <ImageField coach={coach} kind="photo" />
        <ImageField coach={coach} kind="cover" />
      </Box>
    </EditorSection>
  );
}

function ImageField({
  coach,
  kind,
}: {
  readonly coach: CoachView;
  readonly kind: CoachImageKind;
}): ReactNode {
  const t = useT();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [rejected, setRejected] = useState<MessageKey | null>(null);
  const field = kind === 'photo' ? 'photoUrl' : 'coverUrl';
  const current = coach[field];

  const save = useMutation({
    mutationFn: async (file: File | null) => {
      const url = file === null ? null : (await uploadCoachImage(coach.id, file)).url;

      return updateCoach(coach.id, { [field]: url });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: coachKeys.all });
    },
  });

  return (
    <Box>
      <Typography sx={{ fontWeight: 600, mb: 1 }} id={`${id}-label`}>
        {t(kind === 'photo' ? 'coach.editor.photo' : 'manage.page.cover')}
      </Typography>
      {kind === 'photo' ? (
        <PlayerAvatar
          lastName={coach.player.lastName}
          firstName={coach.player.firstName}
          photoUrl={coachPhoto(coach)}
          size="xl"
        />
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
          src={coachImageVariant(current, 960)}
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
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {t(kind === 'photo' ? 'coach.editor.photoHint' : 'coach.editor.coverHint')}
      </Typography>
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
            variant="text"
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
