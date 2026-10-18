import type { MatchResultInput, MatchView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

import ConsoleDialog, { DialogSection } from './console-dialog';
import type { TableState } from './queue';
import ScorePad from './score-pad';
import TablePicker from './table-picker';
import { minutesSince } from './use-now';

interface MatchDialogProps {
  readonly match: MatchView;
  /** Этап и группа — `matchLabel`. */
  readonly label: string;
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
  readonly tables: readonly TableState[];
  readonly suggested: number | null;
  /**
   * Стол, за которым ещё играет кто-то из этой пары. Пока он занят, звать
   * пару на другой стол нельзя: один человек оказался бы на двух столах.
   */
  readonly busyTable?: number | null;
  readonly setsToWin: number;
  readonly now: number;
  readonly onClose: () => void;
  readonly onAssign: (tableNumber: number) => void;
  /** `correcting` — правка уже введённого, уходит в журнал (ТЗ 6.3). */
  readonly onResult: (input: MatchResultInput, correcting: boolean) => void;
  readonly onCancel: () => void;
}

/**
 * Всё, что судья делает со встречей, — в одном окне.
 *
 * Что внутри, решает состояние встречи, а не судья:
 * - ждёт в очереди — выбрать стол; счёт без стола тоже можно, ТЗ 6.3 этого
 *   не запрещает, и в маленьком зале стол часто не назначают вовсе;
 * - идёт на столе — счёт первым делом, ради него окно и открыли; ниже
 *   перенос на другой стол и возврат в очередь;
 * - сыграна — исправление результата, спрятанное за кнопкой: правка идёт
 *   в журнал, и случайно попасть в неё касанием не должно быть возможно.
 */
export default function MatchDialog(props: MatchDialogProps): ReactNode {
  const { match, label, names, ratings, onClose } = props;
  const t = useT();
  const played = match.setsA !== null && match.setsB !== null;
  const caption =
    match.tableNumber === null
      ? label
      : `${fill(t('console.dialog.table'), { number: String(match.tableNumber) })} · ${label}`;

  return (
    <ConsoleDialog
      caption={caption}
      title={<Pair match={match} names={names} ratings={ratings} />}
      onClose={onClose}
    >
      {played ? (
        <FinishedBody {...props} />
      ) : match.status === 'PLAYING' ? (
        <PlayingBody {...props} />
      ) : (
        <QueuedBody {...props} />
      )}
    </ConsoleDialog>
  );
}

/**
 * Пара в заголовке окна: фамилия на строку, рейтинг рядом, счёт справа.
 * В одну строку «Фамилия Имя 597.00 — Фамилия Имя 528.00» на телефоне
 * рвётся посередине фамилии.
 */
function Pair({
  match,
  names,
  ratings,
}: {
  readonly match: MatchView;
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();
  const played = match.setsA !== null && match.setsB !== null;

  return (
    <Box component="span" sx={{ display: 'grid', gap: 0.25 }}>
      {(['A', 'B'] as const).map((side) => {
        const id = side === 'A' ? match.playerAId : match.playerBId;
        const sets = side === 'A' ? match.setsA : match.setsB;
        const other = side === 'A' ? match.setsB : match.setsA;
        const won = played && (sets ?? 0) > (other ?? 0);

        return (
          <Box
            key={side}
            component="span"
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 1,
              ...(won ? { color: 'primary.main' } : {}),
              ...(played && !won ? { color: 'text.secondary', fontWeight: 400 } : {}),
            }}
          >
            <Box component="span" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              {id === null
                ? t('console.match.pending')
                : (names.get(id) ?? t('console.match.unknownPlayer'))}
            </Box>
            {id !== null && (
              <Box
                component="span"
                sx={{ typography: 'caption', color: 'text.secondary', fontWeight: 400 }}
              >
                {ratings.get(id) ?? ''}
              </Box>
            )}
            {played && (
              <Box
                component="span"
                sx={{
                  ml: 'auto',
                  fontFamily: "'Oswald', system-ui, sans-serif",
                  fontSize: 22,
                  lineHeight: '26px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {sets}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function nameOf(names: ReadonlyMap<string, string>, id: string | null): string | undefined {
  return id === null ? undefined : names.get(id);
}

function QueuedBody({
  match,
  names,
  tables,
  suggested,
  busyTable = null,
  setsToWin,
  onAssign,
  onResult,
}: MatchDialogProps): ReactNode {
  const t = useT();
  const [scoring, setScoring] = useState(false);

  return (
    <>
      <DialogSection title={t('console.dialog.pickTable')}>
        {busyTable === null ? (
          <TablePicker tables={tables} suggested={suggested} onPick={onAssign} />
        ) : (
          // Раньше выбор стола здесь не смотрел на занятость игроков, и пару
          // можно было поставить, пока один из них ещё играл за другим.
          <Typography role="status" variant="body2" color="warning.main">
            {fill(t('console.queue.busy'), { number: String(busyTable) })}
          </Typography>
        )}
      </DialogSection>

      <Box sx={{ mt: 3 }}>
        {scoring ? (
          <DialogSection title={t('console.dialog.result')}>
            <ScorePad
              setsToWin={setsToWin}
              nameA={nameOf(names, match.playerAId)}
              nameB={nameOf(names, match.playerBId)}
              onSubmit={(input) => {
                onResult(input, false);
              }}
            />
          </DialogSection>
        ) : (
          <Button
            variant="text"
            size="large"
            onClick={() => {
              setScoring(true);
            }}
            sx={{ minHeight: 56, color: 'text.secondary' }}
          >
            {t('console.dialog.scoreNow')}
          </Button>
        )}
      </Box>
    </>
  );
}

function PlayingBody({
  match,
  names,
  tables,
  suggested,
  setsToWin,
  now,
  onAssign,
  onResult,
  onCancel,
}: MatchDialogProps): ReactNode {
  const t = useT();
  const [moving, setMoving] = useState(false);
  const minutes = minutesSince(match.startedAt, now);

  return (
    <>
      <DialogSection title={t('console.dialog.result')}>
        {minutes !== null && (
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
            {t('console.playing.inProgress')} ·{' '}
            {fill(t('console.table.minutes'), { minutes: String(minutes) })}
          </Typography>
        )}
        <ScorePad
          setsToWin={setsToWin}
          nameA={nameOf(names, match.playerAId)}
          nameB={nameOf(names, match.playerBId)}
          onSubmit={(input) => {
            onResult(input, false);
          }}
        />
      </DialogSection>

      {moving && (
        <DialogSection title={t('console.dialog.moveTable')}>
          <TablePicker
            tables={tables}
            suggested={suggested}
            current={match.tableNumber}
            onPick={onAssign}
          />
        </DialogSection>
      )}

      <Box
        sx={{
          mt: 3,
          pt: 1.5,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {!moving && (
          <Button
            variant="text"
            size="large"
            onClick={() => {
              setMoving(true);
            }}
            sx={{ minHeight: 56, color: 'text.secondary' }}
          >
            {t('console.dialog.moveTable')}
          </Button>
        )}
        <Button
          variant="text"
          size="large"
          onClick={onCancel}
          sx={{ minHeight: 56, color: 'text.secondary' }}
        >
          {t('console.match.returnToQueue')}
        </Button>
      </Box>
    </>
  );
}

function FinishedBody({ match, names, setsToWin, onResult }: MatchDialogProps): ReactNode {
  const t = useT();
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <Button
        size="large"
        onClick={() => {
          setEditing(true);
        }}
        sx={{ minHeight: 56 }}
      >
        {t('console.dialog.editResult')}
      </Button>
    );
  }

  return (
    <DialogSection title={t('console.dialog.editResult')}>
      <Typography variant="caption" color="warning.main" component="p" sx={{ mb: 1 }}>
        {t('console.dialog.editLead')}
      </Typography>
      <ScorePad
        setsToWin={setsToWin}
        nameA={nameOf(names, match.playerAId)}
        nameB={nameOf(names, match.playerBId)}
        onSubmit={(input) => {
          onResult(input, true);
        }}
      />
    </DialogSection>
  );
}
