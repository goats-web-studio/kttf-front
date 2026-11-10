import { createFileRoute } from '@tanstack/react-router';
import { type ReactNode } from 'react';
import { z } from 'zod';

import { searchPage, searchText } from '@/common/search';
import ForumBoard, { type BoardSearch } from '@/features/forum/board';

const searchSchema = z.object({
  q: searchText,
  sort: z.enum(['NEW']).optional().catch(undefined),
  page: searchPage,
});

export const Route = createFileRoute('/_public/forum/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: ForumPage,
});

/**
 * Форум — ADR-064, `docs/12` 5. Классическая раскладка: разделы слева,
 * в центре — обсуждения всех разделов по последнему ответу.
 */
function ForumPage(): ReactNode {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <ForumBoard
      search={search}
      onSearch={(patch: BoardSearch, replace = false) => {
        void navigate({
          search: (previous) => ({ ...previous, ...patch, page: undefined }),
          replace,
        });
      }}
      onPage={(next) => {
        void navigate({
          search: (previous) => ({ ...previous, page: next > 1 ? next : undefined }),
        });
      }}
    />
  );
}
