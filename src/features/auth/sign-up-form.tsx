import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, type PlayerView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import { usePlaceName } from '@/features/places/place-name';
import { playerName } from '@/features/players/player-name';
import { playersQuery } from '@/features/players/queries';

import { signUp } from './api';
import { useSessionStore } from './session-store';

interface SignUpFormProps {
  readonly onSignedUp: () => void;
}

/** Ошибка поля объявляется сразу, как и до перехода на MUI (раздел 9). */
const ANNOUNCED = { formHelperText: { role: 'alert' } } as const;

/**
 * Регистрация — ТЗ 2.1, ADR-034.
 *
 * Игроков заводит тренер, поэтому человек, придя сам, ищет себя среди тех,
 * у кого ещё нет кабинета, и привязывается к собственной истории встреч и
 * рейтингу. Без этого шага он завёл бы себе второй профиль, и рейтинг
 * разошёлся бы на два — ровно та беда, ради устранения которой делается
 * продукт.
 *
 * Поиск, а не список целиком: игроков в стране больше, чем помещается в
 * выпадающий список, и выбирать себя из чужих фамилий человеку незачем.
 */
export default function SignUpForm({ onSignedUp }: SignUpFormProps): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const signedIn = useSessionStore((state) => state.signedIn);

  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState<PlayerView | null>(null);

  const form = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { login: '', password: '', phone: '' },
  });

  // Запрос идёт только после того, как человек начал искать: пустой поиск
  // вернул бы всех игроков страны.
  const found = useQuery({
    ...playersQuery({ search, withoutAccount: true, page: 1, limit: 10 }),
    enabled: search.trim().length >= 2,
  });

  const register = useMutation({
    mutationFn: signUp,
    onSuccess: (session) => {
      signedIn(session);
      onSignedUp();
    },
  });

  const { errors } = form.formState;
  const { ref: loginRef, ...login } = form.register('login');
  const { ref: passwordRef, ...password } = form.register('password');
  const { ref: phoneRef, ...phone } = form.register('phone');

  return (
    <Stack
      component="form"
      spacing={2}
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          register.mutate({
            ...values,
            ...(chosen === null ? {} : { playerId: chosen.id }),
          });
        })(event);
      }}
    >
      <Typography color="text.secondary">{t('signUp.lead')}</Typography>

      <TextField
        {...login}
        inputRef={loginRef}
        label={t('signUp.login.label')}
        autoComplete="username"
        size="medium"
        error={errors.login !== undefined}
        helperText={errors.login === undefined ? undefined : t('error.form.login')}
        slotProps={ANNOUNCED}
      />

      <TextField
        {...password}
        inputRef={passwordRef}
        label={t('signUp.password.label')}
        type="password"
        autoComplete="new-password"
        size="medium"
        error={errors.password !== undefined}
        helperText={errors.password === undefined ? undefined : t('error.form.password')}
        slotProps={ANNOUNCED}
      />

      <TextField
        {...phone}
        inputRef={phoneRef}
        label={t('signUp.phone.label')}
        type="tel"
        autoComplete="tel"
        placeholder={t('login.phone.placeholder')}
        size="medium"
        error={errors.phone !== undefined}
        helperText={errors.phone === undefined ? undefined : t('error.form.phone')}
        slotProps={{ ...ANNOUNCED, htmlInput: { inputMode: 'tel' } }}
      />

      <Paper component="fieldset" variant="outlined" sx={{ m: 0, px: 2, pt: 1, pb: 2 }}>
        <Typography component="legend" variant="body2" color="text.secondary" sx={{ px: 0.5 }}>
          {t('signUp.player.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('signUp.player.lead')}
        </Typography>

        {chosen === null ? (
          <>
            <TextField
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              type="search"
              placeholder={t('signUp.player.search')}
              sx={{ mt: 1.5 }}
              slotProps={{ htmlInput: { 'aria-label': t('signUp.player.search') } }}
            />

            {found.data !== undefined && (
              <List dense aria-label={t('signUp.player.title')} sx={{ mt: 1, py: 0 }}>
                {found.data.items.length === 0 ? (
                  <ListItem sx={{ px: 0 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('signUp.player.empty')}
                    </Typography>
                  </ListItem>
                ) : (
                  found.data.items.map((player) => (
                    <ListItem key={player.id} disablePadding>
                      <ListItemButton
                        onClick={() => {
                          setChosen(player);
                        }}
                        sx={{ minHeight: 44, borderRadius: 1 }}
                      >
                        <ListItemText
                          primary={playerName(player)}
                          secondary={`${placeName(player.city)} · ${player.rating}`}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))
                )}
              </List>
            )}
          </>
        ) : (
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 500, flexGrow: 1 }}>{playerName(chosen)}</Typography>
            <Button
              variant="text"
              onClick={() => {
                setChosen(null);
              }}
            >
              {t('signUp.player.reset')}
            </Button>
          </Stack>
        )}
      </Paper>

      {register.error !== null && (
        <Alert severity="error">{t(errorMessageKey(register.error))}</Alert>
      )}

      <Button
        variant="contained"
        type="submit"
        size="large"
        fullWidth
        loading={register.isPending}
        loadingPosition="start"
      >
        {t('signUp.submit')}
      </Button>
    </Stack>
  );
}
