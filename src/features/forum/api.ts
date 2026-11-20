import type {
  CreateForumPostInput,
  CreateForumReportInput,
  CreateForumTopicInput,
  ForumLikeView,
  ForumMe,
  ForumMuteInput,
  ForumMuteView,
  ForumPostItem,
  ForumPostLocation,
  ForumPostView,
  ForumReportView,
  ForumSectionInput,
  ForumSectionView,
  ForumSubjectThread,
  ForumSubjectType,
  ForumTopicItem,
  ForumTopicView,
  HideForumPostInput,
  ForumBirthday,
  ForumOnline,
  ForumWarningInput,
  ListForumFeedQuery,
  ListForumPostsQuery,
  ListForumReportsQuery,
  ListForumTopicsQuery,
  ModerateForumTopicInput,
  Page,
  PageQuery,
  RenameForumTopicInput,
  UpdateForumPostInput,
  UpdateForumSectionInput,
  UploadedImage,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/**
 * Форум — ADR-064, `docs/12`. Чтение открыто; с токеном сервер добавляет
 * то, что видно только этому человеку: «нравится», своё скрытое, подписку.
 */

export function listForumSections(): Promise<ForumSectionView[]> {
  return apiRequest<ForumSectionView[]>('/forum/sections');
}

export function fetchForumMe(): Promise<ForumMe> {
  return apiRequest<ForumMe>('/forum/me');
}

export function listForumTopics(
  query: Partial<ListForumTopicsQuery>,
): Promise<Page<ForumTopicItem>> {
  return apiRequest<Page<ForumTopicItem>>(`/forum/topics${queryString(query)}`);
}

export function fetchForumTopic(topicId: string): Promise<ForumTopicView> {
  return apiRequest<ForumTopicView>(`/forum/topics/${topicId}`);
}

export function createForumTopic(input: CreateForumTopicInput): Promise<ForumTopicView> {
  return apiRequest<ForumTopicView>('/forum/topics', { method: 'POST', body: input });
}

export function renameForumTopic(
  topicId: string,
  input: RenameForumTopicInput,
): Promise<ForumTopicView> {
  return apiRequest<ForumTopicView>(`/forum/topics/${topicId}`, { method: 'PATCH', body: input });
}

export async function setForumSubscription(topicId: string, subscribed: boolean): Promise<void> {
  await apiRequest<undefined>(`/forum/topics/${topicId}/subscription`, {
    method: subscribed ? 'PUT' : 'DELETE',
  });
}

export function listForumPosts(
  topicId: string,
  query: Partial<ListForumPostsQuery>,
): Promise<Page<ForumPostView>> {
  return apiRequest<Page<ForumPostView>>(`/forum/topics/${topicId}/posts${queryString(query)}`);
}

export function replyForumTopic(
  topicId: string,
  input: CreateForumPostInput,
): Promise<ForumPostView> {
  return apiRequest<ForumPostView>(`/forum/topics/${topicId}/posts`, {
    method: 'POST',
    body: input,
  });
}

/** Лента сообщений (ADR-067): весь форум, фильтры; с автором — его сообщения. */
export function listForumFeed(query: Partial<ListForumFeedQuery>): Promise<Page<ForumPostItem>> {
  return apiRequest<Page<ForumPostItem>>(`/forum/posts${queryString(query)}`);
}

export function fetchForumOnline(): Promise<ForumOnline> {
  return apiRequest<ForumOnline>('/forum/online');
}

export function listForumBirthdays(): Promise<ForumBirthday[]> {
  return apiRequest<ForumBirthday[]>('/forum/birthdays');
}

export async function warnForumUser(input: ForumWarningInput): Promise<void> {
  await apiRequest<undefined>('/admin/forum/warnings', { method: 'POST', body: input });
}

export function locateForumPost(postId: string): Promise<ForumPostLocation> {
  return apiRequest<ForumPostLocation>(`/forum/posts/${postId}/locate`);
}

export function updateForumPost(
  postId: string,
  input: UpdateForumPostInput,
): Promise<ForumPostView> {
  return apiRequest<ForumPostView>(`/forum/posts/${postId}`, { method: 'PATCH', body: input });
}

export async function deleteForumPost(postId: string): Promise<void> {
  await apiRequest<undefined>(`/forum/posts/${postId}`, { method: 'DELETE' });
}

export function setForumLike(postId: string, liked: boolean): Promise<ForumLikeView> {
  return apiRequest<ForumLikeView>(`/forum/posts/${postId}/like`, {
    method: liked ? 'PUT' : 'DELETE',
  });
}

export async function reportForumPost(
  postId: string,
  input: CreateForumReportInput,
): Promise<void> {
  await apiRequest<undefined>(`/forum/posts/${postId}/reports`, { method: 'POST', body: input });
}

/** Фото в сообщение: сервер пережимает его в WebP и отдаёт путь с размерами. */
export function uploadForumImage(file: File): Promise<UploadedImage> {
  const form = new FormData();
  form.append('file', file);

  return apiRequest<UploadedImage>('/files/forum', { method: 'POST', body: form });
}

// ---------------------------------------------------------------- тема предмета (F2)

export function fetchForumSubject(type: ForumSubjectType, id: string): Promise<ForumSubjectThread> {
  return apiRequest<ForumSubjectThread>(`/forum/subjects/${type}/${id}`);
}

export function postToForumSubject(
  type: ForumSubjectType,
  id: string,
  input: CreateForumPostInput,
): Promise<ForumPostView> {
  return apiRequest<ForumPostView>(`/forum/subjects/${type}/${id}/posts`, {
    method: 'POST',
    body: input,
  });
}

// ---------------------------------------------------------------- модерация

export function listForumReports(
  query: Partial<ListForumReportsQuery>,
): Promise<Page<ForumReportView>> {
  return apiRequest<Page<ForumReportView>>(`/admin/forum/reports${queryString(query)}`);
}

export async function rejectForumReport(reportId: string): Promise<void> {
  await apiRequest<undefined>(`/admin/forum/reports/${reportId}/resolve`, {
    method: 'POST',
    body: { status: 'REJECTED' },
  });
}

export async function hideForumPost(postId: string, input: HideForumPostInput): Promise<void> {
  await apiRequest<undefined>(`/admin/forum/posts/${postId}`, { method: 'PATCH', body: input });
}

export async function moderateForumTopic(
  topicId: string,
  input: ModerateForumTopicInput,
): Promise<void> {
  await apiRequest<undefined>(`/admin/forum/topics/${topicId}`, { method: 'PATCH', body: input });
}

export function listForumMutes(query: PageQuery): Promise<Page<ForumMuteView>> {
  return apiRequest<Page<ForumMuteView>>(`/admin/forum/mutes${queryString(query)}`);
}

export async function muteForumUser(userId: string, input: ForumMuteInput): Promise<void> {
  await apiRequest<undefined>(`/admin/forum/mutes/${userId}`, { method: 'PUT', body: input });
}

export async function unmuteForumUser(userId: string): Promise<void> {
  await apiRequest<undefined>(`/admin/forum/mutes/${userId}`, { method: 'DELETE' });
}

export function listAdminForumSections(): Promise<ForumSectionView[]> {
  return apiRequest<ForumSectionView[]>('/admin/forum/sections');
}

export function createForumSection(input: ForumSectionInput): Promise<ForumSectionView> {
  return apiRequest<ForumSectionView>('/admin/forum/sections', { method: 'POST', body: input });
}

export function updateForumSection(
  sectionId: string,
  input: UpdateForumSectionInput,
): Promise<ForumSectionView> {
  return apiRequest<ForumSectionView>(`/admin/forum/sections/${sectionId}`, {
    method: 'PATCH',
    body: input,
  });
}
