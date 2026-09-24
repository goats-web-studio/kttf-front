import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';

import EmptyState from './empty-state';

interface QueryStateProps {
  readonly isPending: boolean;
  readonly error: unknown;
  readonly onRetry?: (() => void) | undefined;
  /**
   * Заготовка на время загрузки — форма будущего содержимого (раздел 7).
   * Без неё — строка «Загрузка».
   */
  readonly loading?: ReactNode;
  readonly children: ReactNode;
}

/**
 * Ожидание, отказ и повтор для экрана, читающего API.
 *
 * Собрано в одном месте не ради краткости: текст отказа обязан подбираться по
 * коду через `errorMessageKey`, а не показывать `message` из ответа — он
 * диагностический и английский (бриф 3.4). Повторённое на каждом экране,
 * это правило нарушается на первом же, где про него забыли.
 *
 * Цвета берутся из темы раздела: на консоли и экране зала это ночная тема,
 * и ошибка сама получает `--night-red` вместо светлого красного (запрет №7).
 */
export default function QueryState({
  isPending,
  error,
  onRetry,
  loading,
  children,
}: QueryStateProps): ReactNode {
  const t = useT();

  if (isPending) {
    return (
      loading ?? (
        <Typography color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>
          {t('common.loading')}
        </Typography>
      )
    );
  }

  if (error !== null && error !== undefined) {
    return (
      <EmptyState
        tone="error"
        title={t(errorMessageKey(error))}
        action={
          onRetry === undefined ? undefined : (
            <Button color="error" onClick={onRetry}>
              {t('error.unexpected.action')}
            </Button>
          )
        }
      />
    );
  }

  return children;
}
