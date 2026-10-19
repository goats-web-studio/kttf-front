import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { FileImage } from 'lucide-react';
import type { ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';

import { fetchCredentialFile } from './api';

/**
 * Адрес скана для `<img>` и `<a>`.
 *
 * Публичный скан открывается обычной ссылкой. Непубличный сервер отдаёт
 * только с токеном владельца или администратора (ADR-059, риски: сканы —
 * персональные данные), а `<img>` заголовка не несёт — поэтому файл берётся
 * запросом и показывается через object URL. Он живёт, пока жива вкладка:
 * сканов на экране единицы, а снятый раньше времени адрес ломал бы
 * картинку при возврате на вкладку.
 */
function useScanSrc(
  url: string,
  isPublic: boolean,
  version: string,
): { readonly src: string | null; readonly error: unknown } {
  // Свой корень ключа: сброс кэша тренеров после правки не должен
  // перекачивать сканы. Новый скан — новый путь загрузки в `version`.
  const file = useQuery({
    queryKey: ['coach-scans', url, version],
    queryFn: async () => URL.createObjectURL(await fetchCredentialFile(url)),
    enabled: !isPublic,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  return { src: isPublic ? url : (file.data ?? null), error: file.error };
}

interface CredentialScanProps {
  /** `CoachCredentialView.fileUrl`: маршрут выдачи скана. */
  readonly url: string;
  /** Тренер отметил «показывать скан»: открывается без токена. */
  readonly isPublic: boolean;
  /** Путь загрузки скана (`file`), если известен: по нему видно, что скан заменили. */
  readonly version?: string | null;
  /** `thumb` — превью для разбора заявки, `link` — ссылка «Скан» в строке документа. */
  readonly variant?: 'link' | 'thumb';
}

export default function CredentialScan({
  url,
  isPublic,
  version,
  variant = 'link',
}: CredentialScanProps): ReactNode {
  const t = useT();
  const { src, error } = useScanSrc(url, isPublic, version ?? '');

  if (error !== null && error !== undefined) {
    return (
      <Typography variant="body2" sx={{ color: 'var(--red-700)' }}>
        {t(errorMessageKey(error))}
      </Typography>
    );
  }

  if (src === null) {
    return variant === 'thumb' ? (
      <Skeleton variant="rounded" width={160} height={120} />
    ) : (
      <Skeleton variant="text" width={64} />
    );
  }

  if (variant === 'thumb') {
    return (
      <Link href={src} target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-block' }}>
        <Box
          component="img"
          src={src}
          alt={t('coach.credential.scan')}
          sx={{
            display: 'block',
            width: 160,
            height: 120,
            objectFit: 'cover',
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
          }}
        />
      </Link>
    );
  }

  return (
    <Link
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      variant="body2"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, minHeight: 32 }}
    >
      <FileImage size={16} aria-hidden />
      {t('coach.credential.scan')}
    </Link>
  );
}
