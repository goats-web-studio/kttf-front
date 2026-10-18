import type { TournamentStatus } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { CircleCheck, Copy, Trophy } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';

import PlacesList from './places-list';
import { consoleResultsQuery } from './use-console';

interface FinishedPanelProps {
  readonly tournamentId: string;
  readonly status: TournamentStatus;
  readonly played: number;
  /** Повторное начисление — когда турнир закрылся, а рейтинг не лёг. */
  readonly onRate: () => void;
  readonly rating: { readonly isPending: boolean; readonly error: unknown };
  readonly onCopied: () => void;
}

/** Призёров в панели: дальше — на странице итогов. */
const PODIUM = 3;

/**
 * Турнир закрыт — вместо столов и очереди.
 *
 * Судья, нажавший «Завершить», должен увидеть, что это случилось: раньше
 * консоль просто прятала кнопку и оставляла зал с кликабельными столами,
 * хотя сервер уже отказывал в любом счёте. Здесь — подтверждение, призёры и
 * то, что делают после турнира: открывают итоги и рассылают ссылку.
 *
 * Если турнир закрылся, а рейтинг не начислился (ТЗ 4.1 разводит эти два
 * перехода), панель говорит об этом и даёт повторить начисление.
 */
export default function FinishedPanel({
  tournamentId,
  status,
  played,
  onRate,
  rating,
  onCopied,
}: FinishedPanelProps): ReactNode {
  const t = useT();
  const results = useQuery(consoleResultsQuery(tournamentId));
  const url = `${window.location.origin}/tournaments/${tournamentId}`;
  const rated = status === 'RATED';
  const titleId = useId();

  return (
    <Paper
      component="section"
      variant="outlined"
      aria-labelledby={titleId}
      sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}
    >
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 3, md: 5 },
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
            <CircleCheck size={24} aria-hidden />
            <Typography
              id={titleId}
              component="h2"
              sx={{ fontSize: 22, lineHeight: '28px', fontWeight: 700, color: 'text.primary' }}
            >
              {t('console.done.title')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {fill(t('console.done.played'), { count: String(played) })}
            {' · '}
            {t(rated ? 'console.done.rated' : 'console.done.unrated')}
          </Typography>

          {!rated && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                disabled={rating.isPending}
                onClick={onRate}
                sx={{ minHeight: 48 }}
              >
                {t('console.done.rate')}
              </Button>
              {rating.error !== null && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {t(errorMessageKey(rating.error))}
                </Alert>
              )}
            </Box>
          )}

          <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant={rated ? 'contained' : 'outlined'}
              href={`/tournaments/${tournamentId}`}
              startIcon={<Trophy size={18} aria-hidden />}
              sx={{ minHeight: 48 }}
            >
              {t('console.done.results')}
            </Button>
            <Button
              onClick={() => {
                void navigator.clipboard.writeText(url).then(onCopied);
              }}
              startIcon={<Copy size={18} aria-hidden />}
              sx={{ minHeight: 48 }}
            >
              {t('console.done.copy')}
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t('console.done.tv')}
          </Typography>
        </Box>

        <Box>
          <Typography
            component="h3"
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1, fontWeight: 600 }}
          >
            {t('console.done.podium')}
          </Typography>
          <QueryState
            isPending={results.isPending}
            error={results.error}
            onRetry={() => void results.refetch()}
          >
            {results.data !== undefined && (
              <PlacesList
                participants={results.data.participants.filter(
                  (participant) => participant.place !== null && participant.place <= PODIUM,
                )}
              />
            )}
          </QueryState>
        </Box>
      </Box>
    </Paper>
  );
}
