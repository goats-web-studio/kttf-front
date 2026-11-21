import type { FormatConfig, TournamentView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import { updateTournament } from '@/features/tournaments/api';
import FormatFit from '@/features/tournaments/format-fit';
import { isMatchStarted } from '@/features/tournaments/format-reshape';

interface ReshapeAdviceProps {
  readonly tournament: TournamentView;
  readonly participants: number;
  readonly onReshaped: () => void;
}

/**
 * «Пришли четверо, а схема на группы» прямо в консоли — ADR-101.
 *
 * Показывается, пока ни одна встреча не начата и очередь консоли пуста:
 * сервер проводит жеребьёвку заново, и неотправленный счёт лёг бы на
 * встречи, которых уже нет. Смена — запросом, как и правка столов: это
 * решение организатора, а не действие в темпе зала.
 */
export default function ReshapeAdvice({
  tournament,
  participants,
  onReshaped,
}: ReshapeAdviceProps): ReactNode {
  const t = useT();
  const reshape = useMutation({
    mutationFn: (formatConfig: FormatConfig) => updateTournament(tournament.id, { formatConfig }),
    onSuccess: onReshaped,
  });

  return (
    <Box data-reshape-advice sx={{ mb: 2 }}>
      <FormatFit
        format={tournament.formatConfig}
        participants={participants}
        onSwitch={(format) => {
          reshape.mutate(format);
        }}
      />
      {reshape.error !== null && (
        <Typography role="alert" variant="body2" color="error" sx={{ mt: 1 }}>
          {isMatchStarted(reshape.error)
            ? t('lifecycle.reshape.started')
            : t(errorMessageKey(reshape.error))}
        </Typography>
      )}
    </Box>
  );
}
