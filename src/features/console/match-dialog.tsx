import type { MatchResultInput, MatchView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
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
  /**
   * Снятие участника по ходу турнира — ADR-061: неявка или снятие. Все его
   * несыгранные встречи становятся техническими поражениями.
   */
  readonly onWithdraw: (playerId: string, status: WithdrawStatus) => void;
}

export type WithdrawStatus = 'WITHDRAWN' | 'NO_SHOW';

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
 *
 * У несыгранной встречи внизу — «Игрок выбыл» (ADR-061): неявка и снятие
 * с турнира, каждое с подтверждением. Отказ по ходу встречи — в вводе счёта.
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
                  fontFamily: 'var(--font-mono)',
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
  onWithdraw,
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
              onRetire={(input, retiree, withdraw) => {
                retire(match, input, retiree, withdraw, onResult, onWithdraw);
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

      <Dropout match={match} names={names} noShow onWithdraw={onWithdraw} />
    </>
  );
}

/**
 * Отказ: сначала счёт, потом, если отмечено, снятие. В очереди операций
 * порядок тот же — сервер запишет встречу и только затем снимет игрока.
 */
function retire(
  match: MatchView,
  input: MatchResultInput,
  retiree: 'A' | 'B',
  withdraw: boolean,
  onResult: MatchDialogProps['onResult'],
  onWithdraw: MatchDialogProps['onWithdraw'],
): void {
  onResult(input, false);

  const playerId = retiree === 'A' ? match.playerAId : match.playerBId;

  if (withdraw && playerId !== null) onWithdraw(playerId, 'WITHDRAWN');
}

/**
 * «Игрок выбыл» — ADR-061.
 *
 * Свёрнуто за кнопкой и с подтверждением: действие задевает все оставшиеся
 * встречи игрока, а не одну эту. Неявка — только у встречи в очереди: кто
 * уже сел за стол, тот явился. Вернуть снятого можно в составе турнира.
 */
function Dropout({
  match,
  names,
  noShow,
  onWithdraw,
}: {
  readonly match: MatchView;
  readonly names: ReadonlyMap<string, string>;
  readonly noShow: boolean;
  readonly onWithdraw: MatchDialogProps['onWithdraw'];
}): ReactNode {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<{ playerId: string; status: WithdrawStatus } | null>(null);
  const players = [match.playerAId, match.playerBId].filter((id) => id !== null);

  return (
    <Box sx={{ mt: 3, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
      {!open ? (
        <Button
          variant="text"
          size="large"
          onClick={() => {
            setOpen(true);
          }}
          sx={{ minHeight: 56, color: 'text.secondary' }}
        >
          {t('console.dropout.open')}
        </Button>
      ) : chosen === null ? (
        <DialogSection title={t('console.dropout.title')}>
          <Typography variant="body2" color="text.secondary" component="p" sx={{ mb: 1 }}>
            {t('console.dropout.lead')}
          </Typography>
          {players.map((playerId) => (
            // Имя строкой, кнопки под ним сеткой: на телефоне в одну строку
            // с длинной фамилией они ломались вразнобой.
            <Box key={playerId} sx={{ mt: 1.5 }}>
              <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                {names.get(playerId) ?? t('console.match.unknownPlayer')}
              </Typography>
              <Box
                sx={{
                  mt: 0.75,
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: noShow ? '1fr 1fr' : '1fr',
                }}
              >
                {noShow && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setChosen({ playerId, status: 'NO_SHOW' });
                    }}
                    sx={{ minHeight: 48 }}
                  >
                    {t('console.dropout.noShow')}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  onClick={() => {
                    setChosen({ playerId, status: 'WITHDRAWN' });
                  }}
                  sx={{ minHeight: 48 }}
                >
                  {t('console.dropout.withdraw')}
                </Button>
              </Box>
            </Box>
          ))}
        </DialogSection>
      ) : (
        <Alert
          severity="warning"
          variant="outlined"
          action={
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Button
                color="warning"
                onClick={() => {
                  setChosen(null);
                }}
                sx={{ minHeight: 44 }}
              >
                {t('console.dropout.back')}
              </Button>
              <Button
                variant="contained"
                color="warning"
                onClick={() => {
                  onWithdraw(chosen.playerId, chosen.status);
                }}
                sx={{ minHeight: 44 }}
              >
                {chosen.status === 'NO_SHOW'
                  ? t('console.dropout.confirmNoShow')
                  : t('console.dropout.confirmWithdraw')}
              </Button>
            </Box>
          }
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          {fill(t('console.dropout.confirm'), {
            name: names.get(chosen.playerId) ?? t('console.match.unknownPlayer'),
          })}
        </Alert>
      )}
    </Box>
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
  onWithdraw,
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
          onRetire={(input, retiree, withdraw) => {
            retire(match, input, retiree, withdraw, onResult, onWithdraw);
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

      <Dropout match={match} names={names} noShow={false} onWithdraw={onWithdraw} />
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
