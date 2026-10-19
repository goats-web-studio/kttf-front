import { createFileRoute, redirect } from '@tanstack/react-router';

import { parsePlayersSearch } from '@/features/players/players-search';

/**
 * Старый адрес «Рейтинга» — ADR-054.
 *
 * Страница стала «Игроками» на `/players`, но ссылки `/ratings?city=…`
 * уже разосланы по чатам клубов. Они переадресуются с теми же фильтрами:
 * город, клуб и поиск называются в адресе так же.
 */
export const Route = createFileRoute('/_public/ratings')({
  validateSearch: parsePlayersSearch,
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/players', search, replace: true });
  },
});
