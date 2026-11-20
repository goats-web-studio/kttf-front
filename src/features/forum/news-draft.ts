import {
  DEFAULT_NEWS_LOCALE,
  type CreateForumTopicInput,
  type ForumAuthoredAs,
  type ForumImage,
  type ForumPostView,
  type ForumTopicView,
  type SiteLocale,
} from '@kttf/shared/types';

/**
 * Черновик новости KTTF для редактора по языкам — ADR-099: оригинал и версии,
 * у каждой свои заголовок, текст и фото; из него — тело запроса.
 */

/** Страница новости на одном языке: заголовок, текст и фото по порядку. */
export interface NewsPage {
  readonly title: string;
  readonly body: string;
  readonly images: readonly ForumImage[];
}

/** Версия на другом языке. */
export interface NewsVersion extends NewsPage {
  readonly locale: SiteLocale;
}

/** Вся новость: оригинал, его язык, голос и версии — по порядку вкладок. */
export interface NewsDraft extends NewsPage {
  readonly locale: SiteLocale;
  readonly authoredAs: ForumAuthoredAs;
  readonly translations: readonly NewsVersion[];
}

export const EMPTY_PAGE: NewsPage = { title: '', body: '', images: [] };

/** Заголовок от трёх знаков и непустой текст — как проверяет сервер. */
export function pageValid(page: NewsPage): boolean {
  return page.title.trim().length >= 3 && page.body.trim() !== '';
}

export function trimPage<T extends NewsPage>(page: T): T {
  return { ...page, title: page.title.trim(), body: page.body.trim(), images: [...page.images] };
}

/** Новость → тело `POST /forum/topics` (ADR-099: версии — тем же запросом). */
export function newsTopicInput(sectionId: string, draft: NewsDraft): CreateForumTopicInput {
  return {
    sectionId,
    title: draft.title,
    body: draft.body,
    images: [...draft.images],
    authoredAs: draft.authoredAs,
    locale: draft.locale,
    translations: draft.translations.map((version) => ({
      locale: version.locale,
      title: version.title,
      body: version.body,
      images: [...version.images],
    })),
  };
}

/** Новость темы — для правки её первого сообщения. */
export function newsDraftOf(topic: ForumTopicView, post: ForumPostView): NewsDraft {
  return {
    locale: topic.locale ?? DEFAULT_NEWS_LOCALE,
    authoredAs: post.authoredAs,
    title: topic.title,
    body: post.body,
    images: post.images,
    translations: topic.translations.map((version) => ({
      locale: version.locale,
      title: version.title,
      body: version.body,
      images: version.images,
    })),
  };
}
