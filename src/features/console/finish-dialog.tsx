import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';

import ConsoleDialog, { DialogSection } from './console-dialog';
import PlacesList from './places-list';
import { consoleResultsQuery } from './use-console';

interface FinishDialogProps {
  readonly tournamentId: string;
  readonly isPending: boolean;
  readonly error: unknown;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
  /**
   * Прогноз рейтинга по местам — ADR-077: с бонусом призёрам он совпадает
   * с тем, что начислится. Организатор видит дельты до «Завершить».
   */
  readonly project: (
    placements: readonly { readonly playerId: string; readonly place: number }[],
  ) => ReadonlyMap<string, number>;
}

/**
 * Проверка итогов перед завершением — ТЗ 4.1.
 *
 * Завершение необратимо: рейтинг расходится по журналу и профилям сразу, а
 * счёт закрытого турнира уже не правится. Поэтому судья сначала видит места
 * так, как их выставит сервер, и только потом закрывает турнир. Ошибку в
 * счёте полуфинала здесь ещё можно заметить; после — уже нет.
 */
export default function FinishDialog({
  tournamentId,
  isPending,
  error,
  onConfirm,
  onClose,
  project,
}: FinishDialogProps): ReactNode {
  const t = useT();
  const results = useQuery(consoleResultsQuery(tournamentId));
  // Неразведённое равенство сервер не пропустит (ADR-008) — лучше сказать
  // об этом здесь, чем отказом после нажатия.
  const unresolved = (results.data?.unresolved.length ?? 0) > 0;

  return (
    <ConsoleDialog
      caption={t('console.finish.caption')}
      title={t('console.finish.title')}
      onClose={onClose}
    >
      <Typography variant="body2" color="text.secondary">
        {t('console.finish.lead')}
      </Typography>

      <Box sx={{ mt: 2 }}>
        <QueryState
          isPending={results.isPending}
          error={results.error}
          onRetry={() => void results.refetch()}
        >
          {results.data !== undefined && (
            <DialogSection title={t('console.finish.places')}>
              {unresolved && (
                <Alert severity="warning" variant="outlined" sx={{ mb: 1.5 }}>
                  {t('console.finish.ties')}
                </Alert>
              )}
              <PlacesList
                participants={results.data.participants}
                deltas={project(
                  results.data.participants.flatMap((participant) =>
                    participant.place !== null && participant.place <= 3
                      ? [{ playerId: participant.player.id, place: participant.place }]
                      : [],
                  ),
                )}
              />
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
                {t('console.finish.deltaHint')}
              </Typography>
            </DialogSection>
          )}
        </QueryState>
      </Box>

      {error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(error))}
        </Alert>
      )}

      <Box
        sx={{
          mt: 3,
          display: 'flex',
          flexWrap: 'wrap-reverse',
          justifyContent: 'flex-end',
          gap: 1,
        }}
      >
        <Button onClick={onClose} sx={{ minHeight: 48 }}>
          {t('console.finish.back')}
        </Button>
        <Button
          variant="contained"
          disabled={isPending || results.data === undefined || unresolved}
          onClick={onConfirm}
          sx={{ minHeight: 48, fontWeight: 600 }}
        >
          {t('console.finish.confirm')}
        </Button>
      </Box>
    </ConsoleDialog>
  );
}
