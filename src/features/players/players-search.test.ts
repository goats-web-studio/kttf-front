import { describe, expect, it } from 'vitest';

import { parsePlayersSearch, toPlayersQuery } from './players-search';

const BLADE = '00000000-0000-4000-8000-0000000000e1';
const RUBBER = '00000000-0000-4000-8000-0000000000e2';

describe('«Кто играет» в адресе игроков — ADR-058', () => {
  it('основание, накладка и вид «инвентарь» доходят до запроса', () => {
    const search = parsePlayersSearch({ bladeId: BLADE, rubberId: RUBBER, view: 'equipment' });

    expect(search).toMatchObject({ bladeId: BLADE, rubberId: RUBBER, view: 'equipment' });
    expect(toPlayersQuery(search)).toMatchObject({ bladeId: BLADE, rubberId: RUBBER });
  });

  it('кривой идентификатор выпадает один', () => {
    const search = parsePlayersSearch({ bladeId: 'viscaria', rubberId: RUBBER, view: 'table' });

    expect(search.bladeId).toBeUndefined();
    expect(search.view).toBeUndefined();
    expect(toPlayersQuery(search)).not.toHaveProperty('bladeId');
    expect(toPlayersQuery(search).rubberId).toBe(RUBBER);
  });
});
