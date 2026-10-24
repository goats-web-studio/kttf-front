import type { ProductCategory } from '@kttf/shared/types';
import {
  Building2,
  CalendarClock,
  CalendarDays,
  CircleDot,
  Clock,
  Flag,
  GraduationCap,
  Layers,
  Lightbulb,
  ListOrdered,
  Medal,
  MessagesSquare,
  PenLine,
  Radio,
  Send,
  ShoppingBag,
  Sparkles,
  Swords,
  Tag,
  TentTree,
  Trophy,
  User,
  UserPlus,
  Users,
  Venus,
  type LucideIcon,
} from 'lucide-react';

import type { MessageKey } from '@/common/i18n';
import { categoryHref } from '@/features/market/labels';

export interface NavMenuItem {
  readonly href: string;
  readonly icon: LucideIcon;
  /** Тексты `nav.menu.<key>.title` и `nav.menu.<key>.text`. */
  readonly key: string;
}

const category = (value: ProductCategory, key: string, icon: LucideIcon): NavMenuItem => ({
  href: categoryHref(value),
  icon,
  key,
});

/**
 * Быстрые переходы из шапки — по разделу на пункт `SECTIONS`.
 *
 * Только адреса, которые разделы уже понимают: фильтры живут в поиске
 * адреса (`?status=`, `?kids=`, `?view=`), и ссылка открывает раздел сразу
 * отфильтрованным. Последний пункт — действие для тех, кто приходит
 * работать: заявка клуба, «Стать тренером».
 */
export const NAV_MENUS: Readonly<Record<string, readonly NavMenuItem[]>> = {
  '/players': [
    { href: '/players', icon: ListOrdered, key: 'players.rating' },
    { href: '/players?gender=FEMALE', icon: Venus, key: 'players.women' },
    { href: '/players?view=equipment', icon: Layers, key: 'players.equipment' },
    // Дуэли и спарринги — ADR-065, `docs/13` 5.1.
    { href: '/duels', icon: Swords, key: 'players.duels' },
  ],
  '/tournaments': [
    { href: '/tournaments', icon: CalendarDays, key: 'tournaments.calendar' },
    { href: '/tournaments?status=REG_OPEN&view=list', icon: Flag, key: 'tournaments.open' },
    { href: '/tournaments?status=RUNNING&view=list', icon: Radio, key: 'tournaments.running' },
    { href: '/tournaments?status=FINISHED&view=list', icon: Trophy, key: 'tournaments.results' },
  ],
  '/clubs': [
    { href: '/clubs', icon: Building2, key: 'clubs.all' },
    { href: '/clubs?upcoming=true', icon: Clock, key: 'clubs.upcoming' },
    { href: '/clubs?kids=true', icon: Sparkles, key: 'clubs.kids' },
    { href: '/feedback', icon: Send, key: 'clubs.apply' },
  ],
  '/market': [
    category('BLADE', 'market.blades', CircleDot),
    category('RUBBER', 'market.rubbers', Layers),
    category('BALL', 'market.balls', Medal),
    { href: '/market/brands', icon: Tag, key: 'market.brands' },
    { href: '/market', icon: ShoppingBag, key: 'market.all' },
  ],
  '/trainings': [
    { href: '/trainings', icon: CalendarClock, key: 'trainings.all' },
    { href: '/trainings?view=coaches', icon: GraduationCap, key: 'trainings.coaches' },
    { href: '/trainings?kind=INDIVIDUAL', icon: User, key: 'trainings.individual' },
    { href: '/trainings?audience=KIDS', icon: Users, key: 'trainings.kids' },
    { href: '/trainings?kind=CAMP', icon: TentTree, key: 'trainings.camps' },
    { href: '/cabinet/coach', icon: UserPlus, key: 'trainings.become' },
  ],
  '/forum': [
    { href: '/forum', icon: MessagesSquare, key: 'forum.all' },
    { href: '/forum/tournaments', icon: Trophy, key: 'forum.tournaments' },
    { href: '/forum/equipment', icon: Layers, key: 'forum.equipment' },
    { href: '/forum/site', icon: Lightbulb, key: 'forum.site' },
    { href: '/forum/new', icon: PenLine, key: 'forum.new' },
  ],
};

export const navMenuKey = (key: string, part: 'title' | 'text'): MessageKey =>
  `nav.menu.${key}.${part}` as MessageKey;
