import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, type ReactNode } from 'react';
import { z } from 'zod';

import { useT } from '@/common/i18n';
import { searchPage, searchText } from '@/common/search';
import EmptyState from '@/common/ui/empty-state';
import ForumBoard from '@/features/forum/board';
import { FORUM_HREF } from '@/features/forum/labels';
import { forumSectionsQuery } from '@/features/forum/queries';

const searchSchema = z.object({
  q: searchText,
  sort: z.enum(['NEW']).optional().catch(undefined),
  page: searchPage,
});

type Search = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_public/forum/$section')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: SectionPage,
});

/**
 * Раздел форума — `docs/12` 5, в общей раскладке форума (`board.tsx`).
 * Закреплённые темы сверху, потом по последнему ответу; «Новые» — по дате
 * создания. Фильтры в адресе: ссылку на поиск пересылают в чат.
 */
function SectionPage(): ReactNode {
  const t = useT();
  const { section: slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const sections = useQuery(forumSectionsQuery);
  const section = sections.data?.find((item) => item.slug === slug);
  const filter = useCallback(
    (patch: Partial<Search>, replace = false) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch, page: undefined }),
        replace,
      });
    },
    [navigate],
  );

  if (sections.data !== undefined && section === undefined) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 5, sm: 6 } }}>
        <EmptyState
          title={t('forum.section.notFound')}
          action={<Button href={FORUM_HREF}>{t('page.forum.title')}</Button>}
        />
      </Container>
    );
  }

  return (
    <ForumBoard
      slug={slug}
      {...(section === undefined ? {} : { section })}
      search={search}
      onSearch={filter}
      onPage={(next) => {
        void navigate({
          search: (previous) => ({ ...previous, page: next > 1 ? next : undefined }),
        });
      }}
    />
  );
}
