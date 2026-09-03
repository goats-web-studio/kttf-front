import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

interface PagePlaceholderProps {
  readonly title: string;
  readonly children?: ReactNode;
}

/**
 * Заглушка раздела.
 *
 * Каркас доводит до экрана маршрутизацию и оболочку, а не содержимое:
 * рейтинги, календарь и профили приходят своими задачами (ТЗ 9).
 */
export default function PagePlaceholder({ title, children }: PagePlaceholderProps): ReactNode {
  const t = useT();

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-display-md font-bold text-ink-900">{title}</h1>
      <p className="mt-2 text-ink-700">{t('common.soon')}</p>
      {children}
    </section>
  );
}
