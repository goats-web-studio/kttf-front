import type { MatchResultInput, MatchView } from '@kttf/shared/types';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

import MatchLine from './match-line';
import ScorePad from './score-pad';

interface PlayingZoneProps {
  readonly matches: readonly MatchView[];
  readonly names: ReadonlyMap<string, string>;
  readonly setsToWinOf: (match: MatchView) => number;
  readonly onResult: (matchId: string, input: MatchResultInput) => void;
  readonly onCancel: (matchId: string) => void;
}

/**
 * Зона «Играется» — ТЗ 6.1, ввод счёта — ТЗ 6.3.
 *
 * Два действия на закрытие встречи: касание карточки раскрывает кнопки,
 * касание кнопки закрывает встречу. Ничего больше между ними нет — ни
 * подтверждения, ни выбора победителя отдельным шагом.
 */
export default function PlayingZone({
  matches,
  names,
  setsToWinOf,
  onResult,
  onCancel,
}: PlayingZoneProps): ReactNode {
  const t = useT();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section>
      <Typography
        component="h2"
        variant="subtitle2"
        color="text.secondary"
        sx={{ fontWeight: 600 }}
      >
        {t('console.playing.title')}
      </Typography>

      {matches.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('console.playing.empty')}
        </Typography>
      ) : (
        <Stack component="ul" spacing={1} sx={{ mt: 1, p: 0, listStyle: 'none' }}>
          {matches.map((match) => (
            <Paper key={match.id} component="li" variant="outlined" sx={{ p: 1.5 }}>
              <ButtonBase
                aria-expanded={openId === match.id}
                onClick={() => {
                  setOpenId(openId === match.id ? null : match.id);
                }}
                sx={{
                  display: 'block',
                  width: '100%',
                  minHeight: 56,
                  textAlign: 'left',
                  typography: 'body1',
                  borderRadius: 1,
                }}
              >
                <Typography component="span" variant="caption" color="text.secondary">
                  {t('console.table.number')} {match.tableNumber}
                </Typography>
                <MatchLine match={match} names={names} />
              </ButtonBase>

              {openId === match.id && (
                <>
                  <ScorePad
                    setsToWin={setsToWinOf(match)}
                    onSubmit={(input) => {
                      setOpenId(null);
                      onResult(match.id, input);
                    }}
                  />
                  <Button
                    variant="text"
                    size="large"
                    onClick={() => {
                      setOpenId(null);
                      onCancel(match.id);
                    }}
                    sx={{ mt: 1.5, minHeight: 56, color: 'text.secondary' }}
                  >
                    {t('console.match.returnToQueue')}
                  </Button>
                </>
              )}
            </Paper>
          ))}
        </Stack>
      )}
    </section>
  );
}
