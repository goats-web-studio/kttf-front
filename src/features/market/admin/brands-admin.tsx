import {
  CLUB_IMAGE_MAX_BYTES,
  createBrandSchema,
  rejectPhoto,
  updateBrandSchema,
  type BrandView,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Plus } from 'lucide-react';
import { useId, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, formatCount, useLocale, useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';

import { createBrand, updateBrand, uploadBrandLogo } from '../api';
import BrandMark from '../brand-mark';
import { brandsQuery, marketKeys } from '../queries';

/** Открытый диалог: новый производитель (`undefined`) или правка. */
type Editing = { readonly brand: BrandView | undefined } | null;

const total = (brand: BrandView): number =>
  Object.values(brand.counts).reduce((sum, count) => sum + count, 0);

/** Производители — `docs/10` 5.8: список, заведение, правка, логотип. */
export default function BrandsAdmin(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const brands = useQuery(brandsQuery);
  const [editing, setEditing] = useState<Editing>(null);
  const list = [...(brands.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<Plus size={18} aria-hidden />}
          onClick={() => {
            setEditing({ brand: undefined });
          }}
          sx={{ minHeight: 48 }}
        >
          {t('catalog.brands.add')}
        </Button>
      </Stack>

      <Box sx={{ mt: 3 }}>
        <QueryState
          isPending={brands.isPending}
          error={brands.error}
          onRetry={() => void brands.refetch()}
          loading={<RowsSkeleton />}
        >
          {list.length === 0 ? (
            <EmptyState title={t('market.brands.empty')} />
          ) : (
            <Paper variant="outlined" component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {list.map((brand) => (
                <Box
                  component="li"
                  key={brand.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: { xs: 2, sm: 3 },
                    py: 1.5,
                    borderTop: 1,
                    borderColor: 'divider',
                    '&:first-of-type': { borderTop: 0 },
                  }}
                >
                  <BrandMark brand={brand} size={48} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Link
                      href={`/market/brands/${brand.slug}`}
                      color="text.primary"
                      sx={{ fontWeight: 600 }}
                    >
                      {brand.name}
                    </Link>
                    <Typography variant="body2" color="text.secondary">
                      {[
                        brand.country,
                        fill(t('catalog.brand.products'), {
                          count: formatCount(total(brand), locale),
                        }),
                      ]
                        .filter((part) => part !== null)
                        .join(' · ')}
                    </Typography>
                  </Box>
                  <Button
                    onClick={() => {
                      setEditing({ brand });
                    }}
                    sx={{ minHeight: 44, flexShrink: 0 }}
                  >
                    {t('catalog.products.edit')}
                  </Button>
                </Box>
              ))}
            </Paper>
          )}
        </QueryState>
      </Box>

      {editing !== null && (
        <BrandDialog
          brand={editing.brand}
          onClose={() => {
            setEditing(null);
          }}
          onCreated={(brand) => {
            setEditing({ brand });
          }}
        />
      )}
    </Box>
  );
}

function BrandDialog({
  brand,
  onClose,
  onCreated,
}: {
  readonly brand: BrandView | undefined;
  readonly onClose: () => void;
  /** Заведён — диалог остаётся открытым правкой: логотип грузится уже к нему. */
  readonly onCreated: (brand: BrandView) => void;
}): ReactNode {
  const t = useT();
  const titleId = useId();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(brand?.name ?? '');
  const [country, setCountry] = useState(brand?.country ?? '');
  const [website, setWebsite] = useState(brand?.website ?? '');
  const [invalid, setInvalid] = useState(false);
  const [rejected, setRejected] = useState<MessageKey | null>(null);
  const refresh = (): Promise<unknown> =>
    queryClient.invalidateQueries({ queryKey: marketKeys.all });

  const save = useMutation({
    mutationFn: async () => {
      const values = {
        name: name.trim(),
        country: country.trim() === '' ? undefined : country.trim(),
        website: website.trim() === '' ? undefined : website.trim(),
      };

      if (brand === undefined) return createBrand(createBrandSchema.parse(values));

      return updateBrand(
        brand.id,
        updateBrandSchema.parse({
          name: values.name,
          country: values.country ?? null,
          website: values.website ?? null,
        }),
      );
    },
    onSuccess: async (saved) => {
      await refresh();
      if (brand === undefined) onCreated(saved);
      else onClose();
    },
  });
  const logo = useMutation({
    mutationFn: (file: File) => {
      if (brand === undefined) return Promise.resolve();
      return uploadBrandLogo(brand.id, file);
    },
    onSuccess: refresh,
  });

  const submit = (event: SyntheticEvent): void => {
    event.preventDefault();
    const ok = createBrandSchema.safeParse({
      name: name.trim(),
      ...(country.trim() === '' ? {} : { country: country.trim() }),
      ...(website.trim() === '' ? {} : { website: website.trim() }),
    }).success;

    setInvalid(!ok);
    if (ok) save.mutate();
  };

  // Логотип после загрузки приходит обновлённым списком — тем же, что у страницы.
  const current = useQuery(brandsQuery).data?.find((item) => item.id === brand?.id);

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={onClose} aria-labelledby={titleId}>
      <DialogTitle id={titleId}>
        {brand === undefined
          ? t('catalog.brands.add')
          : fill(t('catalog.brand.edit'), { name: brand.name })}
      </DialogTitle>
      <DialogContent>
        <Box
          component="form"
          id={`${titleId}-form`}
          noValidate
          onSubmit={submit}
          sx={{ display: 'grid', gap: 2, pt: 1 }}
        >
          <TextField
            required
            label={t('catalog.brand.name')}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <TextField
            label={t('catalog.brand.country')}
            value={country}
            onChange={(event) => {
              setCountry(event.target.value);
            }}
            slotProps={{ htmlInput: { maxLength: 60 } }}
          />
          <TextField
            label={t('catalog.brand.website')}
            placeholder="https://"
            value={website}
            onChange={(event) => {
              setWebsite(event.target.value);
            }}
            slotProps={{ htmlInput: { maxLength: 300, inputMode: 'url' } }}
          />
          {invalid && <Alert severity="error">{t('catalog.brand.invalid')}</Alert>}
          {save.error !== null && <Alert severity="error">{t(errorMessageKey(save.error))}</Alert>}
        </Box>

        {brand !== undefined && (
          <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <BrandMark brand={current ?? brand} size={72} />
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file === undefined) return;
                const rejection = rejectPhoto(file, CLUB_IMAGE_MAX_BYTES);
                if (rejection !== null) {
                  setRejected(
                    rejection === 'SIZE' ? 'manage.page.imageTooBig' : 'manage.page.imageType',
                  );
                  return;
                }
                setRejected(null);
                logo.mutate(file);
              }}
            />
            <Button
              variant="outlined"
              startIcon={<ImagePlus size={18} aria-hidden />}
              disabled={logo.isPending}
              onClick={() => input.current?.click()}
              sx={{ minHeight: 48 }}
            >
              {logo.isPending ? t('manage.page.uploading') : t('catalog.brand.logo')}
            </Button>
            {rejected !== null && <Alert severity="error">{t(rejected)}</Alert>}
            {logo.error !== null && (
              <Alert severity="error">{t(errorMessageKey(logo.error))}</Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ minHeight: 44 }}>
          {t('catalog.form.close')}
        </Button>
        <Button
          type="submit"
          form={`${titleId}-form`}
          variant="contained"
          disabled={save.isPending}
          sx={{ minHeight: 44 }}
        >
          {save.isPending ? t('common.loading') : t('catalog.form.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
