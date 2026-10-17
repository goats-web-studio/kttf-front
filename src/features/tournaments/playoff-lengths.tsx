import { playoffRoundsFor, type PlayoffRound } from '@kttf/shared/brackets';
import type { PlayoffSetsToWin } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

import { fill, useT, type MessageKey } from '@/common/i18n';

const ROUND_KEYS: Readonly<Record<PlayoffRound, MessageKey>> = {
  final: 'tournament.round.final',
  thirdPlace: 'tournament.round.thirdPlace',
  semifinal: 'tournament.round.semifinal',
  quarterfinal: 'tournament.round.quarterfinal',
  roundOf16: 'tournament.round.roundOf16',
  roundOf32: 'tournament.round.roundOf32',
  roundOf64: 'tournament.round.roundOf64',
};

const LENGTH_KEYS: Readonly<Record<2 | 3 | 4, MessageKey>> = {
  2: 'tournament.form.bo3',
  3: 'tournament.form.bo5',
  4: 'tournament.form.bo7',
};

interface PlayoffLengthsProps {
  /** Общая длина плей-офф — ею играется всё, что здесь не задано. */
  readonly base: 2 | 3 | 4;
  readonly lengths: PlayoffSetsToWin;
  /** Размер сетки при ожидаемом числе участников — из предпросчёта движка. */
  readonly bracketSize: number;
  readonly thirdPlace: boolean;
  readonly onChange: (lengths: PlayoffSetsToWin) => void;
}

/**
 * Длина встреч по кругам плей-офф — ТЗ 5.2, ADR-044.
 *
 * Свёрнуто по умолчанию: у обычного клубного турнира весь плей-офф одной
 * длины, и шесть лишних полей в форме на тридцать секунд (ТЗ 4.2) мешают.
 * Раскрыто, если что-то уже задано, — иначе настройка действует, а её не
 * видно.
 *
 * Предлагаются только круги, которые будут в сетке при ожидаемом числе
 * участников. Заданное для кругов, которых сейчас не видно, не стирается:
 * число участников — предположение, и оно ещё поменяется.
 */
export default function PlayoffLengths({
  base,
  lengths,
  bracketSize,
  thirdPlace,
  onChange,
}: PlayoffLengthsProps): ReactNode {
  const t = useT();
  const configured = Object.values(lengths).some((value) => value !== undefined);
  const [open, setOpen] = useState(configured);
  const rounds = playoffRoundsFor(bracketSize, thirdPlace);

  if (rounds.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Button
        variant="text"
        aria-expanded={open || configured}
        onClick={() => {
          setOpen(!open);
        }}
        sx={{ minHeight: 44, px: 0 }}
      >
        {t('tournament.form.playoffRounds')}
      </Button>

      {(open || configured) && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('tournament.form.playoffRounds.hint')}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            }}
          >
            {rounds.map((round) => (
              <TextField
                key={round}
                select
                label={t(ROUND_KEYS[round])}
                value={lengths[round] === undefined ? '' : String(lengths[round])}
                onChange={(event) => {
                  onChange({ ...lengths, [round]: toLength(event.target.value) });
                }}
              >
                <MenuItem value="">
                  {fill(t('tournament.form.sameAsPlayoff'), { length: t(LENGTH_KEYS[base]) })}
                </MenuItem>
                <MenuItem value="2">{t('tournament.form.bo3')}</MenuItem>
                <MenuItem value="3">{t('tournament.form.bo5')}</MenuItem>
                <MenuItem value="4">{t('tournament.form.bo7')}</MenuItem>
              </TextField>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

function toLength(value: string): 2 | 3 | 4 | undefined {
  if (value === '2') return 2;
  if (value === '3') return 3;
  if (value === '4') return 4;
  return undefined;
}
