import type { StageView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import ToggleButton from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';

import { swapDraw } from './api';
import { STAGE_TYPE_KEYS } from './labels';
import { tournamentKeys } from './queries';

interface DrawPreviewProps {
  readonly tournamentId: string;
  readonly stages: readonly StageView[];
  readonly names: ReadonlyMap<string, string>;
}

/** Состав, который можно править: у группы — её игроки, у сетки — все её. */
interface Placement {
  readonly key: string;
  readonly label: string;
  readonly participants: readonly string[];
}

/**
 * Расстановка после жеребьёвки — ТЗ 5.3.
 *
 * Организатору её нужно увидеть **до** старта: после старта менять уже
 * нечего. Публичная часть страницы показывает результаты только начатого
 * турнира — пустые таблицы до первой встречи выглядят поломкой, — поэтому
 * состав живёт здесь, у органов управления.
 *
 * Отсюда же идёт ручная корректировка: два нажатия меняют игроков местами
 * (ADR-033). Перестановка в свободный проход сетки — тот же обмен с тем, кто
 * этот проход занимает; отдельного действия для неё нет.
 *
 * Сетка рисуется тем же `ResultsBracket`, что и после турнира: второй способ
 * нарисовать ту же сетку разошёлся бы с первым.
 */
export default function DrawPreview({ tournamentId, stages, names }: DrawPreviewProps): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const swap = useMutation({
    mutationFn: (pair: { readonly a: string; readonly b: string }) =>
      swapDraw(tournamentId, { playerAId: pair.a, playerBId: pair.b }),
    onSuccess: async () => {
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });

  if (stages.length === 0) {
    return null;
  }

  const choose = (playerId: string): void => {
    if (selected === null) {
      setSelected(playerId);
      return;
    }

    // Повторное нажатие по выбранному отменяет выбор: иначе передумать можно
    // только обменом, который потом придётся отменять вторым обменом.
    if (selected === playerId) {
      setSelected(null);
      return;
    }

    swap.mutate({ a: selected, b: playerId });
  };

  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Typography variant="h2">{t('draw.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t('draw.swap.hint')}
      </Typography>

      {swap.error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(swap.error))}
        </Alert>
      )}

      {stages.map((stage) => (
        <Box key={stage.id} sx={{ mt: 2 }}>
          <Typography variant="h3">
            {/* Название этапа задаёт жеребьёвка, и у круговой схемы оно
                совпадает с названием типа. Повторять его дважды незачем. */}
            {stage.name === t(STAGE_TYPE_KEYS[stage.type])
              ? stage.name
              : `${stage.name} · ${t(STAGE_TYPE_KEYS[stage.type])}`}{' '}
            {/* «Встреч: 2», а не «2 встречи»: русское число согласуется
                с существительным, а системы склонения в словаре нет. */}
            <Typography component="span" color="text.secondary" sx={{ fontWeight: 400 }}>
              {t('draw.matches')}:{' '}
              <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {stage.matches.length}
              </Box>
            </Typography>
          </Typography>

          <Box
            component="ul"
            sx={{
              listStyle: 'none',
              m: 0,
              mt: 1,
              p: 0,
              display: 'grid',
              gap: 1,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            }}
          >
            {placementsOf(stage, t('draw.bracket')).map((placement) => (
              <Paper key={placement.key} component="li" variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {placement.label}
                </Typography>
                {/* Список назван группой: у страницы их много, и без имени
                    состав неотличим для чтеца экрана. */}
                <Box
                  component="ol"
                  aria-label={placement.label}
                  sx={{ listStyle: 'none', m: 0, mt: 0.5, p: 0 }}
                >
                  {placement.participants.map((id) => (
                    // Порядок — посевной: первый в группе сильнейший.
                    <li key={id}>
                      {/* Выбранный отмечен и заливкой, и нажатым состоянием
                          для чтеца экрана: цвет не единственный носитель. */}
                      <ToggleButton
                        value={id}
                        size="small"
                        fullWidth
                        selected={selected === id}
                        disabled={swap.isPending}
                        onChange={() => {
                          choose(id);
                        }}
                        sx={{
                          justifyContent: 'flex-start',
                          border: 0,
                          minHeight: { xs: 44, sm: 32 },
                          textTransform: 'none',
                          '&.Mui-selected, &.Mui-selected:hover': {
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                          },
                        }}
                      >
                        {names.get(id) ?? t('results.match.unknownPlayer')}
                      </ToggleButton>
                    </li>
                  ))}
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Что показывать у этапа.
 *
 * У группового этапа — его группы. У сетки групп нет вовсе, но переставлять
 * игроков в ней требование позволяет так же (ТЗ 5.3), поэтому её участники
 * собираются из встреч одним списком.
 */
function placementsOf(stage: StageView, bracketLabel: string): Placement[] {
  if (stage.groups.length > 0) {
    return stage.groups.map((group) => ({
      key: group.id,
      label: group.label,
      participants: group.participants,
    }));
  }

  const participants = [
    ...new Set(
      stage.matches.flatMap((match) =>
        [match.playerAId, match.playerBId].filter((id): id is string => id !== null),
      ),
    ),
  ];

  return participants.length === 0 ? [] : [{ key: stage.id, label: bracketLabel, participants }];
}
