import { FORUM_TOPIC_TITLE_MAX } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { createForumTopic } from './api';
import Composer, { WriteGate } from './composer';
import { topicHref } from './labels';
import { forumKeys, forumSectionsQuery } from './queries';

/**
 * Новая тема — `docs/12` 5: раздел, заголовок, первое сообщение с фото.
 * Одна форма на страницу `/forum/new` и на окно «Новая тема» у форума:
 * раздел приходит оттуда, где человек нажал кнопку. Создалась тема —
 * переход в неё.
 */
export default function NewTopicForm({
  initialSection,
}: {
  /** Адрес раздела, в котором нажали «Новая тема». */
  readonly initialSection?: string | undefined;
}): ReactNode {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sections = useQuery(forumSectionsQuery);
  const [sectionSlug, setSectionSlug] = useState(initialSection ?? '');
  const [title, setTitle] = useState('');
  const [tried, setTried] = useState(false);
  const section = sections.data?.find((item) => item.slug === sectionSlug && item.manualTopics);
  const titleValid = title.trim().length >= 3;

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <TextField
        select
        label={t('forum.new.section')}
        value={section === undefined ? '' : sectionSlug}
        onChange={(event) => {
          setSectionSlug(event.target.value);
        }}
        required
        error={tried && section === undefined}
        sx={{ maxWidth: { sm: 360 } }}
        data-forum-new-section
      >
        {sections.data === undefined && (
          <MenuItem value="" disabled>
            {t('common.loading')}
          </MenuItem>
        )}
        {sections.data
          ?.filter((item) => item.manualTopics)
          .map((item) => (
            <MenuItem key={item.id} value={item.slug} sx={{ minHeight: 44 }}>
              {item.title}
            </MenuItem>
          ))}
      </TextField>
      <TextField
        label={t('forum.new.titleLabel')}
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
        }}
        required
        error={tried && !titleValid}
        helperText={tried && !titleValid ? t('forum.new.titleError') : t('forum.new.titleHint')}
        slotProps={{ htmlInput: { maxLength: FORUM_TOPIC_TITLE_MAX } }}
      />
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('forum.new.bodyHint')}
        </Typography>
        <Composer
          submitLabel={t('forum.new.submit')}
          validate={() => {
            setTried(true);

            return section !== undefined && titleValid;
          }}
          submit={async (input) => {
            if (section === undefined) return;

            const topic = await createForumTopic({
              sectionId: section.id,
              title: title.trim(),
              body: input.body,
              ...(input.images === undefined ? {} : { images: input.images }),
            });

            await queryClient.invalidateQueries({ queryKey: forumKeys.all });
            await navigate({ href: topicHref(topic.id) });
          }}
        />
      </Box>
    </Box>
  );
}

/**
 * «Новая тема» прямо на странице форума: окно поверх списка тем, на
 * телефоне — во весь экран. Раздел — тот, где нажали кнопку. Гостю,
 * человеку без профиля игрока и тому, кому запрещено писать, окно
 * объясняет, что сделать, — как форма в теме.
 */
export function NewTopicDialog({
  open,
  section,
  onClose,
}: {
  readonly open: boolean;
  readonly section?: string | undefined;
  readonly onClose: () => void;
}): ReactNode {
  const t = useT();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={phone}
      fullWidth
      maxWidth="md"
      aria-labelledby={titleId}
      data-forum-new-dialog
    >
      <DialogTitle
        id={titleId}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1.5 }}
        component="h2"
      >
        <Box component="span" sx={{ flex: 1 }}>
          {t('forum.newTopic')}
        </Box>
        <IconButton
          aria-label={t('forum.action.cancel')}
          onClick={onClose}
          sx={{ width: 44, height: 44, color: 'text.secondary' }}
        >
          <X size={20} aria-hidden />
        </IconButton>
      </DialogTitle>
      {/* Под заголовком окна MUI снимает отступ — у поля раздела обрезалась бы подпись. */}
      <DialogContent sx={{ '.MuiDialogTitle-root + &': { pt: 1 }, pb: 3 }}>
        <WriteGate>
          {/* Окно закрыли — форма собирается заново: раздел снова тот, где нажали. */}
          {open && <NewTopicForm initialSection={section} />}
        </WriteGate>
      </DialogContent>
    </Dialog>
  );
}
