import {
  CLUB_IMAGE_MAX_BYTES,
  FORUM_POST_BODY_MAX,
  FORUM_TOPIC_TITLE_MAX,
  rejectPhoto,
  SITE_LOCALES,
  type ForumImage,
  type ForumTopicView,
  type ForumTranslation,
  type SiteLocale,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Languages, Plus, X } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, LOCALE_NAMES, useT } from '@/common/i18n';
import RichField from '@/common/rich/rich-field';

import {
  deleteForumTranslation,
  putForumTranslation,
  setForumTopicLocale,
  uploadForumImage,
} from './api';
import { forumImageVariant } from './labels';
import { forumKeys } from './queries';

/**
 * Версии новости KTTF на языках сайта — ADR-098. Сервер отдаёт все версии
 * сразу; здесь выбирается, какую показать, и правит их модератор.
 */

/**
 * «Перевод» у новости: меню версий — «Оригинал (язык)» и остальные языки.
 * Версий нет — кнопки нет.
 */
export function NewsLanguageSwitch({
  original,
  available,
  value,
  onChange,
}: {
  readonly original: SiteLocale;
  readonly available: readonly SiteLocale[];
  readonly value: SiteLocale;
  readonly onChange: (next: SiteLocale) => void;
}): ReactNode {
  const t = useT();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (available.length === 0) return null;

  const options: readonly [SiteLocale, string][] = [
    [original, fill(t('news.lang.original'), { lang: LOCALE_NAMES[original] })],
    ...available.map((locale): [SiteLocale, string] => [locale, LOCALE_NAMES[locale]]),
  ];

  return (
    <>
      <Button
        variant="text"
        size="small"
        startIcon={<Languages size={16} aria-hidden />}
        aria-controls={anchor === null ? undefined : menuId}
        aria-haspopup="menu"
        data-news-lang={value}
        onClick={(event) => {
          setAnchor(event.currentTarget);
        }}
        sx={{ minHeight: 44, color: 'text.secondary' }}
      >
        {value === original ? t('news.lang.switch') : LOCALE_NAMES[value]}
      </Button>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => {
          setAnchor(null);
        }}
      >
        {options.map(([locale, label]) => (
          <MenuItem
            key={locale}
            selected={locale === value}
            lang={locale}
            onClick={() => {
              setAnchor(null);
              onChange(locale);
            }}
            sx={{ minHeight: 44 }}
          >
            {label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/** Язык оригинала у новой новости. */
export function NewsLocaleField({
  value,
  onChange,
}: {
  readonly value: SiteLocale;
  readonly onChange: (next: SiteLocale) => void;
}): ReactNode {
  const t = useT();

  return (
    <TextField
      select
      label={t('news.versions.originalLanguage')}
      value={value}
      onChange={(event) => {
        onChange(event.target.value as SiteLocale);
      }}
      sx={{ maxWidth: { sm: 320 } }}
      data-news-locale
    >
      {SITE_LOCALES.map((locale) => (
        <MenuItem key={locale} value={locale} sx={{ minHeight: 44 }}>
          {LOCALE_NAMES[locale]}
        </MenuItem>
      ))}
    </TextField>
  );
}

// ---------------------------------------------------------------- редактор

/**
 * «Языки новости» — у модератора на странице новости: вкладка оригинала (его
 * язык) и вкладки версий; «Добавить язык» заводит новую вкладку, версия
 * пишется кнопкой «Сохранить версию».
 */
export function NewsVersionsEditor({ topic }: { readonly topic: ForumTopicView }): ReactNode {
  const t = useT();
  const [open, setOpen] = useState(false);

  if (topic.locale === null) return null;

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<Languages size={18} aria-hidden />}
        onClick={() => {
          setOpen(true);
        }}
        sx={{ minHeight: 44 }}
        data-news-versions-open
      >
        {fill(t('news.versions.open'), { count: String(topic.translations.length + 1) })}
      </Button>
      {open && (
        <VersionsDialog
          topic={topic}
          original={topic.locale}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function VersionsDialog({
  topic,
  original,
  onClose,
}: {
  readonly topic: ForumTopicView;
  readonly original: SiteLocale;
  readonly onClose: () => void;
}): ReactNode {
  const t = useT();
  const menuId = useId();
  const saved = topic.translations.map((translation) => translation.locale);
  const [drafts, setDrafts] = useState<readonly SiteLocale[]>([]);
  const [active, setActive] = useState<SiteLocale>(original);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const tabs = [original, ...saved, ...drafts.filter((locale) => !saved.includes(locale))];
  const free = SITE_LOCALES.filter((locale) => !tabs.includes(locale));
  const current = tabs.includes(active) ? active : original;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby={`${menuId}-title`}>
      <DialogTitle id={`${menuId}-title`} sx={{ pr: 7 }}>
        {t('news.versions.title')}
        <IconButton
          aria-label={t('forum.action.cancel')}
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8, width: 44, height: 44 }}
        >
          <X size={18} aria-hidden />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderBottom: '1px solid var(--line)',
          }}
        >
          <Tabs
            value={current}
            onChange={(_, next: SiteLocale) => {
              setActive(next);
            }}
            variant="scrollable"
            aria-label={t('news.versions.title')}
            sx={{ flex: 1, minWidth: 0 }}
          >
            {tabs.map((locale) => (
              <Tab
                key={locale}
                value={locale}
                label={
                  locale === original
                    ? fill(t('news.lang.original'), { lang: LOCALE_NAMES[locale] })
                    : LOCALE_NAMES[locale]
                }
                sx={{ minHeight: 44, textTransform: 'none' }}
                data-news-tab={locale}
              />
            ))}
          </Tabs>
          {free.length > 0 && (
            <Button
              variant="text"
              startIcon={<Plus size={16} aria-hidden />}
              aria-controls={anchor === null ? undefined : menuId}
              aria-haspopup="menu"
              onClick={(event) => {
                setAnchor(event.currentTarget);
              }}
              sx={{ minHeight: 44, flexShrink: 0 }}
            >
              {t('news.versions.add')}
            </Button>
          )}
          <Menu
            id={menuId}
            anchorEl={anchor}
            open={anchor !== null}
            onClose={() => {
              setAnchor(null);
            }}
          >
            {free.map((locale) => (
              <MenuItem
                key={locale}
                lang={locale}
                onClick={() => {
                  setAnchor(null);
                  setDrafts((previous) => [...previous, locale]);
                  setActive(locale);
                }}
                sx={{ minHeight: 44 }}
              >
                {LOCALE_NAMES[locale]}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        <Box sx={{ pt: 2.5 }} role="tabpanel">
          {current === original ? (
            <OriginalPanel topic={topic} original={original} taken={saved} />
          ) : (
            <TranslationPanel
              key={current}
              topicId={topic.id}
              locale={current}
              translation={topic.translations.find((row) => row.locale === current) ?? null}
              onRemoved={() => {
                setDrafts((previous) => previous.filter((locale) => locale !== current));
                setActive(original);
              }}
            />
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

/** Оригинал: его язык. Текст и заголовок правятся в самой теме. */
function OriginalPanel({
  topic,
  original,
  taken,
}: {
  readonly topic: ForumTopicView;
  readonly original: SiteLocale;
  readonly taken: readonly SiteLocale[];
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <Box sx={{ display: 'grid', gap: 2 }} data-news-original>
      <TextField
        select
        label={t('news.versions.originalLanguage')}
        value={original}
        disabled={pending}
        onChange={(event) => {
          setPending(true);
          setError(null);
          setForumTopicLocale(topic.id, event.target.value as SiteLocale)
            .then(() => queryClient.invalidateQueries({ queryKey: forumKeys.all }))
            .catch((caught: unknown) => {
              setError(t(errorMessageKey(caught)));
            })
            .finally(() => {
              setPending(false);
            });
        }}
        sx={{ maxWidth: { sm: 320 } }}
      >
        {SITE_LOCALES.filter((locale) => !taken.includes(locale)).map((locale) => (
          <MenuItem key={locale} value={locale} sx={{ minHeight: 44 }}>
            {LOCALE_NAMES[locale]}
          </MenuItem>
        ))}
      </TextField>
      <Box>
        <Typography sx={{ fontWeight: 600 }}>{topic.title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('news.versions.originalHint')}
        </Typography>
      </Box>
      {error !== null && <Alert severity="error">{error}</Alert>}
    </Box>
  );
}

/** Версия на языке: заголовок, текст той же разметкой и обложка. */
function TranslationPanel({
  topicId,
  locale,
  translation,
  onRemoved,
}: {
  readonly topicId: string;
  readonly locale: SiteLocale;
  readonly translation: ForumTranslation | null;
  readonly onRemoved: () => void;
}): ReactNode {
  const t = useT();
  const fileId = useId();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(translation?.title ?? '');
  const [body, setBody] = useState(translation?.body ?? '');
  const [image, setImage] = useState<ForumImage | null>(translation?.image ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [tried, setTried] = useState(false);
  const titleValid = title.trim().length >= 3;
  const bodyValid = body.trim() !== '';

  const run = (work: () => Promise<unknown>, after?: () => void): void => {
    setPending(true);
    setError(null);
    setSaved(false);
    work()
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: forumKeys.all });
        after?.();
      })
      .catch((caught: unknown) => {
        setError(t(errorMessageKey(caught)));
      })
      .finally(() => {
        setPending(false);
      });
  };

  return (
    <Box
      component="form"
      noValidate
      lang={locale}
      data-news-translation={locale}
      sx={{ display: 'grid', gap: 2 }}
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!titleValid || !bodyValid || pending) return;

        run(
          () =>
            putForumTranslation(topicId, locale, {
              title: title.trim(),
              body: body.trim(),
              image,
            }),
          () => {
            setSaved(true);
          },
        );
      }}
    >
      <TextField
        label={t('news.versions.titleLabel')}
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
        }}
        required
        error={tried && !titleValid}
        helperText={tried && !titleValid ? t('forum.new.titleError') : undefined}
        slotProps={{ htmlInput: { maxLength: FORUM_TOPIC_TITLE_MAX } }}
      />
      <RichField
        value={body}
        onChange={setBody}
        label={t('news.versions.bodyLabel')}
        maxLength={FORUM_POST_BODY_MAX}
      />

      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {t('news.versions.cover')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('news.versions.coverHint')}
        </Typography>
        {image === null ? (
          <>
            <input
              id={fileId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file === undefined) return;
                if (rejectPhoto(file, CLUB_IMAGE_MAX_BYTES) !== null) {
                  setError(t('forum.composer.badImage'));
                  return;
                }
                setPending(true);
                setError(null);
                uploadForumImage(file)
                  .then((uploaded) => {
                    setImage(uploaded);
                  })
                  .catch((caught: unknown) => {
                    setError(t(errorMessageKey(caught)));
                  })
                  .finally(() => {
                    setPending(false);
                  });
              }}
            />
            <Button
              variant="text"
              component="label"
              htmlFor={fileId}
              disabled={pending}
              startIcon={<ImagePlus size={18} aria-hidden />}
              sx={{ minHeight: 44 }}
            >
              {t('news.versions.coverAdd')}
            </Button>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }} data-news-cover>
            <Box
              component="img"
              src={forumImageVariant(image.url, 480)}
              alt=""
              width={160}
              height={90}
              sx={{ width: 160, height: 90, objectFit: 'cover', borderRadius: 2 }}
            />
            <Button
              variant="text"
              onClick={() => {
                setImage(null);
              }}
              sx={{ minHeight: 44 }}
            >
              {t('news.versions.coverRemove')}
            </Button>
          </Box>
        )}
      </Box>

      {error !== null && <Alert severity="error">{error}</Alert>}
      {saved && error === null && (
        <Alert severity="success" icon={false}>
          {t('news.versions.saved')}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'space-between' }}>
        {translation === null ? (
          <Button variant="text" onClick={onRemoved} sx={{ minHeight: 44 }}>
            {t('forum.action.cancel')}
          </Button>
        ) : (
          <Button
            variant="text"
            color="error"
            disabled={pending}
            onClick={() => {
              run(() => deleteForumTranslation(topicId, locale), onRemoved);
            }}
            sx={{ minHeight: 44 }}
          >
            {t('news.versions.delete')}
          </Button>
        )}
        <Button type="submit" variant="contained" disabled={pending} sx={{ minHeight: 44 }}>
          {pending ? t('common.loading') : t('news.versions.save')}
        </Button>
      </Box>
    </Box>
  );
}
