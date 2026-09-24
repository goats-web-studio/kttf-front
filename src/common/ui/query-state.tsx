import type { ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';

import Button from './button';
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
  /**
   * Тёмная поверхность консоли и экрана зала. Светлые токены на чёрном не
   * переворачиваются (запрет №7): у `--red-700` там контраст ниже порога.
   */
  readonly surface?: 'paper' | 'night';
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
 * Состояние отказа отличает отсутствие сети от ответа сервера: за это
 * отвечает `errorMessageKey`, здесь нужен только повтор запроса.
 */
export default function QueryState({
  isPending,
  error,
  onRetry,
  loading,
  surface = 'paper',
  children,
}: QueryStateProps): ReactNode {
  const t = useT();

  if (isPending) {
    return (
      loading ?? (
        <p
          className={
            surface === 'night'
              ? 'py-10 text-center text-night-ink-500'
              : 'py-10 text-center text-ink-500'
          }
        >
          {t('common.loading')}
        </p>
      )
    );
  }

  if (error !== null && error !== undefined) {
    if (surface === 'night') {
      return (
        <div className="py-10 text-center">
          <p role="alert" className="text-night-red">
            {t(errorMessageKey(error))}
          </p>
          {onRetry !== undefined && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 min-h-12 rounded-sm border border-night-line-strong px-5 text-night-ink-900"
            >
              {t('error.unexpected.action')}
            </button>
          )}
        </div>
      );
    }

    return (
      <EmptyState
        role="alert"
        title={t(errorMessageKey(error))}
        action={
          onRetry === undefined ? undefined : (
            <Button onClick={onRetry}>{t('error.unexpected.action')}</Button>
          )
        }
      />
    );
  }

  return children;
}
