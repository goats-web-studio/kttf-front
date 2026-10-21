import {
  trainingBookingTarget,
  type TrainingDetailView,
  type TrainingView,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarClock,
  MessageCircle,
  Navigation,
  Phone,
  Send,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { z } from 'zod';

import { isMissingResource } from '@/common/api';
import { fill, useLocale, useT, type MessageKey } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import ClubMark from '@/features/clubs/club-mark';
import { phoneHref, routeHref, telegramHref, whatsappHref } from '@/features/clubs/contacts';
import { usePlaceName } from '@/features/places/place-name';

import { Badge } from './coach-cards';
import {
  bookingCaption,
  enrollAction,
  enrollMessage,
  linkStateKey,
  ownerContacts,
  trackEnroll,
} from './enroll';
import {
  TRAINING_AUDIENCE_KEYS,
  TRAINING_KIND_KEYS,
  TRAINING_PLACE_KEYS,
  coachPhoto,
  coachShortName,
  isForChildren,
  kidsFromText,
  priceText,
} from './labels';
import { trainingQuery } from './queries';
import { fullScheduleText } from './schedule';
import { EnrollmentBadge, NextSession } from './schedule-view';
import { CoachChip } from './training-list';

type Channel = 'WHATSAPP' | 'PHONE' | 'TELEGRAM';

const CHANNEL_ICONS: Readonly<Record<Channel, LucideIcon>> = {
  WHATSAPP: MessageCircle,
  PHONE: Phone,
  TELEGRAM: Send,
};

const CHANNEL_LABELS: Readonly<Record<Channel, MessageKey>> = {
  WHATSAPP: 'club.contact.whatsapp',
  PHONE: 'club.contact.call',
  TELEGRAM: 'club.contact.telegram',
};

interface TrainingDialogProps {
  readonly trainingId: string;
  readonly onClose: () => void;
  /** «Другие тренировки» — переключают окно на выбранную. */
  readonly onOpen: (trainingId: string) => void;
}

/**
 * Тренировка в окне поверх страницы — «Подробнее» (ADR-059, замечание
 * владельца: отдельная страница выглядела пустой, связь с клубом или
 * тренером должна быть явной). Сверху — что за тренировка и блок «Запись
 * и оплата» с адресатом и единственной главной кнопкой «Записаться»;
 * ниже — факты, место, тренер и другие тренировки того же владельца.
 * На телефоне — во весь экран.
 */
export default function TrainingDialog({
  trainingId,
  onClose,
  onOpen,
}: TrainingDialogProps): ReactNode {
  const t = useT();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = useId();
  const isKnownId = z.uuid().safeParse(trainingId).success;
  const training = useQuery({ ...trainingQuery(trainingId), enabled: isKnownId });
  const missing = !isKnownId || isMissingResource(training.error);

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen={phone}
      fullWidth
      maxWidth="md"
      aria-labelledby={titleId}
      data-training-dialog={trainingId}
      // Фокус уходит в окно, но рамку фокуса у самого окна не рисуем: она
      // нужна у кнопок и ссылок внутри. Стили MUI лежат в слое CSS и без
      // important уступают общей рамке фокуса из styles.css.
      sx={{ '& .MuiDialog-paper:focus-visible': { outline: 'none !important' } }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          display: 'flex',
          justifyContent: 'flex-end',
          px: 1,
          pt: 1,
          bgcolor: 'background.paper',
        }}
      >
        <IconButton
          aria-label={t('training.dialog.close')}
          onClick={onClose}
          sx={{ width: 44, height: 44 }}
        >
          <X size={20} aria-hidden />
        </IconButton>
      </Box>
      <DialogContent sx={{ pt: 0, px: { xs: 2, sm: 4 }, pb: { xs: 3, sm: 4 } }}>
        {missing ? (
          <Typography
            id={titleId}
            role="alert"
            color="text.secondary"
            sx={{ py: 5, textAlign: 'center' }}
          >
            {t('training.notFound')}
          </Typography>
        ) : (
          <QueryState
            isPending={training.isPending}
            error={training.error}
            onRetry={() => void training.refetch()}
            loading={
              <Box id={titleId}>
                <RowsSkeleton rows={4} />
              </Box>
            }
          >
            {training.data !== undefined && (
              <Details training={training.data} titleId={titleId} onOpen={onOpen} />
            )}
          </QueryState>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Details({
  training,
  titleId,
  onOpen,
}: {
  readonly training: TrainingDetailView;
  readonly titleId: string;
  readonly onOpen: (trainingId: string) => void;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const linkState = linkStateKey(training);
  const target = trainingBookingTarget(training);
  // Тренер — карточкой, только если записывает не он: иначе он уже в
  // блоке «Запись и оплата».
  const showCoach = training.coach !== null && target?.kind !== 'COACH';

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box component="header">
        <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
          {t(TRAINING_KIND_KEYS[training.kind])}
        </Typography>
        <Typography
          id={titleId}
          variant="h2"
          component="h2"
          sx={{ mt: 0.5, fontSize: { xs: 24, sm: 30 }, lineHeight: { xs: '28px', sm: '34px' } }}
        >
          {training.title}
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          <Typography
            sx={{
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              color: training.priceKzt === null ? 'text.secondary' : 'text.primary',
            }}
          >
            {priceText(training, t, locale)}
          </Typography>
          {/* Набор — рядом с ценой: решают вместе, идти ли. */}
          <EnrollmentBadge enrollment={training.enrollment} />
        </Box>
        {linkState !== null && (
          <Box sx={{ mt: 1.5 }}>
            <Badge tone="warn">
              <span data-training-link={training.link}>
                {`${t(linkState)} · ${t('training.detail.notPublic').toLowerCase()}`}
              </span>
            </Badge>
          </Box>
        )}
      </Box>

      <BookingBlock training={training} />
      <Facts training={training} />
      <Place training={training} />
      {showCoach && training.coach !== null && (
        <Box component="section">
          <Typography variant="h3" sx={{ mb: 1 }}>
            {t(training.author === 'CLUB' ? 'training.detail.groupCoach' : 'training.detail.coach')}
          </Typography>
          <Box data-training-coach={training.author}>
            <CoachChip coach={training.coach} />
            {training.club !== null && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {fill(t('training.detail.worksAt'), { club: training.club.name })}
              </Typography>
            )}
          </Box>
        </Box>
      )}
      <More training={training} onOpen={onOpen} />
    </Box>
  );
}

/**
 * «Запись и оплата» — главный блок окна: кто записывает и принимает
 * оплату (`trainingBookingTarget`), как он связан со второй стороной и
 * его способы связи. «Записаться» — единственная главная кнопка экрана
 * (07, запрет 2); нажатия — адресату и второй стороне.
 */
function BookingBlock({ training }: { readonly training: TrainingView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const enroll = enrollAction(training, t, locale);
  const target = trainingBookingTarget(training);
  const caption = bookingCaption(training, t);
  const titleId = useId();

  return (
    <Paper
      variant="outlined"
      component="section"
      data-training-booking-block={target?.kind ?? 'NONE'}
      aria-labelledby={titleId}
      sx={{
        p: { xs: 2, sm: 3 },
        bgcolor: 'var(--paper-sunken)',
        borderColor: 'var(--line-strong)',
      }}
    >
      <Typography id={titleId} variant="h3" component="h3">
        {t('training.booking.title')}
      </Typography>

      {target !== null && (
        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          {target.kind === 'CLUB' ? (
            <ClubMark club={target.club} size={48} />
          ) : (
            <PlayerAvatar
              lastName={target.coach.player.lastName}
              firstName={target.coach.player.firstName}
              photoUrl={coachPhoto(target.coach)}
              size="lg"
            />
          )}
          <Box sx={{ minWidth: 0 }}>
            <Link
              href={
                target.kind === 'CLUB'
                  ? `/clubs/${target.club.id}`
                  : `/coaches/${target.coach.slug}`
              }
              sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
            >
              {target.kind === 'CLUB' ? target.club.name : coachShortName(target.coach.player)}
            </Link>
            {caption !== null && (
              <Typography variant="body2" color="text.secondary" data-training-booking-caption>
                {caption}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        {enroll === null ? (
          <Typography variant="body2" color="text.secondary">
            {t('training.detail.noContacts')}
          </Typography>
        ) : (
          <ContactButtons training={training} enroll={enroll} />
        )}
      </Box>
    </Paper>
  );
}

function ContactButtons({
  training,
  enroll,
}: {
  readonly training: TrainingView;
  readonly enroll: NonNullable<ReturnType<typeof enrollAction>>;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const contacts = ownerContacts(enroll.owner);
  const message = enrollMessage(training, t, locale);
  const others: { kind: Channel; href: string; external: boolean }[] = [];

  if (contacts.whatsapp !== null && enroll.kind !== 'WHATSAPP') {
    others.push({
      kind: 'WHATSAPP',
      href: whatsappHref(contacts.whatsapp, message),
      external: true,
    });
  }
  if (contacts.phone !== null && enroll.kind !== 'PHONE') {
    others.push({ kind: 'PHONE', href: phoneHref(contacts.phone), external: false });
  }
  if (contacts.telegram !== null && enroll.kind !== 'TELEGRAM') {
    others.push({ kind: 'TELEGRAM', href: telegramHref(contacts.telegram), external: true });
  }

  const EnrollIcon = CHANNEL_ICONS[enroll.kind];

  return (
    <Box
      data-training-contacts
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(170px, max-content))' },
      }}
    >
      <Button
        variant="contained"
        size="large"
        href={enroll.href}
        startIcon={<EnrollIcon size={18} aria-hidden />}
        {...(enroll.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        onClick={() => {
          trackEnroll(enroll);
        }}
      >
        {t('training.enroll')}
      </Button>
      {others.map((item) => {
        const Icon = CHANNEL_ICONS[item.kind];

        return (
          <Button
            key={item.kind}
            size="large"
            href={item.href}
            startIcon={<Icon size={18} aria-hidden />}
            {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            onClick={() => {
              trackEnroll({ kind: item.kind, owner: enroll.owner, partner: enroll.partner });
            }}
          >
            {t(CHANNEL_LABELS[item.kind])}
          </Button>
        );
      })}
    </Box>
  );
}

/** Строка «подпись — значение»; пустое не выводится. */
function Row({ label, value }: { readonly label: string; readonly value: ReactNode }): ReactNode {
  if (value === null || value === '') return null;

  return (
    <Box sx={{ display: 'contents' }}>
      <Typography component="dt" variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
    </Box>
  );
}

/** Для кого, возраст, расписание, примечание и описание. */
function Facts({ training }: { readonly training: TrainingView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const schedule = fullScheduleText(training, locale);

  return (
    <Box component="section">
      <Typography variant="h3" sx={{ mb: 1 }}>
        {t('training.detail.about')}
      </Typography>
      <Box
        component="dl"
        sx={{
          m: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'max-content minmax(0, 1fr)' },
          columnGap: 3,
          rowGap: { xs: 0.25, sm: 1 },
          '& dt:not(:first-of-type)': { mt: { xs: 1, sm: 0 } },
        }}
      >
        <Row
          label={t('trainings.filter.audience')}
          value={
            <Box component="span" sx={{ display: 'inline-flex', flexWrap: 'wrap', gap: 0.75 }}>
              {training.audiences.map((audience) => (
                <Badge key={audience}>{t(TRAINING_AUDIENCE_KEYS[audience])}</Badge>
              ))}
            </Box>
          }
        />
        <Row
          label={t('trainings.filter.age')}
          value={
            training.kidsFromAge !== null && isForChildren(training.audiences)
              ? kidsFromText(training.kidsFromAge, t)
              : null
          }
        />
        <Row
          label={t('training.schedule.title')}
          value={
            schedule === null ? null : (
              <Box component="span" sx={{ display: 'grid', gap: 0.25 }}>
                <span data-training-schedule>{schedule}</span>
                <Typography component="span" variant="body2" color="text.secondary">
                  <NextSession slots={training.slots} />
                </Typography>
              </Box>
            )
          }
        />
        <Row label={t('manage.prices.note')} value={training.note} />
      </Box>
      {training.description !== null && (
        <Typography
          data-training-description
          sx={{ mt: 2, whiteSpace: 'pre-line', maxWidth: 680, overflowWrap: 'anywhere' }}
        >
          {training.description}
        </Typography>
      )}
    </Box>
  );
}

/** Где: клуб с логотипом и маршрутом, зал с адресом, выезд или онлайн. */
function Place({ training }: { readonly training: TrainingView }): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const { club, venue } = training;

  return (
    <Box component="section">
      <Typography variant="h3" sx={{ mb: 1 }}>
        {t('training.detail.where')}
      </Typography>
      {club === null && venue === null ? (
        <Typography>{t(TRAINING_PLACE_KEYS[training.place])}</Typography>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          {club !== null ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              <ClubMark club={club} size={44} />
              <Box sx={{ minWidth: 0 }}>
                <Link href={`/clubs/${club.id}`} sx={{ fontWeight: 600 }}>
                  {club.name}
                </Link>
                <Typography variant="body2" color="text.secondary">
                  {club.address === null
                    ? placeName(club.city)
                    : `${placeName(club.city)} · ${club.address}`}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600 }}>{venue?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {fill(t('training.group.venue'), { address: venue?.address ?? '' })}
              </Typography>
            </Box>
          )}
          <Button
            href={
              club !== null
                ? routeHref({
                    twoGisUrl: club.twoGisUrl,
                    address: club.address,
                    cityName: placeName(club.city),
                    name: club.name,
                  })
                : `https://2gis.kz/search/${encodeURIComponent(venue?.address ?? '')}`
            }
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<Navigation size={16} aria-hidden />}
            sx={{ minHeight: 44 }}
          >
            {t('club.contact.route')}
          </Button>
        </Box>
      )}
    </Box>
  );
}

/** Другие тренировки владельца — компактно; нажатие переключает окно. */
function More({
  training,
  onOpen,
}: {
  readonly training: TrainingDetailView;
  readonly onOpen: (trainingId: string) => void;
}): ReactNode {
  const t = useT();
  const locale = useLocale();

  if (training.more.length === 0) return null;

  return (
    <Box component="section">
      <Typography variant="h3" sx={{ mb: 1 }}>
        {t(training.author === 'CLUB' ? 'training.detail.moreClub' : 'training.detail.moreCoach')}
      </Typography>
      <Box
        component="ul"
        data-training-more
        sx={{ m: 0, p: 0, listStyle: 'none', border: 1, borderColor: 'divider', borderRadius: 3 }}
      >
        {training.more.map((other) => (
          <Box
            component="li"
            key={other.id}
            sx={{ borderTop: 1, borderColor: 'divider', '&:first-of-type': { borderTop: 0 } }}
          >
            <ButtonBase
              onClick={() => {
                onOpen(other.id);
              }}
              sx={{
                width: '100%',
                minHeight: 56,
                px: 2,
                py: 1.25,
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                columnGap: 2,
                alignItems: 'center',
                textAlign: 'left',
                '@media (hover: hover)': { '&:hover': { bgcolor: 'var(--paper-hover)' } },
                '&.Mui-focusVisible': {
                  outline: '2px solid var(--red-600)',
                  outlineOffset: '-2px',
                },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>{other.title}</Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  {t(TRAINING_KIND_KEYS[other.kind])}
                  {fullScheduleText(other, locale) !== null && (
                    <>
                      {' · '}
                      <CalendarClock size={14} aria-hidden style={{ flexShrink: 0 }} />
                      {fullScheduleText(other, locale)}
                    </>
                  )}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
              >
                {priceText(other, t, locale)}
              </Typography>
            </ButtonBase>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
