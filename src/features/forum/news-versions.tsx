import {
  CLUB_IMAGE_MAX_BYTES,
  DEFAULT_NEWS_LOCALE,
  FORUM_POST_BODY_MAX,
  FORUM_POST_IMAGES_MAX,
  FORUM_TOPIC_TITLE_MAX,
  rejectPhoto,
  SITE_LOCALES,
  type ForumAuthoredAs,
  type ForumImage,
  type SiteLocale,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ImagePlus, Languages, Plus, X } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, LOCALE_NAMES, useT } from '@/common/i18n';
import RichField from '@/common/rich/rich-field';

import { uploadForumImage } from './api';
import { forumImageVariant } from './labels';
import {
  EMPTY_PAGE,
  pageValid,
  trimPage,
  type NewsDraft,
  type NewsPage,
  type NewsVersion,
} from './news-draft';
import { VoicePicker } from './voice';

/**
 * Версии новости KTTF на языках сайта — ADR-098, ADR-099. Сервер отдаёт все
 * версии сразу; здесь выбирается, какую показать, а модератор пишет новость
 * сразу на нескольких языках — вкладками в одной форме.
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

/** Язык оригинала — кроме языков, на которых уже есть версии. */
function NewsLocaleField({
  value,
  exclude,
  onChange,
}: {
  readonly value: SiteLocale;
  readonly exclude: readonly SiteLocale[];
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
      {SITE_LOCALES.filter((locale) => !exclude.includes(locale)).map((locale) => (
        <MenuItem key={locale} value={locale} sx={{ minHeight: 44 }}>
          {LOCALE_NAMES[locale]}
        </MenuItem>
      ))}
    </TextField>
  );
}

// ---------------------------------------------------------------- редактор (ADR-099)

/**
 * Редактор новости KTTF — ADR-099. Вкладки по языкам: оригинал (его язык,
 * голос) и версии; «Добавить язык» заводит вкладку из свободных языков
 * сайта, у версии — «Убрать язык». У каждой вкладки свои заголовок, текст и
 * до `FORUM_POST_IMAGES_MAX` фото. Одна кнопка отправляет всё сразу; пустая
 * вкладка — переход к ней и подсказка.
 */
export function NewsEditor({
  initial,
  defaultLocale,
  submitLabel,
  submit,
  onCancel,
  onDone,
  validate,
}: {
  /** Новость для правки; без неё — новая. */
  readonly initial?: NewsDraft;
  /** Язык оригинала новой новости. */
  readonly defaultLocale?: SiteLocale;
  readonly submitLabel: string;
  readonly submit: (draft: NewsDraft) => Promise<unknown>;
  readonly onCancel?: () => void;
  readonly onDone?: () => void;
  /** Поля вокруг редактора (раздел): `false` — не отправлять. */
  readonly validate?: () => boolean;
}): ReactNode {
  const t = useT();
  const menuId = useId();
  const [locale, setLocale] = useState<SiteLocale>(
    initial?.locale ?? defaultLocale ?? DEFAULT_NEWS_LOCALE,
  );
  const [voice, setVoice] = useState<ForumAuthoredAs>(initial?.authoredAs ?? 'KTTF');
  const [original, setOriginal] = useState<NewsPage>(
    initial === undefined
      ? EMPTY_PAGE
      : { title: initial.title, body: initial.body, images: initial.images },
  );
  const [versions, setVersions] = useState<readonly NewsVersion[]>(initial?.translations ?? []);
  // Вкладка: `null` — оригинал, иначе язык версии.
  const [active, setActive] = useState<SiteLocale | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [tried, setTried] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taken = versions.map((version) => version.locale);
  const free = SITE_LOCALES.filter((option) => option !== locale && !taken.includes(option));
  const current = active !== null && taken.includes(active) ? active : null;
  const page = current === null ? original : versions.find((row) => row.locale === current);

  /** Правка страницы по языку: загрузка фото дописывает туда, где начата. */
  const update = (target: SiteLocale | null, change: (previous: NewsPage) => NewsPage): void => {
    if (target === null) setOriginal(change);
    else {
      setVersions((previous) =>
        previous.map((row) => (row.locale === target ? { ...row, ...change(row) } : row)),
      );
    }
  };

  const tabLabel = (target: SiteLocale | null): ReactNode => {
    const invalid =
      tried &&
      !pageValid(
        target === null ? original : (versions.find((row) => row.locale === target) ?? original),
      );

    return (
      <Box
        component="span"
        sx={{ color: invalid ? 'error.main' : undefined }}
        data-news-tab-invalid={invalid || undefined}
      >
        {target === null
          ? fill(t('news.lang.original'), { lang: LOCALE_NAMES[locale] })
          : LOCALE_NAMES[target]}
      </Box>
    );
  };

  return (
    <Box
      component="form"
      noValidate
      data-news-editor
      onSubmit={(event) => {
        event.preventDefault();
        if (pending || uploads > 0) return;

        setTried(true);
        setError(null);
        const outside = validate === undefined || validate();
        const broken = [
          ...(pageValid(original) ? [] : [null]),
          ...versions.filter((row) => !pageValid(row)).map((row) => row.locale),
        ];

        if (broken.length > 0) {
          setActive(broken[0] ?? null);
          setError(t('news.versions.invalid'));
          return;
        }
        if (!outside) return;

        setPending(true);
        submit({
          ...trimPage(original),
          locale,
          authoredAs: voice,
          translations: versions.map((row) => trimPage(row)),
        })
          .then(() => {
            onDone?.();
          })
          .catch((caught: unknown) => {
            setError(t(errorMessageKey(caught)));
          })
          .finally(() => {
            setPending(false);
          });
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid var(--line)',
        }}
      >
        <Tabs
          value={current ?? 'original'}
          onChange={(_, next: string) => {
            setActive(next === 'original' ? null : (next as SiteLocale));
          }}
          variant="scrollable"
          aria-label={t('news.versions.title')}
          sx={{ flex: 1, minWidth: 0 }}
        >
          <Tab
            value="original"
            label={tabLabel(null)}
            sx={{ minHeight: 44, textTransform: 'none' }}
            data-news-tab={locale}
          />
          {versions.map((row) => (
            <Tab
              key={row.locale}
              value={row.locale}
              label={tabLabel(row.locale)}
              sx={{ minHeight: 44, textTransform: 'none' }}
              data-news-tab={row.locale}
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
            data-news-add
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
          {free.map((option) => (
            <MenuItem
              key={option}
              lang={option}
              onClick={() => {
                setAnchor(null);
                setVersions((previous) => [...previous, { locale: option, ...EMPTY_PAGE }]);
                setActive(option);
              }}
              sx={{ minHeight: 44 }}
            >
              {LOCALE_NAMES[option]}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      <Box
        role="tabpanel"
        lang={current ?? locale}
        data-news-panel={current ?? locale}
        sx={{ pt: 2.5, display: 'grid', gap: 2 }}
      >
        {current === null && (
          <>
            <NewsLocaleField value={locale} exclude={taken} onChange={setLocale} />
            <VoicePicker value={voice} onChange={setVoice} />
          </>
        )}
        <TextField
          // Своё поле у каждой вкладки: значение не перетекает между языками.
          key={`title-${current ?? 'original'}`}
          label={t('news.versions.titleLabel')}
          value={page?.title ?? ''}
          onChange={(event) => {
            const title = event.target.value;
            update(current, (previous) => ({ ...previous, title }));
          }}
          required
          error={tried && (page?.title.trim().length ?? 0) < 3}
          helperText={
            tried && (page?.title.trim().length ?? 0) < 3 ? t('forum.new.titleError') : undefined
          }
          slotProps={{ htmlInput: { maxLength: FORUM_TOPIC_TITLE_MAX } }}
        />
        <RichField
          key={`body-${current ?? 'original'}`}
          value={page?.body ?? ''}
          onChange={(body) => {
            update(current, (previous) => ({ ...previous, body }));
          }}
          label={t('news.versions.bodyLabel')}
          maxLength={FORUM_POST_BODY_MAX}
        />
        <NewsPhotos
          key={`photos-${current ?? 'original'}`}
          images={page?.images ?? []}
          hint={current === null ? null : t('news.versions.photosHint')}
          onChange={(change) => {
            update(current, (previous) => ({ ...previous, images: change(previous.images) }));
          }}
          onBusy={(delta) => {
            setUploads((count) => count + delta);
          }}
          onError={setError}
        />
        {current !== null && (
          <Box>
            <Button
              variant="text"
              color="error"
              startIcon={<X size={16} aria-hidden />}
              onClick={() => {
                setVersions((previous) => previous.filter((row) => row.locale !== current));
                setActive(null);
              }}
              sx={{ minHeight: 44 }}
            >
              {t('news.versions.remove')}
            </Button>
          </Box>
        )}
      </Box>

      {error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end' }}>
        {onCancel !== undefined && (
          <Button variant="text" onClick={onCancel} sx={{ minHeight: 44 }}>
            {t('forum.action.cancel')}
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={pending || uploads > 0}
          sx={{ minHeight: 44 }}
        >
          {pending ? t('common.loading') : submitLabel}
        </Button>
      </Box>
    </Box>
  );
}

/**
 * Фото вкладки — до `FORUM_POST_IMAGES_MAX`, по порядку загрузки, как в поле
 * сообщения. Правка — функцией от прежнего списка: загрузка дописывает фото
 * во вкладку, где её начали, даже если человек уже перешёл на другую.
 */
function NewsPhotos({
  images,
  hint,
  onChange,
  onBusy,
  onError,
}: {
  readonly images: readonly ForumImage[];
  readonly hint: string | null;
  readonly onChange: (change: (previous: readonly ForumImage[]) => readonly ForumImage[]) => void;
  readonly onBusy: (delta: number) => void;
  readonly onError: (message: string) => void;
}): ReactNode {
  const t = useT();
  const fileId = useId();
  const [uploading, setUploading] = useState(false);

  const add = async (files: readonly File[]): Promise<void> => {
    const picked = files.slice(0, FORUM_POST_IMAGES_MAX - images.length);

    if (picked.length === 0) return;

    setUploading(true);
    onBusy(1);

    try {
      for (const file of picked) {
        if (rejectPhoto(file, CLUB_IMAGE_MAX_BYTES) !== null) {
          onError(t('forum.composer.badImage'));
          continue;
        }

        const uploaded = await uploadForumImage(file);

        onChange((previous) =>
          previous.length >= FORUM_POST_IMAGES_MAX ? previous : [...previous, uploaded],
        );
      }
    } catch (caught) {
      onError(t(errorMessageKey(caught)));
    } finally {
      setUploading(false);
      onBusy(-1);
    }
  };

  return (
    <Box data-news-photos>
      {hint !== null && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {hint}
        </Typography>
      )}
      {images.length > 0 && (
        <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }} data-forum-draft-images>
          {images.map((image) => (
            <Box
              key={image.url}
              sx={{
                position: 'relative',
                width: 88,
                height: 88,
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'var(--ink-100)',
              }}
            >
              <Box
                component="img"
                src={forumImageVariant(image.url, 480)}
                alt=""
                width={88}
                height={88}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <IconButton
                aria-label={t('forum.composer.removeImage')}
                onClick={() => {
                  onChange((previous) => previous.filter((item) => item.url !== image.url));
                }}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  bgcolor: 'rgb(31 31 29 / 0.6)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgb(31 31 29 / 0.8)' },
                }}
              >
                <X size={14} aria-hidden />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
      <input
        id={fileId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = '';
          void add(files);
        }}
      />
      <Button
        variant="text"
        component="label"
        htmlFor={fileId}
        disabled={uploading || images.length >= FORUM_POST_IMAGES_MAX}
        startIcon={<ImagePlus size={18} aria-hidden />}
        sx={{ minHeight: 44, ml: -1 }}
      >
        {uploading
          ? t('common.loading')
          : fill(t('forum.composer.addImage'), {
              count: String(images.length),
              max: String(FORUM_POST_IMAGES_MAX),
            })}
      </Button>
    </Box>
  );
}
