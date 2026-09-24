import type { TournamentView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { Dayjs } from 'dayjs';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import { useSessionStore } from '@/features/auth/session-store';
import { isClubStaff } from '@/features/clubs/roles';

import { duplicateTournament } from './api';
import { tournamentKeys } from './queries';

/**
 * «Повторить прошлый турнир» — ТЗ 4.2, обязательный механизм.
 *
 * Клуб проводит турнир восемь раз в месяц, и каждый раз это те же настройки
 * с другой датой. Приоритет №4 брифа — простота создания турнира: разница
 * между «повторить» и «заполнить форму заново» здесь и есть разница между
 * «пользуюсь» и «забросил».
 *
 * Копирует **сервер**: маршрут `duplicate` переносит все настройки сам.
 * Собирать тело создания из прочитанного турнира означало бы второе место,
 * где перечислены все поля, и первое же новое поле их развело бы.
 */
export default function RepeatTournament({
  tournament,
}: {
  readonly tournament: TournamentView;
}): ReactNode {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);

  const [startsAt, setStartsAt] = useState<Dayjs | null>(null);
  // Дата обязательна: копия без неё — тот же турнир в тот же день.
  const isComplete = startsAt?.isValid() === true;

  const repeat = useMutation({
    mutationFn: (moment: string) => duplicateTournament(tournament.id, { startsAt: moment }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
      await navigate({ to: '/tournaments/$tournamentId', params: { tournamentId: created.id } });
    },
  });

  // Право проверяет сервер (ТС 8.3); здесь это решает только, показывать ли
  // орган управления. Судье он не показывается: клуб ведут владелец и
  // организатор (ADR-014).
  if (!isClubStaff(user, tournament.clubId)) {
    return null;
  }

  return (
    <Paper variant="outlined" component="section" sx={{ mt: 4, p: { xs: 2, sm: 3 } }}>
      <Typography variant="h2">{t('tournament.repeat.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t('tournament.repeat.hint')}
      </Typography>

      <Stack
        component="form"
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mt: 2, alignItems: { sm: 'flex-start' } }}
        onSubmit={(event) => {
          event.preventDefault();

          if (startsAt?.isValid() === true) {
            repeat.mutate(toMoment(startsAt));
          }
        }}
      >
        <Box sx={{ width: { xs: '100%', sm: 280 } }}>
          <DateTimePicker
            label={t('tournament.form.startsAt')}
            value={startsAt}
            onChange={setStartsAt}
            slotProps={{ field: { clearable: true } }}
          />
        </Box>

        <Button
          type="submit"
          disabled={!isComplete || repeat.isPending}
          sx={{ minHeight: { xs: 44, sm: 40 } }}
        >
          {repeat.isPending ? t('common.loading') : t('tournament.repeat.submit')}
        </Button>
      </Stack>

      {repeat.error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(repeat.error))}
        </Alert>
      )}
    </Paper>
  );
}

/**
 * Местное время поля — в момент контракта.
 *
 * Без преобразования турнир, назначенный на полдень в Алматы, уехал бы на
 * шесть часов: поле показывает время без зоны, а контракт принимает ISO.
 */
function toMoment(value: Dayjs): string {
  return value.toISOString();
}
