import type { CoachStudentsView, CoachView, StudentRef } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Medal, Users } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, formatCount, formatDate, useLocale, useT } from '@/common/i18n';
import { Count } from '@/common/ui/motion';
import DeltaPill from '@/common/ui/delta-pill';
import PlayerAvatar from '@/common/ui/player-avatar';
import RankBadge from '@/common/ui/rank-badge';
import RatingValue from '@/common/ui/rating-value';
import StatTile from '@/common/ui/stat-tile';
import { VISUALLY_HIDDEN } from '@/common/ui/visually-hidden';
import { useSessionStore } from '@/features/auth/session-store';
import { usePlaceName } from '@/features/places/place-name';
import { playerKeys, playerQuery } from '@/features/players/queries';

import { becomeStudent, leaveStudent } from '../api';
import { coachShortName } from '../labels';
import { coachKeys, coachStudentsQuery } from '../queries';
import { hasStudents, studentState } from './staff-model';

/**
 * «Ученики» на странице тренера (T2.1, `docs/11` 3.2.1): числа, топ по
 * рейтингу, медали за месяц, лучший рост и последние турниры учеников
 * (T3). Младшие 14 — только числом:
 * сервер их по имени и не отдаёт. Пустые части не выводятся (ADR-042).
 */
export default function StudentsBlock({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const students = useQuery(coachStudentsQuery(coach.id));
  const data = students.data;
  const shown = data !== undefined && hasStudents(data);

  // Одно дерево при любых данных: «Я ученик» не пересоздаётся, когда
  // приходят ученики, и открытое подтверждение не закрывается само.
  return (
    <Box
      id="students"
      component="section"
      data-coach-students={shown ? '' : undefined}
      sx={{ mt: { xs: 4, md: 6 } }}
    >
      {shown && (
        <>
          <Typography variant="h2" sx={{ mb: 2 }}>
            {t('students.title')}
          </Typography>
          <StudentsContent view={data} />
        </>
      )}
      <Box sx={{ mt: shown ? 2 : 0 }}>
        <IAmStudent coach={coach} />
      </Box>
    </Box>
  );
}

export function StudentsContent({ view }: { readonly view: CoachStudentsView }): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box
        data-students-counts
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))',
        }}
      >
        <StatTile
          icon={Users}
          label={t('students.current')}
          value={<Count value={view.current} />}
        />
        {view.younger > 0 && (
          <StatTile
            icon={Users}
            label={t('students.younger')}
            value={<Count value={view.younger} />}
          />
        )}
        {view.former > 0 && (
          <StatTile
            icon={Users}
            label={t('students.former')}
            value={<Count value={view.former} />}
          />
        )}
        {view.medals.total > 0 && (
          <StatTile
            icon={Medal}
            label={t('students.medals')}
            value={<Count value={view.medals.total} />}
          />
        )}
      </Box>

      {view.top.length > 0 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }} data-students-top>
          <Typography variant="h3" sx={{ mb: 1.5 }}>
            {t('students.top')}
          </Typography>
          {/* Две колонки на широком экране: девять строк во всю ширину были
              именем слева и числом справа через пустой экран. Порядок —
              сверху вниз по колонкам, как читают рейтинг. */}
          <Box
            component="ol"
            sx={{
              m: 0,
              p: 0,
              listStyle: 'none',
              display: 'grid',
              columnGap: 4,
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
              gridAutoFlow: { md: 'column' },
              gridTemplateRows: { md: `repeat(${String(Math.ceil(view.top.length / 2))}, auto)` },
            }}
          >
            {view.top.map((student, index) => (
              <StudentLine
                key={student.id}
                player={student}
                lead={
                  <Typography
                    component="span"
                    color="text.secondary"
                    sx={{ width: 20, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatCount(index + 1, locale)}
                  </Typography>
                }
              >
                <RatingValue value={student.rating} sx={{ fontWeight: 600, fontSize: 17 }} />
              </StudentLine>
            ))}
          </Box>
        </Paper>
      )}

      {view.medals.recent.length > 0 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }} data-students-medals>
          <Typography variant="h3" sx={{ mb: 1 }}>
            {fill(t('students.medalsRecent'), { count: formatCount(view.medals.total, locale) })}
          </Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
            {view.medals.recent.map((medal) => (
              <Box
                component="li"
                key={`${medal.player.id}-${medal.tournament.id}`}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}
              >
                {/* Значок и фото не сжимаются, когда название турнира
                    переносится на телефоне. */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                  <RankBadge rank={medal.place} />
                  <PlayerAvatar
                    lastName={medal.player.lastName}
                    firstName={medal.player.firstName}
                    photoUrl={medal.player.photoUrl}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Link href={`/players/${medal.player.id}`} sx={{ fontWeight: 600 }}>
                    {`${medal.player.lastName} ${medal.player.firstName}`}
                  </Link>
                  <Typography variant="body2" color="text.secondary">
                    <Link href={`/tournaments/${medal.tournament.id}`} color="inherit">
                      {medal.tournament.name}
                    </Link>
                    {` · ${formatDate(medal.tournament.startsAt, locale)}`}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {view.tournaments.length > 0 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }} data-students-tournaments>
          <Typography variant="h3">{t('students.tournaments')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
            {t('students.tournaments.hint')}
          </Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1.5 }}>
            {view.tournaments.map((row) => (
              <Box
                component="li"
                key={row.tournament.id}
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  columnGap: 2,
                  rowGap: 0.75,
                  minWidth: 0,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Link href={`/tournaments/${row.tournament.id}`} sx={{ fontWeight: 600 }}>
                    {row.tournament.name}
                  </Link>
                  <Typography variant="body2" color="text.secondary">
                    {`${formatDate(row.tournament.startsAt, locale)} · ${fill(
                      t('students.tournaments.count'),
                      { count: formatCount(row.students, locale) },
                    )}`}
                  </Typography>
                </Box>
                <MedalCounts gold={row.gold} silver={row.silver} bronze={row.bronze} />
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {view.growth.length > 0 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }} data-students-growth>
          <Typography variant="h3" sx={{ mb: 1.5 }}>
            {t('students.growth')}
          </Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid' }}>
            {view.growth.map((row) => (
              <StudentLine key={row.player.id} player={row.player}>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <RatingValue value={row.player.rating} sx={{ color: 'text.secondary' }} />
                  <DeltaPill value={row.delta} />
                </Box>
              </StudentLine>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
}

/**
 * Ученик строкой: фото или инициалы, имя ссылкой на профиль, город под
 * именем, справа — число (рейтинг, рост). Всё, что сервер уже отдаёт об
 * ученике: строка «имя — число» через всю карточку читалась пустой.
 */
function StudentLine({
  player,
  lead,
  children,
}: {
  readonly player: StudentRef;
  /** Слева от фото: место в списке. */
  readonly lead?: ReactNode;
  readonly children: ReactNode;
}): ReactNode {
  const placeName = usePlaceName();

  return (
    <Box
      component="li"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minHeight: 56,
        py: 0.75,
        borderBottom: '1px solid var(--line)',
      }}
    >
      {lead}
      <Box sx={{ display: 'flex', flexShrink: 0 }}>
        <PlayerAvatar
          lastName={player.lastName}
          firstName={player.firstName}
          photoUrl={player.photoUrl}
        />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Link href={`/players/${player.id}`} sx={{ fontWeight: 600 }}>
          {`${player.lastName} ${player.firstName}`}
        </Link>
        <Typography variant="body2" color="text.secondary" noWrap>
          {placeName(player.city)}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}

/**
 * Медали учеников на турнире — тем же кружком цвета медали, что места в
 * таблицах (`RankBadge`), и числом рядом. Без медалей — ничего: строка
 * «0 · 0 · 0» читалась бы упрёком.
 */
function MedalCounts({
  gold,
  silver,
  bronze,
}: {
  readonly gold: number;
  readonly silver: number;
  readonly bronze: number;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const medals = [
    { place: 1, count: gold },
    { place: 2, count: silver },
    { place: 3, count: bronze },
  ].filter((medal) => medal.count > 0);

  if (medals.length === 0) return null;

  return (
    <Box
      component="ul"
      data-students-tournament-medals
      sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', gap: 1.5 }}
    >
      {medals.map((medal) => (
        <Box
          component="li"
          key={medal.place}
          data-medal={medal.place}
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
        >
          <Box component="span" aria-hidden sx={{ display: 'inline-flex', alignItems: 'center' }}>
            <RankBadge rank={medal.place} />
            <Box
              component="span"
              sx={{ ml: 0.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
            >
              {`×${formatCount(medal.count, locale)}`}
            </Box>
          </Box>
          <Box component="span" sx={VISUALLY_HIDDEN}>
            {fill(t('students.tournaments.place'), {
              place: String(medal.place),
              count: formatCount(medal.count, locale),
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/**
 * «Я ученик» — вошедший игрок ставит тренера в свою анкету (T2.1). Уже
 * ученик — «Вы ученик» и «Больше не ученик». Тренер в анкете меняется,
 * поэтому с подтверждением.
 */
export function IAmStudent({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const id = useId();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const own = useQuery({
    ...playerQuery(user?.playerId ?? ''),
    enabled: user?.playerId != null,
  });
  const state = studentState(user, coach, own.data);
  const [confirming, setConfirming] = useState(false);
  const change = useMutation({
    mutationFn: (join: boolean) => (join ? becomeStudent(coach.id) : leaveStudent(coach.id)),
    onSuccess: async () => {
      setConfirming(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: playerKeys.all }),
        queryClient.invalidateQueries({ queryKey: coachKeys.all }),
      ]);
    },
  });

  if (state === 'hidden') return null;

  const coachName = coachShortName(coach.player);
  const current = own.data?.coachName ?? null;

  return (
    <Paper
      variant="outlined"
      data-student-state={state}
      sx={{
        p: 2,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
      }}
    >
      <Typography sx={{ fontWeight: state === 'student' ? 600 : 400 }}>
        {t(state === 'student' ? 'students.me.is' : 'students.me.ask')}
      </Typography>
      {state === 'student' ? (
        <Button
          variant="text"
          disabled={change.isPending}
          onClick={() => {
            change.mutate(false);
          }}
          sx={{ minHeight: 44 }}
        >
          {t('students.me.leave')}
        </Button>
      ) : (
        <Button
          disabled={change.isPending}
          onClick={() => {
            setConfirming(true);
          }}
          sx={{ minHeight: 44 }}
        >
          {t('students.me.join')}
        </Button>
      )}
      {change.error !== null && !confirming && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {t(errorMessageKey(change.error))}
        </Alert>
      )}
      <Dialog
        open={confirming}
        onClose={() => {
          setConfirming(false);
        }}
        aria-labelledby={id}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id={id}>{t('students.me.join')}</DialogTitle>
        <DialogContent>
          <Typography>
            {current === null
              ? fill(t('students.me.confirm'), { coach: coachName })
              : fill(t('students.me.confirmReplace'), { coach: coachName, current })}
          </Typography>
          {change.error !== null && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {t(errorMessageKey(change.error))}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            variant="text"
            onClick={() => {
              setConfirming(false);
            }}
            sx={{ minHeight: 44 }}
          >
            {t('applications.coaches.cancel')}
          </Button>
          <Button
            disabled={change.isPending}
            onClick={() => {
              change.mutate(true);
            }}
            sx={{ minHeight: 44 }}
          >
            {t('students.me.confirmAction')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
