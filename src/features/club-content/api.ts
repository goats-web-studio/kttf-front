import type {
  AddClubVideoInput,
  ClubContentItem,
  ClubMediaView,
  ClubPostView,
  CreateClubPostInput,
  HideClubContentInput,
  ListClubPostsQuery,
  Page,
  PageQuery,
  UpdateClubMediaInput,
  UpdateClubPostInput,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/** Новости, акции, фото и видео клуба — ADR-055, `docs/09` 3.2. */

export function listClubPosts(
  clubId: string,
  query: ListClubPostsQuery,
): Promise<Page<ClubPostView>> {
  return apiRequest<Page<ClubPostView>>(`/clubs/${clubId}/posts${queryString(query)}`);
}

/** Со скрытыми и прошедшими — кабинет клуба. */
export function listAllClubPosts(clubId: string, query: PageQuery): Promise<Page<ClubPostView>> {
  return apiRequest<Page<ClubPostView>>(`/clubs/${clubId}/posts/all${queryString(query)}`);
}

export function createClubPost(clubId: string, input: CreateClubPostInput): Promise<ClubPostView> {
  return apiRequest<ClubPostView>(`/clubs/${clubId}/posts`, { method: 'POST', body: input });
}

export function updateClubPost(
  clubId: string,
  postId: string,
  input: UpdateClubPostInput,
): Promise<ClubPostView> {
  return apiRequest<ClubPostView>(`/clubs/${clubId}/posts/${postId}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteClubPost(clubId: string, postId: string): Promise<void> {
  await apiRequest<undefined>(`/clubs/${clubId}/posts/${postId}`, { method: 'DELETE' });
}

export function listClubMedia(clubId: string): Promise<readonly ClubMediaView[]> {
  return apiRequest<readonly ClubMediaView[]>(`/clubs/${clubId}/media`);
}

export function listAllClubMedia(clubId: string): Promise<readonly ClubMediaView[]> {
  return apiRequest<readonly ClubMediaView[]>(`/clubs/${clubId}/media/all`);
}

/** Фото уходит сразу в галерею: сервер пережимает его и сам знает размеры. */
export function uploadClubPhoto(
  clubId: string,
  file: File,
  caption: string,
): Promise<ClubMediaView> {
  const form = new FormData();

  form.append('file', file);
  if (caption.trim() !== '') form.append('caption', caption.trim());

  return apiRequest<ClubMediaView>(`/clubs/${clubId}/media/photos`, { method: 'POST', body: form });
}

export function addClubVideo(clubId: string, input: AddClubVideoInput): Promise<ClubMediaView> {
  return apiRequest<ClubMediaView>(`/clubs/${clubId}/media/videos`, {
    method: 'POST',
    body: input,
  });
}

export function updateClubMedia(
  clubId: string,
  mediaId: string,
  input: UpdateClubMediaInput,
): Promise<ClubMediaView> {
  return apiRequest<ClubMediaView>(`/clubs/${clubId}/media/${mediaId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function reorderClubMedia(
  clubId: string,
  ids: readonly string[],
): Promise<readonly ClubMediaView[]> {
  return apiRequest<readonly ClubMediaView[]>(`/clubs/${clubId}/media/order`, {
    method: 'PUT',
    body: { ids },
  });
}

export async function deleteClubMedia(clubId: string, mediaId: string): Promise<void> {
  await apiRequest<undefined>(`/clubs/${clubId}/media/${mediaId}`, { method: 'DELETE' });
}

/** Лента модерации — администратор платформы. */
export function fetchClubContentFeed(query: PageQuery): Promise<Page<ClubContentItem>> {
  return apiRequest<Page<ClubContentItem>>(`/admin/club-content${queryString(query)}`);
}

export async function hideClubContent(
  kind: ClubContentItem['kind'],
  id: string,
  input: HideClubContentInput,
): Promise<void> {
  const path = kind === 'POST' ? 'posts' : 'media';

  await apiRequest<undefined>(`/admin/club-content/${path}/${id}`, {
    method: 'PATCH',
    body: input,
  });
}
