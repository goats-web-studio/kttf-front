import {
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarClock,
  Inbox,
  Medal,
  Megaphone,
  MessageCircle,
  TrendingUp,
  UserRound,
  Users,
  WifiOff,
} from 'lucide-react';
import type { ReactNode } from 'react';

import PartnerCallout, { type PartnerPoint } from './partner-callout';

/**
 * Что клуб получает в KTTF — только то, что уже работает (`05-state` 4):
 * турниры, страница, связь, заявки, тренировки, контент, статистика.
 */
const CLUB_POINTS: readonly PartnerPoint[] = [
  { key: 'offline', icon: WifiOff },
  { key: 'rating', icon: TrendingUp },
  { key: 'page', icon: Building2 },
  { key: 'contact', icon: MessageCircle },
  { key: 'requests', icon: Inbox },
  { key: 'trainings', icon: Users },
  { key: 'content', icon: Megaphone },
  { key: 'stats', icon: BarChart3 },
];

/** Что тренер получает в KTTF — ADR-059, `docs/11` 3.1–3.3, сделанное. */
const COACH_POINTS: readonly PartnerPoint[] = [
  { key: 'page', icon: UserRound },
  { key: 'verified', icon: BadgeCheck },
  { key: 'trainings', icon: CalendarClock },
  { key: 'requests', icon: Inbox },
  { key: 'students', icon: Medal },
  { key: 'content', icon: Megaphone },
  { key: 'contact', icon: MessageCircle },
  { key: 'stats', icon: BarChart3 },
];

/**
 * «Ваш клуб в KTTF» — внизу каталога клубов (ADR-071): на главной от него
 * остался баннер со ссылкой сюда. Заявка — своей страницей с формой (ADR-047).
 */
export function ClubPartnerCallout(): ReactNode {
  return (
    <PartnerCallout
      prefix="home.clubs"
      points={CLUB_POINTS}
      steps={4}
      action={{ href: '/feedback', label: 'clubs.apply' }}
      more={{ href: '/clubs', label: 'home.popularClubs.all' }}
    />
  );
}

/**
 * «Станьте тренером KTTF» — внизу списка тренеров (ADR-071). Кнопка ведёт
 * в кабинет; гостя страница входа вернёт обратно.
 */
export function CoachPartnerCallout(): ReactNode {
  return (
    <PartnerCallout
      prefix="home.coachCta"
      points={COACH_POINTS}
      steps={4}
      action={{ href: '/cabinet/coach', label: 'home.coachCta.action' }}
      more={{ href: '/trainings?view=coaches', label: 'home.coaches.all' }}
    />
  );
}
