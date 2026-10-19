import { zodResolver } from '@hookform/resolvers/zod';
import {
  createPlayerSchema,
  genderSchema,
  gripSchema,
  playingHandSchema,
  type CityRef,
  type CreatePlayerInput,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useId, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { coachesQuery } from '@/features/coaches/queries';
import type { PickedProduct } from '@/features/market/picked-product';
import CityPicker from '@/features/places/city-picker';
import EquipmentField from '@/features/players/equipment-field';
import PhotoField from '@/features/players/photo-field';
import { playerName } from '@/features/players/player-name';
import { playersQuery } from '@/features/players/queries';

interface PlayerFormProps {
  /** Заполненные поля при правке. Пусто — профиль заводится впервые. */
  readonly defaultValues?: Partial<CreatePlayerInput> | undefined;
  /**
   * Город профиля из ответа API. Скрытый из справочника город остаётся
   * выбранным, хотя в списке его больше нет (ADR-046).
   */
  readonly city?: CityRef | undefined;
  readonly submitLabel: MessageKey;
  readonly isPending: boolean;
  readonly error: unknown;
  readonly onSubmit: (values: CreatePlayerInput) => void;
  readonly onCancel?: (() => void) | undefined;
  /** Инвентарь из каталога — подписи и фото выбранных товаров при правке. */
  readonly products?: EquipmentProducts | undefined;
}

export type EquipmentProducts = Readonly<
  Record<'blade' | 'rubberForehand' | 'rubberBackhand', PickedProduct | null>
>;

/**
 * Профиль игрока — ТЗ 2.2 целиком.
 *
 * Одна форма и на заведение, и на правку: состав полей у них один, а
 * `updatePlayerSchema` — это `partial` от того же набора, полностью
 * заполненный он принимает. Вторая форма означала бы два места, где список
 * полей обязан совпадать, и первое же новое поле их разведёт.
 *
 * **Отчество не обязательно** — бриф, запрет №6. Пустая строка обращается в
 * «поле не задано», иначе схема отвергнет её как слишком короткую.
 *
 * Настроек аккаунта здесь нет: логин, почта, язык и пароль — другая
 * сущность и другой маршрут (ADR-035).
 */
export default function PlayerForm({
  defaultValues,
  city,
  submitLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
  products,
}: PlayerFormProps): ReactNode {
  const t = useT();
  const clubs = useQuery(clubDirectoryQuery);

  const form = useForm({
    resolver: zodResolver(createPlayerSchema),
    // Необязательных полей в умолчаниях нет: не заданное поле — это
    // `undefined`, а не пустая строка, которую схема отвергла бы как
    // слишком короткую.
    defaultValues: {
      lastName: '',
      firstName: '',
      cityId: '',
      // Умолчание совпадает со схемой: до появления даты профиль показывал
      // только год, и галочка ничего не меняет в том, что о человеке видно.
      birthYearOnly: true,
      ...defaultValues,
    },
  });

  const { errors } = form.formState;

  // useWatch, а не form.watch: подписка на поле, а не перерисовка формы
  // целиком на каждое нажатие клавиши в любом из двадцати полей.
  const control = form.control;
  const photoUrl = useWatch({ control, name: 'photoUrl' });
  const birthDate = useWatch({ control, name: 'birthDate' });
  const birthYear = useWatch({ control, name: 'birthYear' });
  const coachPlayerId = useWatch({ control, name: 'coachPlayerId' });
  const coachName = useWatch({ control, name: 'coachName' });

  const birthFailed = errors.birthDate !== undefined || errors.birthYear !== undefined;

  return (
    <Stack
      component="form"
      noValidate
      spacing={3}
      sx={{ mt: 3 }}
      onSubmit={(event) => {
        void form.handleSubmit(onSubmit)(event);
      }}
    >
      <Box sx={GRID}>
        <TextInput
          control={control}
          name="lastName"
          label="player.form.lastName"
          error={errors.lastName === undefined ? undefined : 'error.form.name'}
          autoComplete="family-name"
        />

        <TextInput
          control={control}
          name="firstName"
          label="player.form.firstName"
          error={errors.firstName === undefined ? undefined : 'error.form.name'}
          autoComplete="given-name"
        />

        <TextInput
          control={control}
          name="middleName"
          label="player.form.middleName"
          optional
          autoComplete="additional-name"
        />

        {/* Поле одно — дата. Год из него выводится и в форме не показывается:
            спрашивать дважды об одном и том же, да ещё и отказывать за
            расхождение, — работа, переложенная на человека. Год при этом
            остаётся обязательным в контракте: по нему считаются возрастные
            категории и допуск на турнир. */}
        <Box>
          <Controller
            control={control}
            name="birthDate"
            render={({ field }) => (
              <DatePicker
                label={t('player.form.birthDate')}
                value={field.value === undefined ? null : dayjs(field.value)}
                disableFuture
                onChange={(value) => {
                  // Дата в контракте — строка `ГГГГ-ММ-ДД`; недописанная
                  // дата — это «не задано», а не полдаты.
                  const valid = value !== null && value.isValid() && value.year() > 1900;

                  field.onChange(valid ? value.format('YYYY-MM-DD') : undefined);
                  form.setValue(
                    'birthYear',
                    valid ? value.year() : (undefined as unknown as number),
                    { shouldValidate: true },
                  );
                }}
                inputRef={field.ref}
                slotProps={{
                  textField: {
                    name: field.name,
                    onBlur: field.onBlur,
                    error: birthFailed,
                    ...(birthFailed
                      ? {
                          helperText: t('error.form.birthDate'),
                          slotProps: { formHelperText: { role: 'alert' } },
                        }
                      : {}),
                  },
                }}
              />
            )}
          />
          {/* Профили, заведённые до появления даты, знают только год. Пустое
              поле у такого профиля объясняется, а не выглядит как потеря. */}
          {birthDate === undefined && Number.isInteger(birthYear) && (
            <FormHelperText>
              {t('player.form.birthYearOnlyKnown')} {birthYear}
            </FormHelperText>
          )}
          <Controller
            control={control}
            name="birthYearOnly"
            render={({ field }) => (
              <FormControlLabel
                sx={{ mt: 0.5, minHeight: 44 }}
                control={
                  <Checkbox
                    size="small"
                    name={field.name}
                    checked={field.value ?? false}
                    onChange={(event) => {
                      field.onChange(event.target.checked);
                    }}
                    onBlur={field.onBlur}
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    {t('player.form.birthYearOnly')}
                  </Typography>
                }
              />
            )}
          />
        </Box>

        <TextInput
          control={control}
          name="gender"
          label="player.form.gender"
          error={errors.gender === undefined ? undefined : 'error.form.gender'}
          select
        >
          <MenuItem value="">{t('player.form.choose')}</MenuItem>
          {genderSchema.options.map((value) => (
            <MenuItem key={value} value={value}>
              {t(GENDER_KEYS[value])}
            </MenuItem>
          ))}
        </TextInput>

        <Controller
          control={control}
          name="cityId"
          render={({ field }) => (
            <CityPicker
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              label={<FieldLabel label="player.form.city" optional={false} />}
              current={city}
              error={errors.cityId === undefined ? undefined : 'error.form.city'}
            />
          )}
        />

        {/* Клуб при саморегистрации сервер не проверяет: игрок объявляет
            принадлежность сам, и прав она не даёт — права живут в составе
            клуба, а не в поле профиля (ADR-014). */}
        <TextInput control={control} name="clubId" label="player.form.club" optional select>
          <MenuItem value="">{t('player.form.noClub')}</MenuItem>
          {[...(clubs.data?.values() ?? [])].map((club) => (
            <MenuItem key={club.id} value={club.id}>
              {club.name}
            </MenuItem>
          ))}
        </TextInput>
      </Box>

      <PhotoField
        value={photoUrl ?? null}
        onChange={(url) => {
          form.setValue('photoUrl', url ?? undefined, { shouldValidate: true });
        }}
      />

      <Section legend="player.form.game">
        <Box sx={GRID}>
          <Choice
            control={control}
            name="playingHand"
            label="player.form.playingHand"
            options={playingHandSchema.options.map((value) => ({
              value,
              label: HAND_KEYS[value],
            }))}
          />

          <Choice
            control={control}
            name="grip"
            label="player.form.grip"
            options={gripSchema.options.map((value) => ({ value, label: GRIP_KEYS[value] }))}
          />

          {/* Инвентарь — товар каталога маркета, а чего в нём нет — строкой
              (ADR-058). */}
          {EQUIPMENT_SLOTS.map((slot) => (
            <EquipmentSlot
              key={slot.text}
              form={form}
              slot={slot}
              initial={products?.[slot.text] ?? null}
            />
          ))}
        </Box>
      </Section>

      <CoachField
        form={form}
        chosenId={coachPlayerId}
        typedName={coachName}
        error={errors.coachName === undefined ? undefined : 'error.form.coach'}
      />

      <TextInput
        control={control}
        name="bio"
        label="player.form.bio"
        optional
        multiline
        minRows={3}
      />

      {error !== null && error !== undefined && (
        <Alert severity="error">{t(errorMessageKey(error))}</Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Button variant="contained" type="submit" disabled={isPending} sx={TOUCH}>
          {isPending ? t('common.loading') : t(submitLabel)}
        </Button>
        {onCancel !== undefined && (
          <Button variant="text" onClick={onCancel} sx={TOUCH}>
            {t('player.form.cancel')}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

/** Две колонки полей от планшета, одна на телефоне. */
const GRID = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  alignItems: 'start',
} as const;

/** Зона нажатия на телефоне — не меньше 44px (docs/07-design-system.md, 9). */
const TOUCH = { minHeight: { xs: 44, sm: 40 } } as const;

type PlayerFormApi = ReturnType<typeof useForm<CreatePlayerInput>>;

/** Три места инвентаря: строка анкеты и товар каталога рядом. */
const EQUIPMENT_SLOTS = [
  { text: 'blade', product: 'bladeProductId', category: 'BLADE', label: 'player.form.blade' },
  {
    text: 'rubberForehand',
    product: 'rubberForehandProductId',
    category: 'RUBBER',
    label: 'player.form.rubberForehand',
  },
  {
    text: 'rubberBackhand',
    product: 'rubberBackhandProductId',
    category: 'RUBBER',
    label: 'player.form.rubberBackhand',
  },
] as const;

/**
 * Место инвентаря в форме: товар и строка — одно из двух. Выбор товара
 * стирает строку и наоборот (`EquipmentField`), форма хранит оба поля.
 */
function EquipmentSlot({
  form,
  slot,
  initial,
}: {
  readonly form: PlayerFormApi;
  readonly slot: (typeof EQUIPMENT_SLOTS)[number];
  readonly initial: PickedProduct | null;
}): ReactNode {
  const t = useT();
  const text = useWatch({ control: form.control, name: slot.text });
  const productId = useWatch({ control: form.control, name: slot.product });
  const [product, setProduct] = useState<PickedProduct | null>(initial);
  const shown = productId === undefined ? null : product;

  return (
    <EquipmentField
      category={slot.category}
      label={t(slot.label)}
      value={{ product: shown, text }}
      onChange={(next) => {
        setProduct(next.product);
        form.setValue(slot.product, next.product?.id, { shouldDirty: true });
        form.setValue(slot.text, next.text, { shouldDirty: true });
      }}
    />
  );
}

/** Поля профиля, значение которых — строка. */
type TextName =
  | 'lastName'
  | 'firstName'
  | 'middleName'
  | 'gender'
  | 'clubId'
  | 'blade'
  | 'rubberForehand'
  | 'rubberBackhand'
  | 'bio'
  | 'coachPlayerId'
  | 'coachName';

/**
 * Тренер: выбор из списка либо имя вручную.
 *
 * Разом заполненные, они спорят друг с другом — схема такое отвергает, —
 * поэтому выбор гасит поле и наоборот. Список делится натрое: сверху
 * тренеры со страницей на KTTF (ADR-059) — выбор кладёт их профиль игрока,
 * ниже те, кого уже называли тренером (ADR-035), затем остальные игроки.
 *
 * Список ограничен полусотней в каждой группе. Когда база вырастет, здесь
 * появится поиск: выпадающий список на всю страну не открывают.
 */
function CoachField({
  form,
  chosenId,
  typedName,
  error,
}: {
  readonly form: PlayerFormApi;
  readonly chosenId: string | undefined;
  readonly typedName: string | undefined;
  readonly error: MessageKey | undefined;
}): ReactNode {
  const t = useT();
  const withPage = useQuery(coachesQuery({ page: 1, limit: 50 }));
  const coaches = useQuery(playersQuery({ page: 1, limit: 50, coachesOnly: true }));
  const players = useQuery(playersQuery({ page: 1, limit: 50 }));

  // Тренер — это игрок: у всех трёх групп значение — идентификатор профиля.
  const pageItems = withPage.data?.items ?? [];
  const pageIds = new Set(pageItems.map((coach) => coach.player.id));
  const coachItems = (coaches.data?.items ?? []).filter((coach) => !pageIds.has(coach.id));
  const chosenIds = new Set([...pageIds, ...coachItems.map((coach) => coach.id)]);
  const others = (players.data?.items ?? []).filter((player) => !chosenIds.has(player.id));

  // Группы — плоским списком: меню MUI ждёт пункты и подзаголовки прямыми
  // детьми, пункт внутри фрагмента не выбирается.
  const options: ReactNode[] = [
    <MenuItem key="none" value="">
      {t('player.form.notSet')}
    </MenuItem>,
  ];

  if (pageItems.length > 0) {
    options.push(
      <ListSubheader key="with-page">{t('player.form.coachWithPage')}</ListSubheader>,
      ...pageItems.map((coach) => (
        <MenuItem key={coach.player.id} value={coach.player.id}>
          {`${coach.player.lastName} ${coach.player.firstName}`}
        </MenuItem>
      )),
    );
  }

  if (coachItems.length > 0) {
    options.push(
      <ListSubheader key="coaches">{t('player.form.coachGroup')}</ListSubheader>,
      ...coachItems.map((coach) => (
        <MenuItem key={coach.id} value={coach.id}>
          {playerName(coach)}
        </MenuItem>
      )),
    );
  }

  options.push(
    <ListSubheader key="players">{t('player.form.playersGroup')}</ListSubheader>,
    ...others.map((player) => (
      <MenuItem key={player.id} value={player.id}>
        {playerName(player)}
      </MenuItem>
    )),
  );

  return (
    <Section legend="player.form.coach">
      <Box sx={GRID}>
        <TextInput
          control={form.control}
          name="coachPlayerId"
          label="player.form.coachFromList"
          optional
          select
          disabled={typedName !== undefined && typedName !== ''}
          onValue={() => {
            // Выбранный тренер и вписанный руками спорят друг с другом.
            form.setValue('coachName', undefined);
          }}
        >
          {options}
        </TextInput>

        <TextInput
          control={form.control}
          name="coachName"
          label="player.form.coachName"
          optional
          error={error}
          disabled={chosenId !== undefined && chosenId !== ''}
          onValue={() => {
            form.setValue('coachPlayerId', undefined);
          }}
        />
      </Box>
    </Section>
  );
}

/** Группа полей с подписью над линейкой. */
function Section({
  legend,
  children,
}: {
  readonly legend: MessageKey;
  readonly children: ReactNode;
}): ReactNode {
  const t = useT();

  return (
    <Box
      component="fieldset"
      sx={{ m: 0, p: 0, pt: 2, border: 0, borderTop: 1, borderColor: 'divider', minWidth: 0 }}
    >
      <Typography component="legend" variant="h4" sx={{ p: 0, mb: 1.5 }}>
        {t(legend)}
      </Typography>
      {children}
    </Box>
  );
}

/**
 * Выбор из двух-трёх значений — кнопками, а не выпадающим списком: варианты
 * видны сразу и выбираются одним нажатием. Повторное нажатие на выбранное
 * снимает выбор — поле необязательное.
 */
function Choice({
  control,
  name,
  label,
  options,
}: {
  readonly control: Control<CreatePlayerInput>;
  readonly name: 'playingHand' | 'grip';
  readonly label: MessageKey;
  readonly options: readonly { readonly value: string; readonly label: MessageKey }[];
}): ReactNode {
  const t = useT();
  const labelId = useId();

  return (
    <Box>
      <Typography id={labelId} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        <FieldLabel label={label} optional />
      </Typography>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            aria-labelledby={labelId}
            value={field.value ?? null}
            onChange={(_, value: string | null) => {
              field.onChange(value ?? undefined);
            }}
          >
            {options.map((option) => (
              <ToggleButton
                key={option.value}
                value={option.value}
                onBlur={field.onBlur}
                sx={{ minHeight: { xs: 44, sm: 40 } }}
              >
                {t(option.label)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      />
    </Box>
  );
}

/**
 * Пол — в текст интерфейса.
 *
 * Тип выведен из контракта: новое значение в общем коде ломает сборку здесь,
 * а не выходит к человеку английской строкой из базы.
 */
const GENDER_KEYS: Readonly<Record<NonNullable<CreatePlayerInput['gender']>, MessageKey>> = {
  MALE: 'player.gender.MALE',
  FEMALE: 'player.gender.FEMALE',
};

const HAND_KEYS: Readonly<Record<'RIGHT' | 'LEFT', MessageKey>> = {
  RIGHT: 'player.hand.RIGHT',
  LEFT: 'player.hand.LEFT',
};

const GRIP_KEYS: Readonly<Record<'SHAKEHAND' | 'PENHOLD', MessageKey>> = {
  SHAKEHAND: 'player.grip.SHAKEHAND',
  PENHOLD: 'player.grip.PENHOLD',
};

/** Подпись поля: необязательное помечено словом рядом с названием. */
function FieldLabel({
  label,
  optional,
}: {
  readonly label: MessageKey;
  readonly optional: boolean;
}): ReactNode {
  const t = useT();

  return (
    <>
      {t(label)}
      {optional && (
        <Box component="span" sx={{ ml: 0.5, fontSize: 12, color: 'text.secondary' }}>
          {t('player.form.optional')}
        </Box>
      )}
    </>
  );
}

/**
 * Подпись, поле и текст отказа.
 *
 * Сообщение берётся из словаря, а не из схемы: тексты внутри схем общие с
 * сервером и не локализуются — бриф 3.4.
 *
 * Необязательное поле и выбор из списка: пустое значение — это «не задано»,
 * а не пустая строка.
 */
function TextInput({
  control,
  name,
  label,
  optional = false,
  error,
  onValue,
  ...rest
}: {
  readonly control: Control<CreatePlayerInput>;
  readonly name: TextName;
  readonly label: MessageKey;
  readonly optional?: boolean;
  readonly error?: MessageKey | undefined;
  /** Вызывается после смены значения: поля тренера гасят друг друга. */
  readonly onValue?: () => void;
} & Omit<
  TextFieldProps,
  'name' | 'label' | 'error' | 'value' | 'onChange' | 'onBlur' | 'inputRef' | 'helperText'
>): ReactNode {
  const t = useT();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <TextField
          {...rest}
          name={field.name}
          value={field.value ?? ''}
          onChange={(event) => {
            const value = event.target.value;

            field.onChange(value === '' && (optional || rest.select === true) ? undefined : value);
            onValue?.();
          }}
          onBlur={field.onBlur}
          inputRef={field.ref}
          label={<FieldLabel label={label} optional={optional} />}
          error={error !== undefined}
          {...(error === undefined
            ? {}
            : { helperText: t(error), slotProps: { formHelperText: { role: 'alert' } } })}
        />
      )}
    />
  );
}
