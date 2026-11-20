import Container from '@mui/material/Container';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { z } from 'zod';

import { useT } from '@/common/i18n';
import PageHeader from '@/common/ui/page-header';
import Surface from '@/common/ui/surface';
import { WriteGate } from '@/features/forum/composer';
import { FORUM_HREF, sectionHref } from '@/features/forum/labels';
import NewTopicForm from '@/features/forum/new-topic-form';
import { forumSectionsQuery } from '@/features/forum/queries';

const searchSchema = z.object({
  section: z.string().max(40).optional().catch(undefined),
});

export const Route = createFileRoute('/_app/forum/new')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: NewTopicPage,
});

/**
 * Новая тема отдельной страницей — для прямых ссылок и пункта меню
 * «Новая тема». На самом форуме та же форма открывается окном.
 */
function NewTopicPage(): ReactNode {
  const t = useT();
  const search = Route.useSearch();
  const sections = useQuery(forumSectionsQuery);
  const section = sections.data?.find((item) => item.slug === search.section);

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <PageHeader
        back={
          section === undefined
            ? { href: FORUM_HREF, label: t('page.forum.title') }
            : { href: sectionHref(section.slug), label: section.title }
        }
        title={t('forum.newTopic')}
      />

      <WriteGate>
        <Surface>
          <NewTopicForm initialSection={search.section} />
        </Surface>
      </WriteGate>
    </Container>
  );
}
