import {
  OPTION_AXES,
  PRODUCT_ALIASES_MAX,
  PRODUCT_CATEGORIES,
  PRODUCT_DESCRIPTION_MAX,
  createProductSchema,
  productCategorySchema,
  updateProductSchema,
  type BrandView,
  type ProductCategory,
  type ProductView,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EyeOff, Eye, ExternalLink } from 'lucide-react';
import { useState, type ReactNode, type SyntheticEvent } from 'react';
import type { z } from 'zod';

import { errorMessageKey } from '@/common/api';
import { fill, useT, type MessageKey } from '@/common/i18n';

import { createProduct, setProductHidden, updateProduct } from '../api';
import { attributeLabel, categoryLabel, optionAxisLabel, productHref } from '../labels';
import { marketKeys } from '../queries';
import {
  attrsDraftFrom,
  attrsFromDraft,
  optionsDraftFrom,
  optionsFromDraft,
  type AttrProblem,
  type AttrsDraft,
  type OptionsDraft,
} from './attrs-form';
import { AttributesForm, OptionsForm } from './attributes-form';
import ProductImages from './product-images';
import TagInput from './tag-input';

const FIELD_LABELS: Readonly<Record<string, MessageKey>> = {
  category: 'catalog.form.category',
  brandId: 'catalog.form.brand',
  name: 'catalog.form.name',
  aliases: 'catalog.form.aliases',
  description: 'catalog.form.description',
};

interface ProductEditorProps {
  /** Товар для правки; `null` — новый. */
  readonly product: ProductView | null;
  readonly brands: readonly BrandView[];
  /** Скрыт ли товар — из списка администратора; неизвестно — `undefined`. */
  readonly hidden: boolean | undefined;
  readonly defaultCategory: ProductCategory;
  /** Сохранено: новый адрес товара — правка продолжается уже по нему. */
  readonly onSaved: (product: ProductView) => void;
  readonly onClose: () => void;
}

/**
 * Карточка товара в администрировании — `docs/10` 5.8.
 *
 * Характеристики и варианты — формой из описания категории. Перед отправкой
 * всё проверяется схемами общего кода (`createProductSchema`,
 * `updateProductSchema`) — той же проверкой, что на сервере: администратор
 * видит ошибку сразу и на своём языке, а не отказ 400. Фото добавляются к
 * уже заведённому товару: им нужен его идентификатор.
 */
export default function ProductEditor({
  product,
  brands,
  hidden,
  defaultCategory,
  onSaved,
  onClose,
}: ProductEditorProps): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<ProductCategory>(product?.category ?? defaultCategory);
  const [brandId, setBrandId] = useState(product?.brand.id ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [aliases, setAliases] = useState<readonly string[]>(product?.aliases ?? []);
  const [description, setDescription] = useState(product?.description ?? '');
  const [attrs, setAttrs] = useState<AttrsDraft>(() =>
    attrsDraftFrom(product?.category ?? defaultCategory, product?.attrs ?? {}),
  );
  const [options, setOptions] = useState<OptionsDraft>(() =>
    optionsDraftFrom(product?.category ?? defaultCategory, product?.options ?? {}),
  );
  const [problems, setProblems] = useState<Readonly<Record<string, AttrProblem>>>({});
  const [invalid, setInvalid] = useState<readonly string[]>([]);
  const [saved, setSaved] = useState(false);
  const [isHidden, setIsHidden] = useState(hidden);

  const refresh = (): Promise<unknown> =>
    queryClient.invalidateQueries({ queryKey: marketKeys.all });

  const save = useMutation({
    mutationFn: (input: z.infer<typeof createProductSchema>) =>
      product === null
        ? createProduct(input)
        : updateProduct(product.id, {
            ...input,
            description: input.description ?? null,
          }),
    onSuccess: async (result) => {
      setSaved(true);
      await refresh();
      onSaved(result);
    },
  });
  const hide = useMutation({
    mutationFn: (next: boolean) => {
      if (product === null) return Promise.resolve();
      return setProductHidden(product.id, next);
    },
    onSuccess: async (_, next) => {
      setIsHidden(next);
      await refresh();
    },
  });

  /** Смена категории: характеристики и варианты, которых у новой нет, уходят. */
  const changeCategory = (next: ProductCategory): void => {
    const current = attrsFromDraft(category, attrs).attrs;
    setAttrs(attrsDraftFrom(next, current));
    setOptions(optionsDraftFrom(next, optionsFromDraft(category, options)));
    setProblems({});
    setCategory(next);
  };

  const issueLabel = (path: readonly PropertyKey[]): string => {
    const [head, key] = path;
    if (head === 'attrs' && typeof key === 'string') return attributeLabel(t, key);
    if (head === 'options' && typeof key === 'string') {
      const axis = OPTION_AXES.find((item) => item === key);
      return axis === undefined ? key : t(optionAxisLabel(axis));
    }
    const field = typeof head === 'string' ? FIELD_LABELS[head] : undefined;

    return field === undefined ? String(head) : t(field);
  };

  const submit = (event: SyntheticEvent): void => {
    event.preventDefault();
    setSaved(false);

    const built = attrsFromDraft(category, attrs);
    setProblems(built.problems);
    const bad = Object.keys(built.problems).map((key) => attributeLabel(t, key));

    const text = description.trim();
    const input = {
      category,
      brandId,
      name: name.trim(),
      aliases: [...aliases],
      ...(text === '' ? {} : { description: text }),
      attrs: built.attrs,
      options: optionsFromDraft(category, options),
    };
    const result =
      product === null
        ? createProductSchema.safeParse(input)
        : updateProductSchema.safeParse({ ...input, description: text === '' ? null : text });
    const issues = result.success ? [] : result.error.issues.map((issue) => issueLabel(issue.path));
    const all = [...new Set([...bad, ...issues])];

    setInvalid(all);
    if (all.length > 0) return;

    save.mutate(createProductSchema.parse(input));
  };

  return (
    <Paper variant="outlined" component="section" sx={{ p: { xs: 2.5, sm: 4 } }}>
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Typography variant="h2">
          {product === null
            ? t('catalog.form.new')
            : fill(t('catalog.form.edit'), { name: product.name })}
        </Typography>
        {product !== null && (
          <Stack direction="row" spacing={1}>
            <Button
              href={productHref(product.slug)}
              endIcon={<ExternalLink size={16} aria-hidden />}
              sx={{ minHeight: 44 }}
            >
              {t('catalog.products.open')}
            </Button>
            <Button
              variant="outlined"
              startIcon={
                isHidden === true ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />
              }
              disabled={hide.isPending}
              onClick={() => {
                hide.mutate(isHidden !== true);
              }}
              sx={{ minHeight: 44 }}
            >
              {t(isHidden === true ? 'catalog.unhide' : 'catalog.hide')}
            </Button>
          </Stack>
        )}
      </Stack>
      {isHidden === true && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {t('catalog.hiddenNote')}
        </Alert>
      )}
      {hide.error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(hide.error))}
        </Alert>
      )}

      <Box component="form" noValidate onSubmit={submit} sx={{ mt: 3, display: 'grid', gap: 3 }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField
            select
            required
            label={t('catalog.form.category')}
            value={category}
            onChange={(event) => {
              const next = productCategorySchema.safeParse(event.target.value);
              if (next.success) changeCategory(next.data);
            }}
          >
            {PRODUCT_CATEGORIES.map((item) => (
              <MenuItem key={item} value={item}>
                {t(categoryLabel(item))}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            required
            label={t('catalog.form.brand')}
            value={brandId}
            onChange={(event) => {
              setBrandId(event.target.value);
            }}
          >
            {brands.map((brand) => (
              <MenuItem key={brand.id} value={brand.id}>
                {brand.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            required
            label={t('catalog.form.name')}
            helperText={t('catalog.form.nameHint')}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            slotProps={{ htmlInput: { maxLength: 120 } }}
            sx={{ gridColumn: '1 / -1' }}
          />
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TagInput
              label={t('catalog.form.aliases')}
              helperText={t('catalog.form.aliasesHint')}
              values={aliases}
              onChange={setAliases}
              valid={(value) => value.length <= 100}
              max={PRODUCT_ALIASES_MAX}
            />
          </Box>
          <TextField
            label={t('catalog.form.description')}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            multiline
            minRows={4}
            slotProps={{ htmlInput: { maxLength: PRODUCT_DESCRIPTION_MAX } }}
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>

        <Box component="fieldset" sx={{ m: 0, p: 0, border: 0 }}>
          <Typography component="legend" variant="h3" sx={{ mb: 2 }}>
            {t('market.product.attributes')}
          </Typography>
          <AttributesForm
            category={category}
            draft={attrs}
            problems={problems}
            onChange={(key, value) => {
              setAttrs((previous) => ({ ...previous, [key]: value }));
            }}
          />
        </Box>

        <Box component="fieldset" sx={{ m: 0, p: 0, border: 0 }}>
          <Typography component="legend" variant="h3" sx={{ mb: 2 }}>
            {t('market.product.options')}
          </Typography>
          <OptionsForm category={category} draft={options} onChange={setOptions} />
        </Box>

        {invalid.length > 0 && (
          <Alert severity="error">
            {fill(t('catalog.form.invalid'), { fields: invalid.join(', ') })}
          </Alert>
        )}
        {save.error !== null && <Alert severity="error">{t(errorMessageKey(save.error))}</Alert>}
        {saved && save.isSuccess && <Alert severity="success">{t('catalog.form.saved')}</Alert>}

        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={onClose} sx={{ minHeight: 48 }}>
            {t('catalog.form.close')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={save.isPending}
            sx={{ minHeight: 48, px: 4 }}
          >
            {save.isPending
              ? t('common.loading')
              : t(product === null ? 'catalog.form.create' : 'catalog.form.save')}
          </Button>
        </Stack>
      </Box>

      <Box component="section" sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          {t('catalog.images.title')}
        </Typography>
        {product === null ? (
          <Typography color="text.secondary">{t('catalog.images.afterCreate')}</Typography>
        ) : (
          <ProductImages productId={product.id} images={product.images} onChanged={refresh} />
        )}
      </Box>
    </Paper>
  );
}
