import { CLUB_TABLE_MODELS_MAX } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { tablesPayload, type TableRow } from './tables-model';

const row = (id: number, count: string): TableRow => ({
  product: {
    id: `00000000-0000-4000-8000-0000000000${String(id).padStart(2, '0')}`,
    label: `Model ${String(id)}`,
    image: null,
  },
  count,
});

describe('столы клуба — PUT /clubs/:id/tables', () => {
  it('модели с числом столов уходят списком целиком', () => {
    expect(tablesPayload([row(1, '8'), row(2, ' 3 ')])).toEqual({
      tables: [
        { productId: '00000000-0000-4000-8000-000000000001', count: 8 },
        { productId: '00000000-0000-4000-8000-000000000002', count: 3 },
      ],
    });
    // Пустой список — «моделей нет»: так их и убирают.
    expect(tablesPayload([])).toEqual({ tables: [] });
  });

  it('пустое, ноль и повтор модели не уходят', () => {
    expect(tablesPayload([row(1, '')])).toBeNull();
    expect(tablesPayload([row(1, '0')])).toBeNull();
    expect(tablesPayload([row(1, '2'), row(1, '3')])).toBeNull();
    expect(
      tablesPayload(Array.from({ length: CLUB_TABLE_MODELS_MAX + 1 }, (_, i) => row(i + 1, '1'))),
    ).toBeNull();
  });
});
