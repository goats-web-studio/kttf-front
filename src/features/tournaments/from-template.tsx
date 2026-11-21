import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { Dayjs } from 'dayjs';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { formatDate, useLocale, useT } from '@/common/i18n';
import { clubDirectoryQuery } from '@/features/clubs/queries';

import { duplicateTournament } from './api';
import { tournamentKeys, tournamentsQuery } from './queries';

/** Сколько турниров клуба предлагать: образец берут из недавних. */
const TEMPLATES = 20;

/**
 * «Новый турнир» по образцу прошлого — замечание владельца после пилота,
 * 21.11.2026.
 *
 * Клуб проводит одно и то же каждую неделю: схема, взнос, столы, условия —
 * те же, меняется дата. «Повторить турнир» был только на странице самого
 * турнира, а организатор приходит в форму. Копирует сервер (`duplicate`),
 * как и там: форма не пересобирает настройки из прочитанного турнира.
 */
export default function FromTemplate({
  clubIds,
}: {
  readonly clubIds: readonly string[];
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [clubId, setClubId] = useState(clubIds[0] ?? '');
  const [templateId, setTemplateId] = useState('');
  const [startsAt, setStartsAt] = useState<Dayjs | null>(null);

  const clubs = useQuery(clubDirectoryQuery);
  const tournaments = useQuery({
    ...tournamentsQuery({ clubId, page: 1, limit: TEMPLATES, order: 'desc' }),
    enabled: clubId !== '',
  });
  const templates = (tournaments.data?.items ?? []).filter(
    (tournament) => tournament.status !== 'CANCELLED',
  );

  const create = useMutation({
    mutationFn: (moment: string) => duplicateTournament(templateId, { startsAt: moment }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
      await navigate({ to: '/tournaments/$tournamentId', params: { tournamentId: created.id } });
    },
  });

  // Блок — когда образцы уже есть: пока список грузится, второе поле
  // «Начало» над формой путало бы, а у первого турнира клуба образца нет.
  // У кого клубов несколько, блок остаётся ради выбора клуба.
  if (templates.length === 0 && clubIds.length <= 1) {
    return null;
  }

  const ready = templateId !== '' && startsAt?.isValid() === true;

  return (
    <Paper
      variant="outlined"
      component="section"
      data-from-template
      sx={{ mt: 3, p: { xs: 2, sm: 3 }, borderRadius: 4 }}
    >
      <Typography variant="h3" component="h2">
        {t('tournament.template.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t('tournament.template.hint')}
      </Typography>

      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) create.mutate(startsAt.toISOString());
        }}
        sx={{
          mt: 2,
          display: 'grid',
          gap: 2,
          alignItems: 'start',
          gridTemplateColumns: {
            xs: '1fr',
            md: clubIds.length > 1 ? '1fr 2fr 1fr auto' : '2fr 1fr auto',
          },
        }}
      >
        {clubIds.length > 1 && (
          <TextField
            select
            label={t('tournament.form.club')}
            value={clubId}
            onChange={(event) => {
              setClubId(event.target.value);
              setTemplateId('');
            }}
          >
            {clubIds.map((id) => (
              <MenuItem key={id} value={id}>
                {clubs.data?.get(id)?.name ?? id}
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          select
          label={t('tournament.template.pick')}
          value={templateId}
          disabled={templates.length === 0}
          onChange={(event) => {
            setTemplateId(event.target.value);
          }}
        >
          {templates.map((tournament) => (
            <MenuItem key={tournament.id} value={tournament.id}>
              {tournament.name} · {formatDate(tournament.startsAt, locale)} ·{' '}
              {t(`tournament.format.${tournament.formatConfig.type}`)}
            </MenuItem>
          ))}
        </TextField>

        <DateTimePicker
          label={t('tournament.form.startsAt')}
          value={startsAt}
          onChange={setStartsAt}
          // Копия — будущий турнир: прошедшая дата здесь всегда ошибка.
          disablePast
          slotProps={{ field: { clearable: true } }}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={!ready || create.isPending}
          sx={{ minHeight: 56 }}
        >
          {create.isPending ? t('common.loading') : t('tournament.template.submit')}
        </Button>
      </Box>

      {create.error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(create.error))}
        </Alert>
      )}
    </Paper>
  );
}
