import type {
  AddClubVideoInput,
  ClubContentItem,
  CoachContentItem,
  CreateClubPostInput,
  HideClubContentInput,
  ListClubPostsQuery,
  Page,
  PageQuery,
  UpdateClubMediaInput,
  UpdateClubPostInput,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

import { ownerPath, type ContentMediaView, type ContentOwner, type ContentPostView } from './owner';

/**
 * Новости, акции, фото и видео клуба (ADR-055, `docs/09` 3.2) и тренера
 * (ADR-059, `docs/11` 3.2.2): одни маршруты под `/clubs/:id` и `/coaches/:id`.
 */

export function listPosts(
  owner: ContentOwner,
  query: ListClubPostsQuery,
): Promise<Page<ContentPostView>> {
  return apiRequest<Page<ContentPostView>>(`${ownerPath(owner)}/posts${queryString(query)}`);
}

/** Со скрытыми и прошедшими — кабинет владельца. */
export function listAllPosts(
  owner: ContentOwner,
  query: PageQuery,
): Promise<Page<ContentPostView>> {
  return apiRequest<Page<ContentPostView>>(`${ownerPath(owner)}/posts/all${queryString(query)}`);
}

export function createPost(
  owner: ContentOwner,
  input: CreateClubPostInput,
): Promise<ContentPostView> {
  return apiRequest<ContentPostView>(`${ownerPath(owner)}/posts`, { method: 'POST', body: input });
}

export function updatePost(
  owner: ContentOwner,
  postId: string,
  input: UpdateClubPostInput,
): Promise<ContentPostView> {
  return apiRequest<ContentPostView>(`${ownerPath(owner)}/posts/${postId}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deletePost(owner: ContentOwner, postId: string): Promise<void> {
  await apiRequest<undefined>(`${ownerPath(owner)}/posts/${postId}`, { method: 'DELETE' });
}

export function listMedia(owner: ContentOwner): Promise<readonly ContentMediaView[]> {
  return apiRequest<readonly ContentMediaView[]>(`${ownerPath(owner)}/media`);
}

export function listAllMedia(owner: ContentOwner): Promise<readonly ContentMediaView[]> {
  return apiRequest<readonly ContentMediaView[]>(`${ownerPath(owner)}/media/all`);
}

/** Фото уходит сразу в галерею: сервер пережимает его и сам знает размеры. */
export function uploadPhoto(
  owner: ContentOwner,
  file: File,
  caption: string,
): Promise<ContentMediaView> {
  const form = new FormData();

  form.append('file', file);
  if (caption.trim() !== '') form.append('caption', caption.trim());

  return apiRequest<ContentMediaView>(`${ownerPath(owner)}/media/photos`, {
    method: 'POST',
    body: form,
  });
}

export function addVideo(owner: ContentOwner, input: AddClubVideoInput): Promise<ContentMediaView> {
  return apiRequest<ContentMediaView>(`${ownerPath(owner)}/media/videos`, {
    method: 'POST',
    body: input,
  });
}

export function updateMedia(
  owner: ContentOwner,
  mediaId: string,
  input: UpdateClubMediaInput,
): Promise<ContentMediaView> {
  return apiRequest<ContentMediaView>(`${ownerPath(owner)}/media/${mediaId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function reorderMedia(
  owner: ContentOwner,
  ids: readonly string[],
): Promise<readonly ContentMediaView[]> {
  return apiRequest<readonly ContentMediaView[]>(`${ownerPath(owner)}/media/order`, {
    method: 'PUT',
    body: { ids },
  });
}

export async function deleteMedia(owner: ContentOwner, mediaId: string): Promise<void> {
  await apiRequest<undefined>(`${ownerPath(owner)}/media/${mediaId}`, { method: 'DELETE' });
}

/** Лента модерации клубов — администратор платформы. */
export function fetchClubContentFeed(query: PageQuery): Promise<Page<ClubContentItem>> {
  return apiRequest<Page<ClubContentItem>>(`/admin/club-content${queryString(query)}`);
}

/** Лента модерации тренеров — T2.2. */
export function fetchCoachContentFeed(query: PageQuery): Promise<Page<CoachContentItem>> {
  return apiRequest<Page<CoachContentItem>>(`/admin/coach-content${queryString(query)}`);
}

/** Скрыть или вернуть запись или медиа — причину видит владелец. */
export async function hideContent(
  scope: ContentOwner['kind'],
  kind: 'POST' | 'MEDIA',
  id: string,
  input: HideClubContentInput,
): Promise<void> {
  const path = kind === 'POST' ? 'posts' : 'media';

  await apiRequest<undefined>(`/admin/${scope}-content/${path}/${id}`, {
    method: 'PATCH',
    body: input,
  });
}
