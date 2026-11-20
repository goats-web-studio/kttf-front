import {
  clubImageVariant,
  coachImageVariant,
  type FeedAchievementItem,
  type FeedForumItem,
  type FeedItem,
  type FeedPostItem,
  type FeedResultItem,
  type FeedTopicItem,
  type FeedTournamentItem,
  type ForumTopicView,
  type SiteLocale,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Eye, Heart, MessageSquare, Pin, TrendingUp, Trophy } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import {
  fill,
  formatCount,
  formatDate,
  formatRating,
  formatTime,
  useLocale,
  useT,
  type MessageKey,
} from '@/common/i18n';
import RichText from '@/common/rich/rich-text';
import { LEVEL_NAME } from '@/common/ui/level-name';
import PhotoViewer from '@/common/ui/photo-viewer';
import PlayerAvatar from '@/common/ui/player-avatar';
import { forumImageVariant, sectionHref, splitName, topicHref } from '@/features/forum/labels';
import LikeButton from '@/features/forum/like-button';
import { useNewsLocale } from '@/features/forum/news-locale';
import { forumTopicQuery } from '@/features/forum/queries';
import { NewsLanguageSwitch } from '@/features/forum/news-versions';
import { CoauthorLine } from '@/features/forum/voice';

import { sourceHref } from './labels';
import { SourceMark } from './source-mark';
import { formatAgo } from './time';

const MEDAL = ['var(--gold)', 'var(--silver)', 'var(--bronze)'] as const;
const MEDAL_KEYS: readonly MessageKey[] = ['feed.medal.1', 'feed.medal.2', 'feed.medal.3'];

/** Фото записи клуба или тренера — узкий вариант своей папки (ADR-055, ADR-059). */
function postImage(url: string): string {
  return url.includes('/coach') ? coachImageVariant(url, 960) : clubImageVariant(url, 960);
}

/**
 * Карточка ленты — ADR-073.
 *
 * Одна схема на все типы: шапка «кто · что · когда», содержимое, подвал с
 * обсуждением. Глаз учит её на первой карточке и дальше читает только
 * содержимое. Цвет — только у акции и медали: остальное на чернилах.
 */
export default function FeedCard({
  item,
  also = [],
  actions,
}: {
  readonly item: FeedItem;
  /** Следующие достижения того же игрока — одной карточкой (`foldAchievements`). */
  readonly also?: readonly FeedAchievementItem[];
  /** Кнопки владельца или администратора — справа в шапке карточки. */
  readonly actions?: ReactNode;
}): ReactNode {
  return (
    <Paper
      variant="outlined"
      component="article"
      data-feed-item={item.type}
      sx={{ p: { xs: 2, sm: 2.5 }, overflow: 'hidden' }}
    >
      <CardHead item={item} actions={actions} />
      <Box sx={{ mt: 1.5 }}>
        {item.type === 'POST' && <PostBody item={item} />}
        {(item.type === 'PORTAL' || item.type === 'PLAYER_POST') && <TopicBody item={item} />}
        {item.type === 'FORUM' && <ForumBody item={item} />}
        {item.type === 'TOURNAMENT' && <TournamentBody item={item} />}
        {item.type === 'RESULT' && <ResultBody item={item} />}
        {item.type === 'ACHIEVEMENT' && (
          <Stack spacing={1.5}>
            {[item, ...also].map((entry) => (
              <AchievementBody key={entry.id} item={entry} />
            ))}
          </Stack>
        )}
      </Box>
      {item.discussion !== null && <CardFoot discussion={item.discussion} />}
    </Paper>
  );
}

const TAG_KEYS: Readonly<Record<FeedItem['type'], MessageKey>> = {
  POST: 'feed.tag.news',
  PORTAL: 'feed.tag.portal',
  PLAYER_POST: 'feed.tag.playerPost',
  FORUM: 'feed.tag.forum',
  TOURNAMENT: 'feed.tag.tournament',
  RESULT: 'feed.tag.result',
  ACHIEVEMENT: 'feed.tag.achievement',
};

function CardHead({
  item,
  actions,
}: {
  readonly item: FeedItem;
  readonly actions: ReactNode;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const href = sourceHref(item.source);
  const promo = item.type === 'POST' && item.kind === 'PROMO';

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
      <SourceMark source={item.source} />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        {href === null ? (
          <Typography sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap>
            {item.source.name}
          </Typography>
        ) : (
          <Link
            href={href}
            color="inherit"
            underline="hover"
            noWrap
            sx={{ display: 'block', fontWeight: 700, lineHeight: 1.25 }}
          >
            {item.source.name}
          </Link>
        )}
        <Typography variant="caption" color="text.secondary" component="p" noWrap>
          {t(promo ? 'feed.tag.promo' : TAG_KEYS[item.type])} · {formatAgo(item.at, locale)}
          {item.pinned && ` · ${t('feed.pinned')}`}
          {item.hidden && ` · ${t('feed.hidden')}`}
        </Typography>
      </Box>
      {item.pinned && (
        <Pin size={16} aria-hidden style={{ flexShrink: 0, color: 'var(--red-600)' }} />
      )}
      {actions}
    </Stack>
  );
}

function Title({
  children,
  href,
}: {
  readonly children: ReactNode;
  readonly href?: string | undefined;
}) {
  const sx = { fontSize: 18, lineHeight: '24px', fontWeight: 700 } as const;

  return href === undefined ? (
    <Typography component="h3" sx={sx}>
      {children}
    </Typography>
  ) : (
    <Typography component="h3" sx={sx}>
      <Link href={href} color="inherit" underline="hover">
        {children}
      </Link>
    </Typography>
  );
}

/**
 * Текст записи — первые четыре строки. Длиннее — «Показать ещё»
 * раскрывает его здесь же, без перехода: целиком, как в теме, с разметкой,
 * отметками и ссылками (ADR-076), а не только начало из карточки.
 *
 * В карточке — начало до `FEED_EXCERPT_MAX` знаков без разметки. Полный
 * текст — первое сообщение темы обсуждения; его спрашивают, только когда
 * раскрыли. Новость KTTF — в той версии, что выбрана в карточке (ADR-098).
 * Темы нет или она не ответила — раскрывается начало, как раньше.
 *
 * Длинный ли текст, решает сама вёрстка — обрезано ли что-то по высоте, —
 * и сервер: начало с многоточием на конце уже обрезано им.
 */
function Excerpt({
  text,
  topicId = null,
  locale = null,
}: {
  readonly text: string;
  /** Тема обсуждения записи — в ней полный текст. */
  readonly topicId?: string | null;
  /** Версия новости KTTF, выбранная в карточке; `null` — оригинал. */
  readonly locale?: SiteLocale | null;
}): ReactNode {
  const t = useT();
  const ref = useRef<HTMLParagraphElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  const cut = text.endsWith('…');
  const topic = useQuery({
    ...forumTopicQuery(topicId ?? ''),
    enabled: open && topicId !== null,
  });
  const full = open ? fullBody(topic.data, locale) : null;
  const loading = open && topicId !== null && topic.isPending;

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null || open) return undefined;

    const measure = (): void => {
      setLong(element.scrollHeight > element.clientHeight + 1);
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [text, open]);

  const textSx = { mt: 0.75, color: 'var(--ink-700)', overflowWrap: 'anywhere' } as const;

  return (
    <Box ref={top} sx={{ scrollMarginTop: 96 }}>
      {full === null ? (
        <Typography
          ref={ref}
          data-feed-excerpt={open ? 'open' : 'clamped'}
          aria-busy={loading}
          sx={{
            ...textSx,
            whiteSpace: 'pre-line',
            ...(open
              ? {}
              : {
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }),
          }}
        >
          {text}
        </Typography>
      ) : (
        <RichText text={full} sx={textSx} data-feed-excerpt="full" />
      )}
      {(long || cut || open) && (
        <Button
          variant="text"
          size="small"
          aria-expanded={open}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
          onClick={() => {
            if (open) {
              // Свёрнутый длинный текст оставил бы читателя далеко под
              // карточкой — возвращаем её начало в окно.
              const box = top.current;
              if (box !== null && box.getBoundingClientRect().top < 0) {
                box.scrollIntoView({ block: 'start' });
              }
            }
            setOpen((value) => !value);
          }}
          sx={{ mt: 0.25, ml: -1, px: 1, minHeight: 44, fontWeight: 600 }}
        >
          {t(loading ? 'common.loading' : open ? 'feed.excerpt.less' : 'feed.excerpt.more')}
        </Button>
      )}
    </Box>
  );
}

/**
 * Полный текст записи из темы: версия на выбранном языке, если она есть,
 * иначе первое сообщение. Темы нет или первого сообщения не видно — `null`.
 */
function fullBody(topic: ForumTopicView | undefined, locale: SiteLocale | null): string | null {
  if (topic?.firstPost == null) return null;

  const version =
    locale === null || locale === topic.locale
      ? undefined
      : topic.translations.find((row) => row.locale === locale);

  return version?.body ?? topic.firstPost.body;
}

interface CardPhoto {
  /** Вариант под карточку. */
  readonly thumb: string;
  /** Целиком — в окне просмотра. */
  readonly full: string;
}

/**
 * Фото записи: первое крупно, остальные — под ним по три. Нажатие открывает
 * фото целиком поверх ленты, со стрелками между фото записи.
 */
function CardPhotos({
  photos,
  title,
}: {
  readonly photos: readonly CardPhoto[];
  /** Название окна просмотра — заголовок записи. */
  readonly title: string;
}): ReactNode {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  const [first, ...rest] = photos;

  if (first === undefined) return null;

  const button = (index: number, children: ReactNode, sx: object): ReactNode => (
    <ButtonBase
      key={photos[index]?.full}
      onClick={() => {
        setOpen(index);
      }}
      aria-label={
        photos.length > 1
          ? `${t('feed.image.open')} ${String(index + 1)} / ${String(photos.length)}`
          : t('feed.image.open')
      }
      aria-haspopup="dialog"
      data-feed-photo={index}
      sx={{
        display: 'block',
        width: '100%',
        overflow: 'hidden',
        cursor: 'zoom-in',
        bgcolor: 'var(--paper-sunken)',
        ...sx,
      }}
    >
      {children}
    </ButtonBase>
  );

  return (
    <>
      {button(
        0,
        <Box
          component="img"
          src={first.thumb}
          alt=""
          loading="lazy"
          sx={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
        />,
        { mt: 1.5, borderRadius: 2 },
      )}
      {rest.length > 0 && (
        <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
          {rest.map((photo, index) =>
            button(
              index + 1,
              <Box
                component="img"
                src={photo.thumb}
                alt=""
                loading="lazy"
                sx={{ display: 'block', width: '100%', aspectRatio: '1', objectFit: 'cover' }}
              />,
              { borderRadius: 1.5 },
            ),
          )}
        </Box>
      )}
      <PhotoViewer
        photos={photos.map((photo) => ({ src: photo.full, alt: '' }))}
        index={open}
        onIndex={setOpen}
        onClose={() => {
          setOpen(null);
        }}
        label={title}
      />
    </>
  );
}

function PostBody({ item }: { readonly item: FeedPostItem }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const href = item.discussion === null ? undefined : topicHref(item.discussion.topicId);

  return (
    <>
      {item.kind === 'PROMO' && item.validUntil !== null && (
        <Box
          component="span"
          sx={{
            display: 'inline-block',
            mb: 1,
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: 'var(--red-50)',
            color: 'var(--red-700)',
            typography: 'caption',
            fontWeight: 700,
          }}
        >
          {fill(t('feed.promo.until'), { date: formatDate(item.validUntil, locale) })}
        </Box>
      )}
      <Title href={href}>{item.title}</Title>
      <Excerpt text={item.excerpt} topicId={item.discussion?.topicId ?? null} />
      {item.imageUrl !== null && (
        <CardPhotos
          photos={[{ thumb: postImage(item.imageUrl), full: item.imageUrl }]}
          title={item.title}
        />
      )}
    </>
  );
}

function TopicBody({ item }: { readonly item: FeedTopicItem }): ReactNode {
  const uiLocale = useLocale();
  const href = item.discussion === null ? undefined : topicHref(item.discussion.topicId);
  // Новость KTTF — на языке интерфейса, если есть версия; «Перевод»
  // переключает (ADR-098). Обложка версии — вместо фото оригинала.
  const available = item.translations.map((row) => row.locale);
  const [locale, setLocale] = useNewsLocale(item.locale, available, uiLocale);
  const version =
    locale === null || locale === item.locale
      ? undefined
      : item.translations.find((row) => row.locale === locale);
  const images = version?.image == null ? item.images : [version.image];
  const title = version?.title ?? item.title;

  return (
    <Box lang={version?.locale}>
      {item.coauthor !== null && (
        <Box sx={{ mb: 0.75 }}>
          <CoauthorLine coauthor={item.coauthor} />
        </Box>
      )}
      {/* Заголовок записи игрока выведен из её первой строки — не повторяем. */}
      {item.type === 'PORTAL' && <Title href={href}>{title}</Title>}
      <Excerpt
        text={version?.excerpt ?? item.excerpt}
        topicId={item.discussion?.topicId ?? null}
        locale={locale}
      />
      {item.locale !== null && locale !== null && available.length > 0 && (
        <Box sx={{ ml: -1 }} data-feed-lang>
          <NewsLanguageSwitch
            original={item.locale}
            available={available}
            value={locale}
            onChange={setLocale}
          />
        </Box>
      )}
      <CardPhotos
        photos={images.map((image, index) => ({
          thumb: forumImageVariant(image.url, index === 0 ? 960 : 480),
          full: image.url,
        }))}
        title={item.type === 'PORTAL' ? title : item.source.name}
      />
    </Box>
  );
}

/**
 * Тема форума — ADR-097. Над заголовком раздел ссылкой и метка: новая тема
 * или живое обсуждение старой. Метка на чернилах: цвет в ленте — только у
 * акции и медали.
 */
function ForumBody({ item }: { readonly item: FeedForumItem }): ReactNode {
  const t = useT();
  const href = item.discussion === null ? undefined : topicHref(item.discussion.topicId);

  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ mb: 1, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}
      >
        <Link
          href={sectionHref(item.section.slug)}
          color="text.secondary"
          underline="hover"
          variant="caption"
          data-feed-section
          sx={{ fontWeight: 700, minWidth: 0 }}
        >
          {item.section.title}
        </Link>
        <Box
          component="span"
          data-feed-marker={item.isNew ? 'new' : 'active'}
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: 'var(--ink-100)',
            color: 'text.primary',
            typography: 'caption',
            fontWeight: 700,
          }}
        >
          {t(item.isNew ? 'feed.forum.new' : 'feed.forum.active')}
        </Box>
      </Stack>
      <Title href={href}>{item.title}</Title>
      {item.excerpt !== '' && (
        <Excerpt text={item.excerpt} topicId={item.discussion?.topicId ?? null} />
      )}
    </>
  );
}

function TournamentBody({ item }: { readonly item: FeedTournamentItem }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const { tournament } = item;
  const date = new Date(tournament.startsAt);
  const cap =
    tournament.ratingCapMax === null && tournament.ratingCapMin === null
      ? t('feed.tournament.open')
      : [
          tournament.ratingCapMin === null ? null : `${formatRating(tournament.ratingCapMin)}+`,
          tournament.ratingCapMax === null
            ? null
            : fill(t('feed.tournament.upTo'), { rating: formatRating(tournament.ratingCapMax) }),
        ]
          .filter((part) => part !== null)
          .join(' · ');
  const places =
    tournament.maxParticipants === null
      ? fill(t('feed.tournament.players'), { count: formatCount(tournament.participants, locale) })
      : fill(t('feed.tournament.places'), {
          count: formatCount(tournament.participants, locale),
          max: formatCount(tournament.maxParticipants, locale),
        });

  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'stretch' }}>
      <Box
        aria-hidden
        sx={{
          flexShrink: 0,
          width: 64,
          borderRadius: 2,
          bgcolor: 'var(--night)',
          color: 'var(--night-ink-900)',
          display: 'grid',
          placeContent: 'center',
          textAlign: 'center',
          py: 1,
        }}
      >
        <Box sx={{ fontSize: 26, lineHeight: '28px', fontWeight: 800 }}>{date.getDate()}</Box>
        <Box sx={{ typography: 'caption', color: 'var(--night-red)', fontWeight: 700 }}>
          {date.toLocaleDateString(locale, { month: 'short' }).replace('.', '')}
        </Box>
      </Box>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Title href={`/tournaments/${tournament.id}`}>{tournament.name}</Title>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {formatTime(tournament.startsAt, locale)} · {tournament.club.name} · {cap}
        </Typography>
        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{ mt: 1.5, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <Button href={`/tournaments/${tournament.id}`} size="small" sx={{ minHeight: 36 }}>
            {t(
              tournament.status === 'REG_OPEN'
                ? 'feed.tournament.join'
                : 'feed.tournament.open.cta',
            )}
          </Button>
          <Typography variant="body2" color="text.secondary">
            {places}
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
}

function ResultBody({ item }: { readonly item: FeedResultItem }): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <>
      <Title href={`/tournaments/${item.tournament.id}`}>{item.tournament.name}</Title>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {fill(t('feed.result.meta'), {
          date: formatDate(item.tournament.startsAt, locale),
          count: formatCount(item.participants, locale),
        })}
      </Typography>
      <Box component="ol" sx={{ listStyle: 'none', m: 0, mt: 1.5, p: 0, display: 'grid', gap: 1 }}>
        {item.places.map((place) => {
          const { lastName, firstName } = splitName(place.name);

          return (
            <Box
              component="li"
              key={`${String(place.place)}-${place.playerId}`}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}
            >
              <Box
                aria-label={t(MEDAL_KEYS[place.place - 1] ?? 'feed.medal.3')}
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: MEDAL[place.place - 1] ?? 'var(--ink-100)',
                  fontWeight: 800,
                  fontSize: 13,
                  color: 'var(--ink-900)',
                }}
              >
                {place.place}
              </Box>
              <PlayerAvatar lastName={lastName} firstName={firstName} size="sm" />
              <Link href={`/players/${place.playerId}`} color="inherit" underline="hover" noWrap>
                {place.name}
              </Link>
            </Box>
          );
        })}
      </Box>
    </>
  );
}

function AchievementBody({ item }: { readonly item: FeedAchievementItem }): ReactNode {
  const t = useT();
  const { achievement } = item;
  const medal = achievement.kind === 'MEDAL';

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Box
        aria-hidden
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          bgcolor: medal ? (MEDAL[achievement.place - 1] ?? 'var(--gold)') : 'var(--ok-50)',
          color: medal ? 'var(--ink-900)' : 'var(--ok-text)',
        }}
      >
        {medal ? <Trophy size={20} /> : <TrendingUp size={20} />}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        {achievement.kind === 'MEDAL' ? (
          <Typography sx={{ fontWeight: 600 }}>
            {t(MEDAL_KEYS[achievement.place - 1] ?? 'feed.medal.3')} ·{' '}
            <Link href={`/tournaments/${achievement.tournament.id}`} color="inherit">
              {achievement.tournament.name}
            </Link>
          </Typography>
        ) : (
          <Typography sx={{ fontWeight: 600 }}>
            {fill(t('profile.plate.level'), {
              level: String(achievement.level),
              name: t(LEVEL_NAME[achievement.level as keyof typeof LEVEL_NAME]),
            })}{' '}
            · {formatRating(achievement.rating)}
          </Typography>
        )}
        {achievement.kind === 'LEVEL_UP' && achievement.tournament !== null && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {achievement.tournament.name}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

function CardFoot({
  discussion,
}: {
  readonly discussion: NonNullable<FeedItem['discussion']>;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const counter = (icon: ReactNode, value: number, label: MessageKey) => (
    <Box
      component="span"
      title={t(label)}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
    >
      {icon}
      <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatCount(value, locale)}
      </Box>
    </Box>
  );

  return (
    <Stack
      direction="row"
      spacing={2.5}
      sx={{
        mt: 2,
        pt: 1.5,
        borderTop: '1px solid var(--line)',
        alignItems: 'center',
        typography: 'body2',
      }}
    >
      {discussion.postId === null ? (
        counter(<Heart size={16} aria-hidden />, discussion.likes, 'feed.likes')
      ) : (
        // Сердце — кнопка: «нравится» первому сообщению темы (ADR-075).
        <Box sx={{ ml: -1 }}>
          <LikeButton
            key={`${discussion.postId}:${String(discussion.likes)}:${String(discussion.liked)}`}
            postId={discussion.postId}
            likes={discussion.likes}
            liked={discussion.liked}
            mine={discussion.mine}
            alwaysCount
          />
        </Box>
      )}
      {counter(<MessageSquare size={16} aria-hidden />, discussion.comments, 'feed.comments')}
      {counter(<Eye size={16} aria-hidden />, discussion.views, 'feed.views')}
      <Box sx={{ flexGrow: 1 }} />
      <Link
        href={topicHref(discussion.topicId)}
        underline="none"
        sx={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', minHeight: 32 }}
      >
        {t('feed.discuss')}
      </Link>
    </Stack>
  );
}
