import {
  DUEL_FLAGS,
  DUEL_STATUSES,
  setsToWin,
  type AdminDuelItemView,
  type DuelPlayer,
  type DuelRatingChange,
  type ListAdminDuelsQuery,
} from '@kttf/shared/types';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useDeferredValue, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { fill, formatCount, formatDate, formatDateTime, useLocale, useT } from '@/common/i18n';
import { searchId, searchPage } from '@/common/search';
import DeltaPill from '@/common/ui/delta-pill';
import EmptyState from '@/common/ui/empty-state';
import FilterSummary, { type ActiveFilter } from '@/common/ui/filter-summary';
import PageHeader from '@/common/ui/page-header';
import Pagination from '@/common/ui/pagination';
import PillTabs from '@/common/ui/pill-tabs';
import QueryState from '@/common/ui/query-state';
import RatingValue from '@/common/ui/rating-value';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { useSessionStore } from '@/features/auth/session-store';
import { Badge } from '@/features/coaches/coach-cards';
import { annulDuel, resolveDuel } from '@/features/duels/api';
import { TextDialog } from '@/features/duels/duel-actions';
import { DuelBadges, DuelPlayerLine, ScoreLine } from '@/features/duels/duel-parts';
import {
  FLAG_HINT_KEYS,
  FLAG_KEYS,
  STATUS_KEYS,
  duelErrorText,
  duelHref,
} from '@/features/duels/labels';
import { adminDuelsQuery, duelKeys } from '@/features/duels/queries';
import { usePlaceName } from '@/features/places/place-name';
import { playerName } from '@/features/players/player-name';
import { playerQuery, playersQuery } from '@/features/players/queries';

const PAGE_SIZE = 20;

const searchSchema = z.object({
  status: z.enum(DUEL_STATUSES).optional().catch(undefined),
  /** Только с пометками — то, на что стоит посмотреть первым. */
  flagged: z.boolean().optional().catch(undefined),
  player: searchId,
  page: searchPage,
});

type Search = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_app/admin/duels')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: DuelsAdminPage,
});

/**
 * Дуэли в админке — ADR-065 §6, `docs/13` 3.6, только администратор.
 *
 * Рейтинговые дуэли, свежие первыми, с пометками (частая пара,
 * односторонние победы, новичок среди двоих, большой набор): пометка —
 * повод посмотреть, блокировок автоматом нет. Действия — решить спор и
 * отменить начисление обратными событиями журнала; история не
 * переписывается.
 */
function DuelsAdminPage(): ReactNode {
  const t = useT();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const user = useSessionStore((state) => state.user);
  const page = search.page ?? 1;
  const query: Partial<ListAdminDuelsQuery> = {
    page,
    limit: PAGE_SIZE,
    ...(search.status === undefined ? {} : { status: search.status }),
    ...(search.flagged === true ? { flagged: true } : {}),
    ...(search.player === undefined ? {} : { playerId: search.player }),
  };
  const duels = useQuery({
    ...adminDuelsQuery(query),
    enabled: user?.isAdmin === true,
    placeholderData: keepPreviousData,
  });
  const chosen = useQuery({
    ...playerQuery(search.player ?? ''),
    enabled: search.player !== undefined,
  });

  if (user?.isAdmin !== true) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 5, sm: 6 } }}>
        <EmptyState title={t('error.api.FORBIDDEN')} />
      </Container>
    );
  }

  const filter = (patch: Partial<Search>): void => {
    void navigate({ search: (previous) => ({ ...previous, ...patch, page: undefined }) });
  };

  const active: ActiveFilter[] = [];
  if (search.status !== undefined) {
    active.push({
      key: 'status',
      label: t(STATUS_KEYS[search.status]),
      onRemove: () => {
        filter({ status: undefined });
      },
    });
  }
  if (search.player !== undefined) {
    active.push({
      key: 'player',
      label: fill(t('filter.chip'), {
        label: t('duel.admin.player'),
        value: chosen.data === undefined ? t('common.loading') : playerName(chosen.data),
      }),
      onRemove: () => {
        filter({ player: undefined });
      },
    });
  }

  const pages =
    duels.data === undefined ? 1 : Math.max(1, Math.ceil(duels.data.total / duels.data.limit));

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <PageHeader
        back={{ href: '/cabinet', label: t('page.cabinet.title') }}
        title={t('duel.admin.title')}
        subtitle={t('duel.admin.lead')}
      />

      <PillTabs
        label={t('duel.admin.flagged')}
        value={search.flagged === true ? 'flagged' : 'all'}
        options={[
          ['all', 'duel.admin.all'],
          ['flagged', 'duel.admin.flagged'],
        ]}
        onChange={(next) => {
          filter({ flagged: next === 'flagged' ? true : undefined });
        }}
      />

      <Box
        role="search"
        sx={{
          mt: 2,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        <TextField
          select
          label={t('filter.status')}
          value={search.status ?? ''}
          onChange={(event) => {
            filter({ status: DUEL_STATUSES.find((status) => status === event.target.value) });
          }}
        >
          <MenuItem value="">{t('filter.any')}</MenuItem>
          {DUEL_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {t(STATUS_KEYS[status])}
            </MenuItem>
          ))}
        </TextField>
        <PlayerFilter
          onChange={(player) => {
            filter({ player });
          }}
        />
      </Box>

      <FilterSummary
        total={duels.isError ? null : duels.data?.total}
        filters={active}
        onReset={() => {
          void navigate({ search: { flagged: search.flagged } });
        }}
      />

      <Box sx={{ mt: 2 }}>
        <QueryState
          isPending={duels.isPending}
          error={duels.error}
          onRetry={() => void duels.refetch()}
          loading={<RowsSkeleton />}
        >
          {duels.data?.items.length === 0 ? (
            <EmptyState title={t('duel.admin.empty')} />
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }} data-admin-duels>
              {duels.data?.items.map((duel) => (
                <AdminDuelCard key={duel.id} duel={duel} />
              ))}
            </Box>
          )}
        </QueryState>
      </Box>

      <Pagination
        page={page}
        pages={pages}
        onPage={(next) => {
          void navigate({
            search: (previous) => ({ ...previous, page: next > 1 ? next : undefined }),
          });
        }}
      />
    </Container>
  );
}

/** Игрок — поиском по фамилии; выбранный уходит в адрес и чипом под фильтрами. */
function PlayerFilter({
  onChange,
}: {
  readonly onChange: (playerId: string | undefined) => void;
}): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const [input, setInput] = useState('');
  const search = useDeferredValue(input.trim());
  const found = useQuery({
    ...playersQuery({ page: 1, limit: 20, search }),
    enabled: search.length >= 2,
  });

  return (
    <Autocomplete
      options={found.data?.items ?? []}
      value={null}
      inputValue={input}
      onInputChange={(_, next, reason) => {
        // Выбор очищает поле: выбранный виден чипом, поле — для следующего.
        setInput(reason === 'reset' ? '' : next);
      }}
      onChange={(_, player) => {
        if (player !== null) onChange(player.id);
      }}
      // Ищет сервер.
      filterOptions={(list) => list}
      getOptionLabel={(player) => playerName(player)}
      renderOption={(props, player) => (
        <li {...props} key={player.id}>
          {`${playerName(player)} · ${placeName(player.city)}`}
        </li>
      )}
      noOptionsText={t(search.length < 2 ? 'duel.admin.playerHint' : 'ratings.empty')}
      loading={found.isFetching}
      loadingText={t('common.loading')}
      renderInput={(params) => <TextField {...params} label={t('duel.admin.player')} />}
    />
  );
}

/**
 * Дуэль в очереди: счёт, изменение рейтинга обоих, пометки с объяснением,
 * сколько раз пара играла за 30 дней. Действия — по состоянию: спор решают,
 * начисление отменяют, пока оно не отменено.
 */
function AdminDuelCard({ duel }: { readonly duel: AdminDuelItemView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [resolving, setResolving] = useState(false);
  const [annulling, setAnnulling] = useState(false);
  const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: duelKeys.all });
  const changeOf = (playerId: string): DuelRatingChange | undefined =>
    duel.ratingChanges.find((change) => change.playerId === playerId);
  const players = [duel.author, ...(duel.opponent === null ? [] : [duel.opponent])];
  const canAnnul =
    duel.status === 'COMPLETED' && duel.ratingChanges.length > 0 && duel.annulledAt === null;

  return (
    <Surface component="article">
      <Box data-admin-duel={duel.id} sx={{ display: 'grid', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <DuelBadges duel={duel} status />
          <Typography variant="body2" color="text.secondary">
            {formatDate(duel.startsAt ?? duel.createdAt, locale)}
          </Typography>
        </Box>

        <ScoreLine duel={duel} />

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          }}
        >
          {players.map((player) => (
            <PlayerChange key={player.id} player={player} change={changeOf(player.id)} />
          ))}
        </Box>

        <Typography variant="body2" color="text.secondary" data-pair-count>
          {fill(t('duel.admin.pairCount'), { count: formatCount(duel.pairCount30d, locale) })}
        </Typography>

        {duel.flags.length > 0 && (
          <Box
            component="ul"
            data-duel-flags
            sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}
          >
            {DUEL_FLAGS.filter((flag) => duel.flags.includes(flag)).map((flag) => (
              <Box
                component="li"
                key={flag}
                data-duel-flag={flag}
                sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'baseline' }}
              >
                <Badge tone="warn">{t(FLAG_KEYS[flag])}</Badge>
                <Typography variant="body2" color="text.secondary">
                  {t(FLAG_HINT_KEYS[flag])}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {duel.result?.disputeComment != null && (
          <Typography sx={{ overflowWrap: 'anywhere' }}>
            {fill(t('duel.result.dispute'), { comment: duel.result.disputeComment })}
          </Typography>
        )}
        {duel.annulledAt !== null && (
          <Typography color="text.secondary">
            {fill(t('duel.admin.annulledAt'), { at: formatDateTime(duel.annulledAt, locale) })}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {duel.status === 'DISPUTED' && (
            <Button
              variant="contained"
              onClick={() => {
                setResolving(true);
              }}
              sx={{ minHeight: 44 }}
            >
              {t('duel.admin.resolve')}
            </Button>
          )}
          {canAnnul && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                setAnnulling(true);
              }}
              sx={{ minHeight: 44 }}
            >
              {t('duel.admin.annul')}
            </Button>
          )}
          <Button href={duelHref(duel.id)} variant="text" sx={{ minHeight: 44 }}>
            {t('duel.card.open')}
          </Button>
        </Box>
      </Box>

      {duel.status === 'DISPUTED' && (
        <ResolveDialog
          duel={duel}
          open={resolving}
          onClose={() => {
            setResolving(false);
          }}
          onDone={refresh}
        />
      )}
      <TextDialog
        open={annulling}
        title={t('duel.admin.annulTitle')}
        hint={t('duel.admin.annulHint')}
        label={t('duel.reason')}
        submitLabel={t('duel.admin.annul')}
        required
        onClose={() => {
          setAnnulling(false);
        }}
        onSubmit={async (reason) => {
          await annulDuel(duel.id, { reason });
          await refresh();
        }}
        errorText={(error) => duelErrorText(error, t)}
      />
    </Surface>
  );
}

function PlayerChange({
  player,
  change,
}: {
  readonly player: DuelPlayer;
  readonly change: DuelRatingChange | undefined;
}): ReactNode {
  const t = useT();

  return (
    <DuelPlayerLine
      player={player}
      meta={
        <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {change === undefined ? (
            <Typography variant="body2" color="text.secondary">
              {t('duel.admin.noChange')}
            </Typography>
          ) : (
            <>
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                <RatingValue value={change.ratingBefore} animate={false} /> →{' '}
                <RatingValue value={change.ratingAfter} animate={false} />
              </Typography>
              <DeltaPill value={change.delta} />
            </>
          )}
          {player.isProvisional && <Badge>{t('duel.admin.provisional')}</Badge>}
        </Box>
      }
    />
  );
}

/**
 * Решение спора: засчитать счёт — он обсчитывается как подтверждённый —
 * или не засчитывать игру. Комментарий обязателен: его увидят оба.
 * Счёт по умолчанию — внесённый: чаще всего его и подтверждают.
 */
function ResolveDialog({
  duel,
  open,
  onClose,
  onDone,
}: {
  readonly duel: AdminDuelItemView;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onDone: () => Promise<void>;
}): ReactNode {
  const t = useT();
  const [mode, setMode] = useState<'SCORE' | 'VOID'>('SCORE');
  const [winnerId, setWinnerId] = useState(duel.result?.winnerId ?? duel.author.id);
  const [loserSets, setLoserSets] = useState(duel.result?.loserSets ?? 0);
  const { opponent, bestOf } = duel;
  const toWin = bestOf === null ? null : setsToWin(bestOf);

  return (
    <TextDialog
      open={open}
      title={t('duel.admin.resolveTitle')}
      hint={t('duel.admin.resolveHint')}
      label={t('duel.admin.comment')}
      submitLabel={t('duel.admin.resolve')}
      required
      maxLength={500}
      onClose={onClose}
      onSubmit={async (comment) => {
        await resolveDuel(
          duel.id,
          mode === 'SCORE' && toWin !== null
            ? { result: { winnerId, winnerSets: toWin, loserSets }, comment }
            : { comment },
        );
        await onDone();
      }}
      errorText={(error) => duelErrorText(error, t)}
    >
      <RadioGroup
        value={mode}
        onChange={(event) => {
          setMode(event.target.value === 'VOID' ? 'VOID' : 'SCORE');
        }}
        sx={{ mb: 2 }}
      >
        <FormControlLabel
          value="SCORE"
          control={<Radio />}
          label={t('duel.admin.resolveScore')}
          disabled={toWin === null || opponent === null}
          sx={{ minHeight: 44 }}
        />
        <FormControlLabel
          value="VOID"
          control={<Radio />}
          label={t('duel.admin.resolveVoid')}
          sx={{ minHeight: 44 }}
        />
      </RadioGroup>
      {mode === 'SCORE' && toWin !== null && opponent !== null && (
        <Box sx={{ mb: 2, display: 'grid', gap: 1.5 }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            orientation="vertical"
            aria-label={t('duel.report.winner')}
            value={winnerId}
            onChange={(_, next: string | null) => {
              if (next !== null) setWinnerId(next);
            }}
          >
            {[duel.author, opponent].map((player) => (
              <ToggleButton key={player.id} value={player.id} sx={{ minHeight: 44 }}>
                {player.name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            aria-label={t('duel.report.score')}
            value={loserSets}
            onChange={(_, next: number | null) => {
              if (next !== null) setLoserSets(next);
            }}
            sx={{ flexWrap: 'wrap' }}
          >
            {Array.from({ length: toWin }, (_, sets) => (
              <ToggleButton
                key={sets}
                value={sets}
                sx={{ minHeight: 44, minWidth: 64, fontVariantNumeric: 'tabular-nums' }}
              >
                {toWin}:{sets}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}
    </TextDialog>
  );
}
