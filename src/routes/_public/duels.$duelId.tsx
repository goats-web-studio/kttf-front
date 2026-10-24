import type { DuelPlayer, DuelView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';

import { isMissingResource } from '@/common/api';
import { fill, formatDateTime, useLocale, useT, type MessageKey } from '@/common/i18n';
import DeltaPill from '@/common/ui/delta-pill';
import EmptyState from '@/common/ui/empty-state';
import PageHeader from '@/common/ui/page-header';
import QueryState from '@/common/ui/query-state';
import RatingValue from '@/common/ui/rating-value';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { useSessionStore } from '@/features/auth/session-store';
import {
  CancelAction,
  ConfirmPanel,
  ReportPanel,
  RespondPanel,
  ResponsesPanel,
} from '@/features/duels/duel-actions';
import {
  DuelBadges,
  DuelPlayerLine,
  ScoreLine,
  SlotList,
  VenueLine,
} from '@/features/duels/duel-parts';
import { DUELS_HREF, formatSlot } from '@/features/duels/labels';
import MatchPanel from '@/features/duels/match-panel';
import { duelQuery } from '@/features/duels/queries';
import SubjectThread from '@/features/forum/subject-thread';

/** Как часто перечитывается идущий матч. */
const LIVE_POLL_MS = 5_000;

export const Route = createFileRoute('/_public/duels/$duelId')({
  component: DuelPage,
});

/**
 * Страница дуэли — ADR-065, `docs/13` 5.3. Всё о предложении: кто, где,
 * когда; отклики; отклик или ответ на вызов; внесение, подтверждение и
 * спор счёта; итог с изменением рейтинга. Кнопки — только по `view.can`:
 * правила состояний и сроков знает сервер.
 */
function DuelPage(): ReactNode {
  const t = useT();
  const { duelId } = Route.useParams();
  const user = useSessionStore((state) => state.user);
  const me = user?.playerId ?? null;
  const valid = z.uuid().safeParse(duelId).success;
  const duel = useQuery({
    ...duelQuery(duelId),
    enabled: valid,
    // Идёт матч — табло на втором телефоне и у зрителей обновляется само
    // (ADR-068): партию записывает любой из двоих.
    refetchInterval: (query) =>
      query.state.data?.status === 'SCHEDULED' && query.state.data.startedAt !== null
        ? LIVE_POLL_MS
        : false,
  });

  if (!valid || isMissingResource(duel.error)) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 5, sm: 6 } }}>
        <EmptyState
          title={t('duel.notFound')}
          action={<Button href={DUELS_HREF}>{t('page.duels.title')}</Button>}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <QueryState
        isPending={duel.isPending}
        error={duel.error}
        onRetry={() => void duel.refetch()}
        loading={<RowsSkeleton />}
      >
        {duel.data !== undefined && <DuelBody duel={duel.data} me={me} />}
      </QueryState>
    </Container>
  );
}

function DuelBody({
  duel,
  me,
}: {
  readonly duel: DuelView;
  readonly me: string | null;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const { can, opponent } = duel;
  const title =
    opponent === null
      ? fill(t('duel.page.lookingFor'), { name: duel.author.name })
      : `${duel.author.name} — ${opponent.name}`;
  // Ответ на вызов и отклик на публикацию — одна панель; отказ вызванного —
  // в ней же, даже если отвечать вариантом уже нельзя.
  const answering = can.respond || can.decline;
  // Согласованная игра — блок «Матч» (ADR-068): когда, где, перенос, табло.
  // Он же показывает время, поэтому строка состояния над ним не нужна.
  const match = opponent !== null && (duel.status === 'SCHEDULED' || duel.status === 'REPORTED');

  return (
    <>
      <PageHeader
        back={{ href: DUELS_HREF, label: t('page.duels.title') }}
        eyebrow={<DuelBadges duel={duel} status />}
        title={title}
      />

      <Stack spacing={3}>
        {duel.status !== 'SCHEDULED' && <StatusLine duel={duel} me={me} />}

        {match && <MatchPanel duel={duel} me={me} />}

        <Surface title={t('duel.page.details')}>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              }}
            >
              <Role label={t('duel.page.author')} player={duel.author} />
              {opponent !== null && <Role label={t('duel.page.opponent')} player={opponent} />}
            </Box>
            <VenueLine venue={duel.venue} />
            {duel.startsAt !== null && duel.endsAt !== null ? (
              <Typography sx={{ pl: 3, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {formatSlot(duel.startsAt, duel.endsAt, locale)}
              </Typography>
            ) : (
              <SlotList slots={duel.slots} />
            )}
            {duel.note !== null && (
              <Typography
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'var(--paper-sunken)',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'pre-line',
                }}
              >
                {duel.note}
              </Typography>
            )}
          </Box>
        </Surface>

        {duel.result !== null && <ResultPanel duel={duel} />}

        {/* У назначенной ручной счёт — вторичной ссылкой в блоке «Матч». */}
        {can.report && duel.status !== 'SCHEDULED' && <ReportPanel duel={duel} me={me} />}
        {(can.confirm || can.dispute) && <ConfirmPanel duel={duel} me={me} />}
        {answering && <RespondPanel duel={duel} me={me} />}

        <ResponsesPanel duel={duel} me={me} />

        {can.cancel && (
          <Box>
            <CancelAction duel={duel} me={me} />
          </Box>
        )}
      </Stack>

      {/* Обсуждение — тема форума с предметом «дуэль» (ADR-068 §5). */}
      <SubjectThread type="DUEL" id={duel.id} />
    </>
  );
}

function Role({
  label,
  player,
}: {
  readonly label: string;
  readonly player: DuelPlayer;
}): ReactNode {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {label}
      </Typography>
      <DuelPlayerLine player={player} />
    </Box>
  );
}

/**
 * Где дуэль сейчас и чего она ждёт — одной фразой с точки зрения
 * смотрящего: вызванному — «ответьте», остальным — «ждёт ответа».
 */
function StatusLine({
  duel,
  me,
}: {
  readonly duel: DuelView;
  readonly me: string | null;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  // «Сейчас» — на время жизни страницы: строка не перескакивает посреди чтения.
  const [now] = useState(() => Date.now());
  const opponentName = duel.opponent?.name ?? '';
  let key: MessageKey;
  const values: Record<string, string> = { name: opponentName };

  switch (duel.status) {
    case 'CHALLENGE':
      key = duel.opponent?.id === me ? 'duel.state.CHALLENGE.me' : 'duel.state.CHALLENGE';
      break;
    case 'SCHEDULED':
      key =
        duel.rated && duel.startsAt !== null && Date.parse(duel.startsAt) <= now
          ? 'duel.state.SCHEDULED.played'
          : 'duel.state.SCHEDULED';
      if (duel.startsAt !== null && duel.endsAt !== null) {
        values.when = formatSlot(duel.startsAt, duel.endsAt, locale);
      }
      break;
    case 'REPORTED': {
      key = 'duel.state.REPORTED';
      const reporter =
        duel.result?.reportedById === duel.author.id ? duel.author.name : opponentName;
      values.name = reporter;
      values.until = duel.result === null ? '' : formatDateTime(duel.result.confirmBy, locale);
      break;
    }
    default:
      key = `duel.state.${duel.status}`;
  }

  return (
    <Box
      role="status"
      data-duel-state={duel.status}
      sx={{ p: 2, borderRadius: 3, bgcolor: 'var(--paper-sunken)' }}
    >
      <Typography sx={{ fontWeight: 500 }}>{fill(t(key), values)}</Typography>
    </Box>
  );
}

/**
 * Итог: счёт, изменение рейтинга обоих и пометки, почему его нет —
 * предел частоты (`ratingSkipped`), отмена администратором, спор.
 * Показывается только записанное: нет начисления — нет и строки дельты.
 */
function ResultPanel({ duel }: { readonly duel: DuelView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const { result } = duel;
  if (result === null) return null;

  const players = [duel.author, ...(duel.opponent === null ? [] : [duel.opponent])];

  return (
    <Surface title={t('duel.result.title')}>
      <Box sx={{ display: 'grid', gap: 2 }} data-duel-result>
        <ScoreLine duel={duel} />
        {duel.ratingChanges.length > 0 && (
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
            {duel.ratingChanges.map((change) => {
              const player = players.find((item) => item.id === change.playerId);

              return (
                <Box
                  component="li"
                  key={change.playerId}
                  data-duel-change={change.playerId}
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    columnGap: 1.5,
                    rowGap: 0.5,
                  }}
                >
                  <Typography sx={{ fontWeight: 500, minWidth: { sm: 200 } }}>
                    {player?.name ?? ''}
                  </Typography>
                  <Typography
                    component="span"
                    color="text.secondary"
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    <RatingValue value={change.ratingBefore} animate={false} /> →{' '}
                    <RatingValue value={change.ratingAfter} animate={false} />
                  </Typography>
                  <DeltaPill value={change.delta} />
                </Box>
              );
            })}
          </Box>
        )}
        {duel.ratingSkipped !== null && (
          <Typography color="text.secondary">
            {t(
              duel.ratingSkipped === 'PAIR'
                ? 'duel.result.skipped.PAIR'
                : 'duel.result.skipped.PLAYER',
            )}
          </Typography>
        )}
        {duel.annulledAt !== null && (
          <Typography color="text.secondary" data-duel-annulled>
            {fill(t('duel.result.annulled'), {
              at: formatDateTime(duel.annulledAt, locale),
              reason: duel.annulReason ?? '',
            })}
          </Typography>
        )}
        {result.disputeComment !== null && (
          <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            {fill(t('duel.result.dispute'), { comment: result.disputeComment })}
          </Typography>
        )}
        {result.resolutionComment !== null && (
          <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            {fill(t('duel.result.resolution'), { comment: result.resolutionComment })}
          </Typography>
        )}
      </Box>
    </Surface>
  );
}
