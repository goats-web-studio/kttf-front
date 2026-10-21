import {
  clubImageVariant,
  coachImageVariant,
  createClubPostSchema,
  createCoachPostSchema,
  type ClubMediaView,
  type ClubPostView,
  type CreateClubPostInput,
  type UploadedImage,
} from '@kttf/shared/types';

import type { MessageKey } from '@/common/i18n';
import { uploadClubImage } from '@/features/clubs/api';
import { uploadCoachImage } from '@/features/coaches/api';

/**
 * Чей контент — клуба (ADR-055) или тренера (ADR-059, T2.2). Механика одна:
 * записи и акции с закрепом, галерея фото и видео, постмодерация. Разница —
 * адрес (`/clubs/:id/…` или `/coaches/:id/…`), папка картинок и несколько
 * текстов, где названо, чья это страница.
 */
export type ContentOwnerKind = 'club' | 'coach';

export interface ContentOwner {
  readonly kind: ContentOwnerKind;
  readonly id: string;
}

export const clubOwner = (id: string): ContentOwner => ({ kind: 'club', id });
export const coachOwner = (id: string): ContentOwner => ({ kind: 'coach', id });

/** Запись без поля владельца: у клуба `clubId`, у тренера `coachId`. */
export type ContentPostView = Omit<ClubPostView, 'clubId'>;
/** Медиа без поля владельца. */
export type ContentMediaView = Omit<ClubMediaView, 'clubId'>;

/** Корень маршрутов владельца. */
export function ownerPath(owner: ContentOwner): string {
  return owner.kind === 'club' ? `/clubs/${owner.id}` : `/coaches/${owner.id}`;
}

/**
 * Вариант картинки нужной ширины. Каждая функция отдаёт чужой путь как есть,
 * поэтому подходит любая картинка — клуба или тренера.
 */
export function contentImageVariant(url: string, width: 480 | 960 | 1600): string {
  return coachImageVariant(clubImageVariant(url, width), width);
}

/** Картинка записи — в папку владельца. */
export function uploadOwnerImage(owner: ContentOwner, file: File): Promise<UploadedImage> {
  return owner.kind === 'club' ? uploadClubImage(owner.id, file) : uploadCoachImage(owner.id, file);
}

/** Проверка записи перед отправкой: путь картинки у каждого владельца свой. */
export function parsePost(
  owner: ContentOwner,
  values: CreateClubPostInput,
): CreateClubPostInput | null {
  const parsed = (owner.kind === 'club' ? createClubPostSchema : createCoachPostSchema).safeParse(
    values,
  );

  return parsed.success ? parsed.data : null;
}

/** Тексты, в которых названо, чья страница. */
interface OwnerTexts {
  readonly postsTitle: MessageKey;
  readonly galleryPhoto: MessageKey;
  readonly galleryVideo: MessageKey;
  readonly postsLead: MessageKey;
  readonly postsExpired: MessageKey;
  readonly postsEmpty: MessageKey;
  readonly mediaEmpty: MessageKey;
}

export const OWNER_TEXTS: Readonly<Record<ContentOwnerKind, OwnerTexts>> = {
  club: {
    postsTitle: 'club.posts.title',
    galleryPhoto: 'club.gallery.photo',
    galleryVideo: 'club.gallery.video',
    postsLead: 'manage.posts.lead',
    postsExpired: 'manage.posts.expired',
    postsEmpty: 'manage.posts.empty',
    mediaEmpty: 'manage.media.empty',
  },
  coach: {
    postsTitle: 'coach.posts.title',
    galleryPhoto: 'coach.gallery.photo',
    galleryVideo: 'coach.gallery.video',
    postsLead: 'coach.posts.lead',
    postsExpired: 'coach.posts.expired',
    postsEmpty: 'coach.posts.empty',
    mediaEmpty: 'coach.media.empty',
  },
};

/** «Скрыто администратором: причина» — одна строка для записи и фото. */
export function hiddenNote(
  t: (key: MessageKey) => string,
  item: { readonly hiddenReason?: string | null },
): string {
  return item.hiddenReason == null
    ? t('manage.content.hidden')
    : `${t('manage.content.hidden')}: ${item.hiddenReason}`;
}
