import type { Locale } from '@/common/i18n';

/**
 * Тексты блока «Тренер на турнире» в своей записи — не в общих словарях:
 * ru и kk грузятся в набор консоли судьи с бюджетом 420 КБ gzip (ТС 8.1,
 * ADR-086), а блок живёт только на странице турнира.
 */
export const OWN_COACH_TEXTS: Readonly<
  Record<Locale, { readonly hint: string; readonly add: string; readonly remove: string }>
> = {
  ru: {
    hint: 'Медали за турнир засчитываются тренеру, которого вы укажете. Поменять или убрать — до старта',
    add: 'Добавить тренера',
    remove: 'Убрать',
  },
  kk: {
    hint: 'Турнир медальдары сіз көрсеткен жаттықтырушыға есептеледі. Ауыстыру не алып тастау — басталғанға дейін',
    add: 'Жаттықтырушы қосу',
    remove: 'Алып тастау',
  },
  en: {
    hint: 'Medals from the tournament are credited to the coach you set. Change or remove before the start',
    add: 'Add coach',
    remove: 'Remove',
  },
  zh: {
    hint: '本次比赛的奖牌计入您指定的教练。开赛前可更换或移除',
    add: '添加教练',
    remove: '移除',
  },
  ja: {
    hint: '大会のメダルは指定したコーチに加算されます。変更・削除は開始前まで',
    add: 'コーチを追加',
    remove: '外す',
  },
  ko: {
    hint: '대회 메달은 지정한 코치에게 반영돼요. 시작 전까지 바꾸거나 뺄 수 있어요',
    add: '코치 추가',
    remove: '빼기',
  },
};
