import {
  FEED_PORTAL_SECTION,
  FEED_POSTS_SECTION,
  FORUM_TOPIC_TITLE_MAX,
  type ForumAuthoredAs,
} from '@kttf/shared/types';
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

import { useLocale, useT } from '@/common/i18n';
import { useSessionStore } from '@/features/auth/session-store';

import { createForumTopic } from './api';
import Composer, { WriteGate } from './composer';
import { topicHref } from './labels';
import { newsTopicInput } from './news-draft';
import { NewsEditor } from './news-versions';
import { forumKeys, forumSectionsQuery } from './queries';
import { VoicePicker } from './voice';

/**
 * Новая тема — `docs/12` 5: раздел, заголовок, первое сообщение с фото;
 * у модератора — «от чьего лица» (ADR-098), а новость KTTF — вкладками
 * языков, каждый со своими заголовком, текстом и фото (ADR-099).
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
  const isAdmin = useSessionStore((state) => state.user?.isAdmin === true);
  const uiLocale = useLocale();
  // Темы заводят в разделах с ручными темами; новости KTTF — модератор (ADR-098).
  const writable = (item: { slug: string; manualTopics: boolean }): boolean =>
    item.manualTopics || (isAdmin && item.slug === FEED_PORTAL_SECTION);
  const section = sections.data?.find((item) => item.slug === sectionSlug && writable(item));
  const titleValid = title.trim().length >= 3;
  // Новость KTTF — у модератора: вкладки языков, у каждого свои заголовок,
  // текст и фото, всё одной отправкой (ADR-099). Запись игрока — всегда своя.
  const canVoice = isAdmin && section !== undefined && section.slug !== FEED_POSTS_SECTION;
  const [voice, setVoice] = useState<ForumAuthoredAs>('SELF');

  const done = async (topicId: string): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: forumKeys.all });
    await navigate({ href: topicHref(topicId) });
  };

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
        {sections.data?.filter(writable).map((item) => (
          <MenuItem key={item.id} value={item.slug} sx={{ minHeight: 44 }}>
            {item.title}
          </MenuItem>
        ))}
      </TextField>
      {section?.slug === FEED_PORTAL_SECTION ? (
        <NewsEditor
          defaultLocale={uiLocale}
          submitLabel={t('forum.new.submit')}
          submit={async (draft) => {
            const topic = await createForumTopic(newsTopicInput(section.id, draft));

            await done(topic.id);
          }}
        />
      ) : (
        <>
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
            {canVoice && <VoicePicker value={voice} onChange={setVoice} />}
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
                  ...(canVoice ? { authoredAs: voice } : {}),
                });

                await done(topic.id);
              }}
            />
          </Box>
        </>
      )}
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
