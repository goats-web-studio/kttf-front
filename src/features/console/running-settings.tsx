import { nextPowerOfTwo } from '@kttf/shared/brackets';
import type {
  FormatConfig,
  StageView,
  TournamentView,
  UpdateTournamentInput,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import IntegerField from '@/common/ui/integer-field';
import { updateTournament } from '@/features/tournaments/api';
import { SetsField } from '@/features/tournaments/format-editor';
import { previewFormat } from '@/features/tournaments/format-preview';
import PlayoffLengths from '@/features/tournaments/playoff-lengths';

import ConsoleDialog, { DialogSection } from './console-dialog';

interface RunningSettingsProps {
  readonly tournament: TournamentView;
  readonly stages: readonly StageView[];
  /** Сколько участников в турнире — размер будущей сетки, пока её нет. */
  readonly participants: number;
  readonly online: boolean;
  readonly onClose: () => void;
  /** Сервер принял правку: снимок консоли нужно освежить. */
  readonly onSaved: (tournament: TournamentView) => void;
}

/**
 * Настройки по ходу турнира — ADR-061.
 *
 * Сломался стол или освободился соседний зал — меняется число столов.
 * Турнир затянулся — финал играют до трёх побед вместо четырёх. Жеребьёвка
 * при этом не трогается. Длина меняется только у ещё не начатых встреч:
 * начатые сервер называет в отказе.
 *
 * Правка идёт запросом, а не очередью: это решение организатора, а не
 * действие в темпе зала, и в офлайне кнопка погашена (запрет №1 касается
 * счёта, а не настроек).
 */
export default function RunningSettings({
  tournament,
  stages,
  participants,
  online,
  onClose,
  onSaved,
}: RunningSettingsProps): ReactNode {
  const t = useT();
  const [tables, setTables] = useState<number | null>(tournament.tableCount);
  const [format, setFormat] = useState<FormatConfig>(tournament.formatConfig);

  const save = useMutation({
    mutationFn: (input: UpdateTournamentInput) => updateTournament(tournament.id, input),
    onSuccess: onSaved,
  });

  const changes: UpdateTournamentInput = {
    ...(tables !== null && tables !== tournament.tableCount ? { tableCount: tables } : {}),
    ...(JSON.stringify(format) !== JSON.stringify(tournament.formatConfig)
      ? { formatConfig: format }
      : {}),
  };

  return (
    <ConsoleDialog caption={tournament.name} title={t('console.settings.title')} onClose={onClose}>
      <Typography variant="body2" color="text.secondary" component="p">
        {t('console.settings.lead')}
      </Typography>

      <DialogSection title={t('console.settings.tables')}>
        <IntegerField
          label={t('tournament.form.tableCount')}
          value={tables}
          onChange={setTables}
          slotProps={{ htmlInput: { min: 1, max: 200 } }}
          sx={{ mt: 1, maxWidth: 200 }}
        />
      </DialogSection>

      <DialogSection title={t('console.settings.lengths')}>
        <Box
          sx={{ mt: 1, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
        >
          {format.type === 'GROUPS_KNOCKOUT' ? (
            <>
              <SetsField
                label="tournament.form.groupSetsToWin"
                value={format.groupSetsToWin}
                onChange={(value) => {
                  setFormat({ ...format, groupSetsToWin: value });
                }}
              />
              <SetsField
                label="tournament.form.koSetsToWin"
                value={format.koSetsToWin}
                onChange={(value) => {
                  setFormat({ ...format, koSetsToWin: value });
                }}
              />
            </>
          ) : (
            <SetsField
              label="tournament.form.setsToWin"
              value={format.setsToWin}
              onChange={(value) => {
                setFormat({ ...format, setsToWin: value });
              }}
            />
          )}
        </Box>

        {(format.type === 'KNOCKOUT' || format.type === 'GROUPS_KNOCKOUT') && (
          <PlayoffLengths
            base={format.type === 'GROUPS_KNOCKOUT' ? format.koSetsToWin : format.setsToWin}
            lengths={format.playoffSetsToWin ?? {}}
            bracketSize={bracketSizeOf(format, stages, participants)}
            thirdPlace={format.thirdPlace}
            onChange={(lengths) => {
              setFormat({ ...format, playoffSetsToWin: lengths });
            }}
          />
        )}

        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5 }}>
          {t('console.settings.lengthsHint')}
        </Typography>
      </DialogSection>

      {save.error !== null && (
        <Typography role="alert" variant="body2" color="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(save.error))}
        </Typography>
      )}
      {!online && (
        <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
          {t('console.settings.offline')}
        </Typography>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="text" size="large" onClick={onClose} sx={{ minHeight: 48 }}>
          {t('console.finish.back')}
        </Button>
        <Button
          variant="contained"
          size="large"
          disabled={!online || save.isPending || Object.keys(changes).length === 0}
          onClick={() => {
            save.mutate(changes);
          }}
          sx={{ minHeight: 48 }}
        >
          {t('console.settings.save')}
        </Button>
      </Box>
    </ConsoleDialog>
  );
}

/**
 * Размер основной сетки: по самой сетке, если она построена, иначе — по
 * предпросчёту схемы на нынешний состав. От него зависит, какие круги
 * предлагать.
 */
function bracketSizeOf(
  format: FormatConfig,
  stages: readonly StageView[],
  participants: number,
): number {
  const knockout = stages.find((stage) => stage.type === 'KNOCKOUT');
  const rounds = Math.max(0, ...(knockout?.matches.map((match) => match.bracketRound ?? 0) ?? []));

  return rounds > 0 ? nextPowerOfTwo(2 ** rounds) : previewFormat(format, participants).bracketSize;
}
