import {
  trainingOwner,
  type TrainingDetailView,
  type TrainingOwner,
  type TrainingView,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { MessageCircle, Navigation, Phone, Send, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { z } from 'zod';

import { isMissingResource } from '@/common/api';
import { fill, useLocale, useT, type MessageKey } from '@/common/i18n';
import { BackLink } from '@/common/ui/page-header';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import ClubMark from '@/features/clubs/club-mark';
import { phoneHref, routeHref, telegramHref, whatsappHref } from '@/features/clubs/contacts';
import { Badge } from '@/features/coaches/coach-cards';
import {
  enrollAction,
  enrollMessage,
  linkStateKey,
  ownerContacts,
  trackEnroll,
} from '@/features/coaches/enroll';
import {
  TRAINING_AUDIENCE_KEYS,
  TRAINING_KIND_KEYS,
  TRAINING_PLACE_KEYS,
  coachShortName,
  isForChildren,
  kidsFromText,
  priceText,
} from '@/features/coaches/labels';
import { trainingQuery } from '@/features/coaches/queries';
import { CoachChip, TrainingList } from '@/features/coaches/training-list';
import { usePlaceName } from '@/features/places/place-name';

export const Route = createFileRoute('/_public/trainings/$trainingId')({
  component: TrainingPage,
});

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

/**
 * Страница тренировки — «Подробнее» (ADR-059, решение владельца от
 * 20.10.2026). Её ссылку дают в рекламе, поэтому всё для записи — здесь:
 * кто ведёт и кому писать, где и когда, сколько стоит, единственная
 * главная кнопка «Записаться» и другие тренировки того же владельца.
 */
function TrainingPage(): ReactNode {
  const t = useT();
  const { trainingId } = Route.useParams();
  const isKnownId = z.uuid().safeParse(trainingId).success;
  const training = useQuery({ ...trainingQuery(trainingId), enabled: isKnownId });

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 4, sm: 6 } }}>
      <BackLink href="/trainings" label={t('nav.trainings')} />
      <Box sx={{ mt: 1 }}>
        {!isKnownId || isMissingResource(training.error) ? (
          <Typography role="alert" color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>
            {t('training.notFound')}
          </Typography>
        ) : (
          <QueryState
            isPending={training.isPending}
            error={training.error}
            onRetry={() => void training.refetch()}
            loading={<RowsSkeleton />}
          >
            {training.data !== undefined && <TrainingDetails training={training.data} />}
          </QueryState>
        )}
      </Box>
    </Container>
  );
}

function TrainingDetails({ training }: { readonly training: TrainingDetailView }): ReactNode {
  const t = useT();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const owner = trainingOwner(training);
  const linkState = linkStateKey(training);

  const facts = <Facts training={training} />;
  const place = <PlaceCard training={training} />;
  // Тренер группы клуба на клуб работает: его карточка — без контактов,
  // только ссылка на страницу (решение владельца от 21.10.2026).
  const coach =
    training.coach === null ? null : (
      <AsideCard
        title={t(
          training.author === 'CLUB' ? 'training.detail.groupCoach' : 'training.detail.coach',
        )}
      >
        <Box data-training-coach={training.author}>
          <CoachChip coach={training.coach} />
          {training.author === 'CLUB' && training.club !== null && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {fill(t('training.detail.worksAt'), { club: training.club.name })}
            </Typography>
          )}
        </Box>
      </AsideCard>
    );
  const more =
    training.more.length === 0 ? null : (
      <Box component="section" sx={{ mt: { xs: 4, md: 6 } }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          {t(owner?.kind === 'CLUB' ? 'training.detail.moreClub' : 'training.detail.moreCoach')}
        </Typography>
        <TrainingList
          trainings={training.more}
          context={owner?.kind === 'CLUB' ? 'club' : 'coach'}
          showPlace={owner?.kind !== 'CLUB'}
        />
      </Box>
    );

  return (
    <>
      {linkState !== null && (
        <Paper
          variant="outlined"
          role="status"
          data-training-link={training.link}
          sx={{ mb: 2, p: 2, bgcolor: 'var(--warn-50)', borderColor: 'var(--warn)' }}
        >
          <Typography sx={{ color: 'var(--warn-text)', fontWeight: 600 }}>
            {`${t(linkState)}. ${t('training.detail.notPublic')}`}
          </Typography>
        </Paper>
      )}

      <Header training={training} owner={owner} />

      {desktop ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 8fr) minmax(0, 4fr)', gap: 4 }}>
          <Box>
            {facts}
            {more}
          </Box>
          <Box component="aside" sx={{ mt: 6, display: 'grid', gap: 2, alignContent: 'start' }}>
            {place}
            {coach}
          </Box>
        </Box>
      ) : (
        // Телефон — своя раскладка (07, 1.2): за шапкой с кнопкой записи —
        // что за тренировка, где она, тренер и другие тренировки.
        <Box data-training-layout="phone">
          {facts}
          <Box sx={{ mt: 4, display: 'grid', gap: 2 }}>
            {place}
            {coach}
          </Box>
          {more}
        </Box>
      )}
    </>
  );
}

/** Шапка: вид, название, владелец, цена и кнопки записи. */
function Header({
  training,
  owner,
}: {
  readonly training: TrainingView;
  readonly owner: TrainingOwner | null;
}): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Paper variant="outlined" component="header" sx={{ p: { xs: 2.5, sm: 4 } }}>
      <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
        {t(TRAINING_KIND_KEYS[training.kind])}
      </Typography>
      <Typography
        variant="h1"
        sx={{ mt: 0.5, fontSize: { xs: 26, sm: 34 }, lineHeight: { xs: '30px', sm: '40px' } }}
      >
        {training.title}
      </Typography>
      {owner !== null && (
        <Typography sx={{ mt: 1 }} data-training-owner={owner.kind}>
          {owner.kind === 'CLUB' ? (
            <>
              {t('training.detail.ofClub')}{' '}
              <Link href={`/clubs/${owner.club.id}`} sx={{ fontWeight: 600 }}>
                {owner.club.name}
              </Link>
            </>
          ) : training.club !== null ? (
            // Своя тренировка тренера в зале клуба: клуб — только место.
            <>
              {t('training.detail.coachWord')}{' '}
              <Link href={`/coaches/${owner.coach.slug}`} sx={{ fontWeight: 600 }}>
                {coachShortName(owner.coach.player)}
              </Link>{' '}
              {t('training.detail.holdsIn')}{' '}
              <Link href={`/clubs/${training.club.id}`} sx={{ fontWeight: 600 }}>
                {training.club.name}
              </Link>
              {` · ${t('training.via.coach').toLowerCase()}`}
            </>
          ) : (
            <>
              {t('training.detail.ofCoach')}{' '}
              <Link href={`/coaches/${owner.coach.slug}`} sx={{ fontWeight: 600 }}>
                {coachShortName(owner.coach.player)}
              </Link>
            </>
          )}
        </Typography>
      )}
      <Typography
        sx={{
          mt: 2,
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          lineHeight: '32px',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: training.priceKzt === null ? 'text.secondary' : 'text.primary',
        }}
      >
        {priceText(training, t, locale)}
      </Typography>
      <Box sx={{ mt: 3 }}>
        <ContactButtons training={training} owner={owner} />
      </Box>
    </Paper>
  );
}

/**
 * «Записаться» — единственная главная кнопка экрана (07, запрет 2), с
 * готовым текстом про эту тренировку. Остальные способы связи владельца —
 * обводкой. Каждое нажатие — в статистику владельца.
 */
function ContactButtons({
  training,
  owner,
}: {
  readonly training: TrainingView;
  readonly owner: TrainingOwner | null;
}): ReactNode {
  const t = useT();
  const enroll = enrollAction(training, t);

  if (owner === null || enroll === null) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('training.detail.noContacts')}
      </Typography>
    );
  }

  const contacts = ownerContacts(owner);
  const message = enrollMessage(training, t);
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
    <>
      <Box
        data-training-contacts
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(180px, max-content))' },
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
                trackEnroll({ kind: item.kind, owner, partner: enroll.partner });
              }}
            >
              {t(CHANNEL_LABELS[item.kind])}
            </Button>
          );
        })}
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 1 }}
        data-training-enrolls={owner.kind}
      >
        {owner.kind === 'CLUB'
          ? fill(t('training.detail.enrollsClub'), { club: owner.club.name })
          : fill(t('training.detail.enrollsCoach'), { coach: coachShortName(owner.coach.player) })}
      </Typography>
    </>
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

/** Что за тренировка: для кого, возраст, расписание, цена, описание, примечание. */
function Facts({ training }: { readonly training: TrainingView }): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Box component="section" sx={{ mt: { xs: 4, md: 6 } }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        {t('training.detail.about')}
      </Typography>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Box
          component="dl"
          sx={{
            m: 0,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'max-content minmax(0, 1fr)' },
            columnGap: 3,
            rowGap: { xs: 0.25, sm: 1.25 },
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
          <Row label={t('coach.editor.schedule')} value={training.schedule} />
          <Row label={t('training.detail.price')} value={priceText(training, t, locale)} />
          <Row label={t('manage.prices.note')} value={training.note} />
        </Box>
        {training.description !== null && (
          <Typography
            data-training-description
            sx={{
              mt: 2.5,
              pt: 2.5,
              borderTop: 1,
              borderColor: 'divider',
              whiteSpace: 'pre-line',
              maxWidth: 680,
              overflowWrap: 'anywhere',
            }}
          >
            {training.description}
          </Typography>
        )}
      </Paper>
    </Box>
  );
}

/** Карточка боковой колонки. */
function AsideCard({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Paper variant="outlined" component="section" sx={{ p: 2.5 }}>
      <Typography variant="h3" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

/**
 * Где: клуб KTTF — логотип, название ссылкой, адрес и маршрут в 2GIS;
 * зал вне KTTF — название, адрес и маршрут поиском; иначе выезд или онлайн.
 */
function PlaceCard({ training }: { readonly training: TrainingView }): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const club = training.club;
  const venue = training.venue;

  if (club === null && venue === null) {
    return (
      <AsideCard title={t('training.detail.where')}>
        <Typography>{t(TRAINING_PLACE_KEYS[training.place])}</Typography>
      </AsideCard>
    );
  }

  const route =
    club !== null
      ? routeHref({
          twoGisUrl: club.twoGisUrl,
          address: club.address,
          cityName: placeName(club.city),
          name: club.name,
        })
      : `https://2gis.kz/search/${encodeURIComponent(venue?.address ?? '')}`;

  return (
    <AsideCard title={t('training.detail.where')}>
      {club !== null ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ClubMark club={club} size={48} />
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
        <Box>
          <Typography sx={{ fontWeight: 600 }}>{venue?.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {fill(t('training.group.venue'), { address: venue?.address ?? '' })}
          </Typography>
        </Box>
      )}
      <Button
        href={route}
        target="_blank"
        rel="noopener noreferrer"
        startIcon={<Navigation size={16} aria-hidden />}
        sx={{ mt: 2, minHeight: 44 }}
      >
        {t('club.contact.route')}
      </Button>
    </AsideCard>
  );
}
