import type { GroupStandingsView, StageView, TieDecisionInput } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { isPlayedOut, matchesOf } from './group-matches';

interface TiePanelProps {
  readonly groups: readonly GroupStandingsView[];
  readonly stages: readonly StageView[];
  readonly names: ReadonlyMap<string, string>;
  readonly onDecide: (input: TieDecisionInput) => void;
  readonly isPending: boolean;
}

/**
 * Равенство очков разрешает судья — ТЗ 6.6, ADR-008.
 *
 * Правила 1–5 система применяет сама; когда их не хватило, порядок остаётся
 * неопределённым, и турнир не переходит в «Завершён». Здесь судья ставит
 * участников в том порядке, который выбрал, — жребий бросает человек,
 * а не система.
 *
 * Панель показывается только у **доигранной** группы. До последней встречи
 * равенство очков — обычное дело: в начале турнира по нулям стоят все, и
 * панель висела бы с первой секунды. Хуже того, решение, принятое рано,
 * записывается в журнал и способно зафиксировать места по случайному выбору
 * судьи, сделанному до того, как сыграна половина группы.
 */
export default function TiePanel({
  groups,
  stages,
  names,
  onDecide,
  isPending,
}: TiePanelProps): ReactNode {
  const t = useT();
  const pending = groups.filter(
    (group) => group.unresolved.length > 0 && isPlayedOut(matchesOf(stages, group)),
  );

  if (pending.length === 0) {
    return null;
  }

  return (
    <Paper component="section" variant="outlined" sx={{ p: 1.5, borderColor: 'warning.main' }}>
      <Typography component="h2" variant="subtitle2" color="warning.main" sx={{ fontWeight: 600 }}>
        {t('console.tie.title')}
      </Typography>
      <Typography variant="caption" color="warning.main" component="p" sx={{ mt: 0.5 }}>
        {t('console.tie.lead')}
      </Typography>

      {pending.map((group) =>
        group.unresolved.map((tie) => (
          <TieOrder
            key={`${group.groupId ?? group.stageId}:${tie.participants.join(',')}`}
            groupId={group.groupId}
            label={group.label}
            participants={tie.participants}
            names={names}
            onDecide={onDecide}
            isPending={isPending}
          />
        )),
      )}
    </Paper>
  );
}

function TieOrder({
  groupId,
  label,
  participants,
  names,
  onDecide,
  isPending,
}: {
  readonly groupId: string | null;
  readonly label: string;
  readonly participants: readonly string[];
  readonly names: ReadonlyMap<string, string>;
  readonly onDecide: (input: TieDecisionInput) => void;
  readonly isPending: boolean;
}): ReactNode {
  const t = useT();
  const [order, setOrder] = useState<readonly string[]>(participants);

  function move(index: number, delta: number): void {
    const target = index + delta;

    if (target < 0 || target >= order.length) {
      return;
    }

    const next = [...order];
    const moved = next[index];
    const displaced = next[target];

    if (moved === undefined || displaced === undefined) {
      return;
    }

    next[index] = displaced;
    next[target] = moved;
    setOrder(next);
  }

  return (
    <Box sx={{ mt: 1.5, p: 1, borderRadius: 1, bgcolor: 'background.default' }}>
      <Typography variant="caption" color="text.secondary" component="p">
        {label}
      </Typography>
      <Stack component="ol" spacing={0.5} sx={{ mt: 0.5, p: 0, listStyle: 'none' }}>
        {order.map((participant, index) => (
          <Box
            key={participant}
            component="li"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, typography: 'body2' }}
          >
            <Box
              component="span"
              sx={{ width: 20, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
            >
              {index + 1}.
            </Box>
            <Box component="span" sx={{ flexGrow: 1 }}>
              {names.get(participant) ?? participant}
            </Box>
            <Button
              size="large"
              aria-label={t('console.tie.up')}
              onClick={() => {
                move(index, -1);
              }}
              sx={ARROW}
            >
              ↑
            </Button>
            <Button
              size="large"
              aria-label={t('console.tie.down')}
              onClick={() => {
                move(index, 1);
              }}
              sx={ARROW}
            >
              ↓
            </Button>
          </Box>
        ))}
      </Stack>

      {/* Не `contained`: главное действие экрана — завершение турнира
          (запрет №2). Цвет предупреждения связывает кнопку с панелью. */}
      <Button
        color="warning"
        size="large"
        disabled={isPending || groupId === null}
        onClick={() => {
          if (groupId !== null) {
            onDecide({ groupId, orderedIds: [...order] });
          }
        }}
        sx={{ mt: 1, minHeight: 56, fontWeight: 600 }}
      >
        {t('console.tie.confirm')}
      </Button>
    </Box>
  );
}

/** Стрелки порядка — квадрат 56px, зона нажатия консоли (раздел 9). */
const ARROW = { minHeight: 56, minWidth: 56, px: 0, fontSize: 20 } as const;
