import { zodResolver } from '@hookform/resolvers/zod';
import { isAppError } from '@kttf/shared/errors';
import { LOGIN_PATTERN, PASSWORD_MIN_LENGTH, type PlayerView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
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
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { errorMessageKey } from '@/common/api';
import { formatRating, useT, type MessageKey } from '@/common/i18n';
import { toE164 } from '@/common/phone';
import PasswordField from '@/common/ui/password-field';
import PhoneField from '@/common/ui/phone-field';
import { usePlaceName } from '@/features/places/place-name';
import { playerName } from '@/features/players/player-name';
import { playersQuery } from '@/features/players/queries';

import { signUp } from './api';
import { useSessionStore } from './session-store';

interface SignUpFormProps {
  readonly onSignedUp: () => void;
  /** Ссылка «Войти» — с адресом возврата, если он есть. */
  readonly signInHref?: string;
}

/**
 * Проверки формы. Правила логина и пароля — общие с сервером
 * (`LOGIN_PATTERN`, `PASSWORD_MIN_LENGTH`), иначе форма приняла бы то, что
 * сервер отвергнет. Сообщение каждой ошибки — ключ словаря.
 */
const formSchema = z
  .object({
    phone: z.string().refine((value) => toE164(value) !== null, 'error.form.phone'),
    login: z.string().trim().regex(LOGIN_PATTERN, 'error.form.login'),
    password: z.string().min(PASSWORD_MIN_LENGTH, 'error.form.password').max(200),
    repeat: z.string(),
  })
  .refine((values) => values.repeat === values.password, {
    path: ['repeat'],
    message: 'error.form.passwordMismatch',
  });

/** Отказ сервера по занятому телефону или логину — к своему полю (`details.field`). */
const TAKEN_KEYS: Readonly<Record<string, MessageKey>> = {
  phone: 'error.form.phoneTaken',
  login: 'error.form.loginTaken',
};

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
export default function SignUpForm({
  onSignedUp,
  signInHref = '/login',
}: SignUpFormProps): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const signedIn = useSessionStore((state) => state.signedIn);

  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState<PlayerView | null>(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: { phone: '', login: '', password: '', repeat: '' },
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
    onError: (error) => {
      const field = isAppError(error) ? error.details?.field : undefined;
      const key = typeof field === 'string' ? TAKEN_KEYS[field] : undefined;

      if ((field === 'phone' || field === 'login') && key !== undefined) {
        form.setError(field, { message: key }, { shouldFocus: true });
      }
    },
  });

  // Занятый телефон или логин показан у поля — общий отказ над кнопкой лишний.
  const fieldTaken =
    form.formState.errors.phone?.type === 'manual' ||
    form.formState.errors.login?.type === 'manual';
  const message = (key: string | undefined): string | undefined =>
    key === undefined ? undefined : t(key as MessageKey);

  const { errors } = form.formState;
  const { ref: loginRef, ...login } = form.register('login');
  const { ref: passwordRef, ...password } = form.register('password');
  const { ref: repeatRef, ...repeat } = form.register('repeat');

  return (
    <Stack
      component="form"
      spacing={2}
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          const phone = toE164(values.phone);

          if (phone === null) return;

          register.mutate({
            phone,
            login: values.login.trim(),
            password: values.password,
            ...(chosen === null ? {} : { playerId: chosen.id }),
          });
        })(event);
      }}
    >
      <Typography color="text.secondary">{t('signUp.lead')}</Typography>

      <Controller
        control={form.control}
        name="phone"
        render={({ field }) => (
          <PhoneField
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
            inputRef={field.ref}
            label={t('signUp.phone.label')}
            autoFocus
            size="medium"
            error={errors.phone !== undefined}
            helperText={message(errors.phone?.message)}
            slotProps={ANNOUNCED}
          />
        )}
      />

      <TextField
        {...login}
        inputRef={loginRef}
        label={t('signUp.login.label')}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        size="medium"
        error={errors.login !== undefined}
        helperText={message(errors.login?.message) ?? t('signUp.login.hint')}
        slotProps={ANNOUNCED}
      />

      <PasswordField
        {...password}
        inputRef={passwordRef}
        label={t('signUp.password.label')}
        autoComplete="new-password"
        size="medium"
        error={errors.password !== undefined}
        helperText={message(errors.password?.message) ?? t('signUp.password.hint')}
        slotProps={ANNOUNCED}
      />

      <PasswordField
        {...repeat}
        inputRef={repeatRef}
        label={t('signUp.passwordRepeat.label')}
        autoComplete="new-password"
        size="medium"
        error={errors.repeat !== undefined}
        helperText={message(errors.repeat?.message)}
        slotProps={ANNOUNCED}
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
                          secondary={`${placeName(player.city)} · ${formatRating(player.rating)}`}
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

      {register.error !== null && !fieldTaken && (
        <Alert severity="error">{t(errorMessageKey(register.error))}</Alert>
      )}

      <Button
        variant="contained"
        type="submit"
        size="large"
        fullWidth
        sx={{ minHeight: 48 }}
        loading={register.isPending}
        loadingPosition="start"
      >
        {t('signUp.submit')}
      </Button>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        {t('signUp.haveAccount')} <Link href={signInHref}>{t('signUp.signIn')}</Link>
      </Typography>
    </Stack>
  );
}
