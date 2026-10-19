import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import { useId, useState, type ReactNode, type SyntheticEvent } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import { orUndefined } from '@/common/search';
import PillTabs from '@/common/ui/pill-tabs';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import type { PickedProduct } from '@/features/market/picked-product';
import ProductPicker from '@/features/market/product-picker';
import CitiesFilter from '@/features/places/cities-filter';

import { citiesOf, type PlayersSearch } from './players-search';

/** То, что задаёт панель; порядок и страница живут отдельно. */
export type PlayersFilterValue = Pick<
  PlayersSearch,
  'search' | 'city' | 'club' | 'from' | 'to' | 'gender' | 'hand' | 'bladeId' | 'rubberId'
>;

interface PlayersFilterProps {
  /** Фильтры из адреса — начальное состояние полей. */
  readonly initial: PlayersSearch;
  readonly onSubmit: (value: PlayersFilterValue) => void;
  /** Основание и накладка из адреса — с подписью, если она известна. */
  readonly blade: PickedProduct | null;
  readonly rubber: PickedProduct | null;
}

type Gender = 'any' | 'MALE' | 'FEMALE';
type Hand = 'any' | 'RIGHT' | 'LEFT';

const GENDERS: readonly (readonly [Gender, MessageKey])[] = [
  ['any', 'players.filter.any'],
  ['MALE', 'players.filter.MALE'],
  ['FEMALE', 'players.filter.FEMALE'],
];

const HANDS: readonly (readonly [Hand, MessageKey])[] = [
  ['any', 'players.filter.any'],
  ['RIGHT', 'players.filter.RIGHT'],
  ['LEFT', 'players.filter.LEFT'],
];

/**
 * Панель фильтров «Игроков» — ADR-054, по образцу RTTF.
 *
 * Условия набираются и применяются кнопкой «Найти» или Enter, а не на каждый
 * символ: в «Рейтинг от 300» запрос за «3» и «30» не нужен никому. Чипы под
 * панелью снимают условие сразу — это уже действие, а не набор.
 *
 * На телефоне видно только поле имени и «Найти»; остальное раскрывает
 * «Фильтры» с числом заданных условий.
 */
export default function PlayersFilter({
  initial,
  onSubmit,
  blade: initialBlade,
  rubber: initialRubber,
}: PlayersFilterProps): ReactNode {
  const t = useT();
  const clubs = useQuery(clubDirectoryQuery);
  const moreId = useId();

  const [name, setName] = useState(initial.search ?? '');
  const [from, setFrom] = useState(initial.from === undefined ? '' : String(initial.from));
  const [to, setTo] = useState(initial.to === undefined ? '' : String(initial.to));
  const [cities, setCities] = useState<readonly string[]>(citiesOf(initial));
  const [club, setClub] = useState(initial.club ?? '');
  const [gender, setGender] = useState<Gender>(initial.gender ?? 'any');
  const [hand, setHand] = useState<Hand>(initial.hand ?? 'any');
  const [open, setOpen] = useState(false);
  const [blade, setBlade] = useState<PickedProduct | null>(initialBlade);
  const [rubber, setRubber] = useState<PickedProduct | null>(initialRubber);

  const extra = [
    from !== '' || to !== '',
    cities.length > 0,
    club !== '',
    gender !== 'any',
    hand !== 'any',
    blade !== null,
    rubber !== null,
  ].filter(Boolean).length;

  const submit = (event: SyntheticEvent): void => {
    event.preventDefault();
    const [low, high] = ordered(bound(from), bound(to));

    onSubmit({
      search: orUndefined(name),
      city: cities.length === 0 ? undefined : cities.join(','),
      club: orUndefined(club),
      from: low,
      to: high,
      gender: gender === 'any' ? undefined : gender,
      hand: hand === 'any' ? undefined : hand,
      bladeId: blade?.id,
      rubberId: rubber?.id,
    });
  };

  return (
    <Box
      component="form"
      role="search"
      noValidate
      onSubmit={submit}
      sx={{
        mt: 3,
        display: 'grid',
        gap: 1.5,
        alignItems: 'end',
        gridTemplateColumns: { xs: '1fr auto', sm: 'repeat(6, 1fr)', md: 'repeat(12, 1fr)' },
      }}
    >
      <TextField
        type="search"
        label={t('players.filter.name')}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
        }}
        autoComplete="off"
        sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', md: 'span 5' } }}
      />

      {/* На телефоне — кнопка раскрытия; с 600px поля стоят в сетке сами. */}
      <Button
        variant="outlined"
        startIcon={<SlidersHorizontal size={18} aria-hidden />}
        aria-expanded={open}
        aria-controls={moreId}
        onClick={() => {
          setOpen((value) => !value);
        }}
        sx={{ display: { sm: 'none' }, minHeight: 48 }}
      >
        {extra > 0 ? `${t('players.filter.more')} · ${String(extra)}` : t('players.filter.more')}
      </Button>
      <Button type="submit" variant="contained" sx={{ display: { sm: 'none' }, minHeight: 48 }}>
        {t('players.filter.submit')}
      </Button>

      <Box
        id={moreId}
        sx={{
          display: { xs: open ? 'grid' : 'none', sm: 'contents' },
          gridColumn: '1 / -1',
          gap: 1.5,
        }}
      >
        <TextField
          label={t('players.filter.ratingFrom')}
          value={from}
          onChange={(event) => {
            setFrom(digits(event.target.value));
          }}
          slotProps={{ htmlInput: { inputMode: 'numeric', placeholder: '0' } }}
          sx={{ gridColumn: { sm: 'span 3', md: 'span 2' } }}
        />
        <TextField
          label={t('players.filter.ratingTo')}
          value={to}
          onChange={(event) => {
            setTo(digits(event.target.value));
          }}
          slotProps={{ htmlInput: { inputMode: 'numeric', placeholder: '4000' } }}
          sx={{ gridColumn: { sm: 'span 3', md: 'span 2' } }}
        />
        <Choice
          label={t('players.filter.gender')}
          value={gender}
          options={GENDERS}
          onChange={setGender}
          span={{ sm: 'span 3', md: 'span 3' }}
        />
        <Box sx={{ gridColumn: { sm: 'span 6', md: 'span 4' } }}>
          <CitiesFilter label={t('players.filter.cities')} value={cities} onChange={setCities} />
        </Box>
        <TextField
          select
          label={t('filter.club')}
          value={club}
          onChange={(event) => {
            setClub(event.target.value);
          }}
          sx={{ gridColumn: { sm: 'span 3', md: 'span 3' } }}
        >
          <MenuItem value="">{t('filter.any')}</MenuItem>
          {[...(clubs.data?.values() ?? [])].map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
        <Choice
          label={t('players.filter.hand')}
          value={hand}
          options={HANDS}
          onChange={setHand}
          span={{ sm: 'span 3', md: 'span 5' }}
        />
        {/* Инвентарь — товаром каталога, «Кто играет» RTTF (ADR-058). */}
        <Box sx={{ gridColumn: { sm: 'span 3', md: 'span 5' } }}>
          <ProductPicker
            category="BLADE"
            label={t('players.filter.blade')}
            value={blade}
            onChange={setBlade}
          />
        </Box>
        <Box sx={{ gridColumn: { sm: 'span 3', md: 'span 5' } }}>
          <ProductPicker
            category="RUBBER"
            label={t('players.filter.rubber')}
            value={rubber}
            onChange={setRubber}
          />
        </Box>
      </Box>

      <Button
        type="submit"
        variant="contained"
        sx={{
          display: { xs: 'none', sm: 'inline-flex' },
          gridColumn: { sm: '1 / -1', md: 'span 2' },
          justifySelf: { sm: 'end', md: 'stretch' },
          minHeight: 48,
          px: 4,
        }}
      >
        {t('players.filter.submit')}
      </Button>
    </Box>
  );
}

/** Выбор одного из немногих — пилюлей с видимой подписью над ней. */
function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  span,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: readonly (readonly [T, MessageKey])[];
  readonly onChange: (next: T) => void;
  readonly span: { readonly sm: string; readonly md: string };
}): ReactNode {
  return (
    <Box sx={{ gridColumn: span, minWidth: 0 }}>
      <Typography
        component="div"
        variant="caption"
        color="text.secondary"
        aria-hidden
        sx={{ mb: 0.5 }}
      >
        {label}
      </Typography>
      <PillTabs value={value} options={options} label={label} onChange={onChange} />
    </Box>
  );
}

/** В поле рейтинга — только цифры: рейтинг на экране целый (ADR-053). */
function digits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

function bound(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}

/** «От 400 до 300» — это «от 300 до 400», а не пустой список. */
function ordered(
  low: number | undefined,
  high: number | undefined,
): readonly [number | undefined, number | undefined] {
  return low !== undefined && high !== undefined && low > high ? [high, low] : [low, high];
}
