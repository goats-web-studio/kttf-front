import type { ClubView, ContactKind } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import {
  AtSign,
  Globe,
  MessageCircle,
  Navigation,
  Phone,
  Send,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, useT, type MessageKey } from '@/common/i18n';
import { usePlaceName } from '@/features/places/place-name';

import {
  instagramHandle,
  instagramHref,
  phoneHref,
  primaryContactOf,
  routeHref,
  telegramHandle,
  telegramHref,
  websiteLabel,
  whatsappHref,
} from './contacts';
import { trackClubContact } from './track';

interface Action {
  readonly kind: ContactKind | 'ROUTE';
  readonly href: string;
  readonly label: MessageKey;
  readonly icon: LucideIcon;
  readonly external: boolean;
}

/**
 * Кнопки связи под шапкой клуба — путь от рекламы до сообщения клубу в
 * одно нажатие (ADR-055, решение 3). Главная — залитая, она одна на экране
 * (07, запрет 2). Каждое нажатие считается в статистику клуба.
 */
export default function ContactActions({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const primary = primaryContactOf(club);
  const message = fill(t('club.contact.message'), { club: club.name });

  const actions: Action[] = [];

  if (club.whatsapp !== null) {
    actions.push({
      kind: 'WHATSAPP',
      href: whatsappHref(club.whatsapp, message),
      label: 'club.contact.whatsapp',
      icon: MessageCircle,
      external: true,
    });
  }
  if (club.phone !== null) {
    actions.push({
      kind: 'PHONE',
      href: phoneHref(club.phone),
      label: 'club.contact.call',
      icon: Phone,
      external: false,
    });
  }
  if (club.telegram !== null) {
    actions.push({
      kind: 'TELEGRAM',
      href: telegramHref(club.telegram),
      label: 'club.contact.telegram',
      icon: Send,
      external: true,
    });
  }
  actions.push({
    kind: 'ROUTE',
    href: routeHref({ ...club, cityName: placeName(club.city) }),
    label: 'club.contact.route',
    icon: Navigation,
    external: true,
  });

  // Главная — первой: на телефоне она под большим пальцем.
  actions.sort((a, b) => Number(b.kind === primary) - Number(a.kind === primary));

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(auto-fit, minmax(160px, max-content))' },
      }}
    >
      {actions.map((action, index) => {
        const Icon = action.icon;
        const isPrimary = action.kind === primary;

        return (
          <Button
            key={action.kind}
            variant={isPrimary ? 'contained' : 'outlined'}
            href={action.href}
            startIcon={<Icon size={18} aria-hidden />}
            {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            onClick={() => {
              trackClubContact(club.id, action.kind);
            }}
            sx={{
              minHeight: 48,
              // Нечётная последняя кнопка на телефоне — во всю ширину, а не
              // половинкой с дырой справа.
              ...(index === actions.length - 1 && actions.length % 2 === 1
                ? { gridColumn: { xs: '1 / -1', sm: 'auto' } }
                : {}),
            }}
          >
            {t(action.label)}
          </Button>
        );
      })}
    </Box>
  );
}

/**
 * Контакты списком — в боковой колонке: сам номер, имя в Telegram, сайт.
 * Кнопки выше говорят «что сделать», здесь — «куда именно».
 */
export function ContactList({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();

  const rows: { key: string; icon: LucideIcon; content: ReactNode }[] = [];

  if (club.phone !== null) {
    rows.push({
      key: 'phone',
      icon: Phone,
      content: (
        <Link
          href={phoneHref(club.phone)}
          onClick={() => {
            trackClubContact(club.id, 'PHONE');
          }}
        >
          {club.phone}
        </Link>
      ),
    });
  }
  if (club.whatsapp !== null) {
    rows.push({
      key: 'whatsapp',
      icon: MessageCircle,
      content: (
        <Link
          href={whatsappHref(club.whatsapp, fill(t('club.contact.message'), { club: club.name }))}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackClubContact(club.id, 'WHATSAPP');
          }}
        >
          {`WhatsApp ${club.whatsapp}`}
        </Link>
      ),
    });
  }
  if (club.telegram !== null) {
    rows.push({
      key: 'telegram',
      icon: Send,
      content: (
        <Link
          href={telegramHref(club.telegram)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackClubContact(club.id, 'TELEGRAM');
          }}
        >
          @{telegramHandle(club.telegram)}
        </Link>
      ),
    });
  }
  if (club.instagram !== null) {
    rows.push({
      key: 'instagram',
      icon: AtSign,
      content: (
        <Link
          href={instagramHref(club.instagram)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackClubContact(club.id, 'INSTAGRAM');
          }}
        >
          {`${t('club.contact.instagram')} @${instagramHandle(club.instagram)}`}
        </Link>
      ),
    });
  }
  if (club.website !== null) {
    rows.push({
      key: 'website',
      icon: Globe,
      content: (
        <Link
          href={club.website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackClubContact(club.id, 'WEBSITE');
          }}
        >
          {websiteLabel(club.website)}
        </Link>
      ),
    });
  }

  if (rows.length === 0) return null;

  return (
    <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1.25 }}>
      {rows.map((row) => {
        const Icon = row.icon;

        return (
          <Typography
            component="li"
            variant="body2"
            key={row.key}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}
          >
            <Icon size={16} aria-hidden style={{ flexShrink: 0, color: 'var(--ink-500)' }} />
            <Box component="span" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              {row.content}
            </Box>
          </Typography>
        );
      })}
    </Box>
  );
}

/**
 * Готовые сообщения под прайсом: «Записаться на пробную тренировку»,
 * «Забронировать стол». Только при WhatsApp — у звонка и Telegram текста
 * заранее не подставить.
 */
export function QuickRequests({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();

  if (club.whatsapp === null) return null;

  const whatsapp = club.whatsapp;
  const requests: readonly (readonly [MessageKey, MessageKey])[] = [
    ['club.contact.trial', 'club.contact.trialMessage'],
    ['club.contact.rent', 'club.contact.rentMessage'],
  ];

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {requests.map(([label, text]) => (
        <Button
          key={label}
          size="small"
          href={whatsappHref(whatsapp, fill(t(text), { club: club.name }))}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<MessageCircle size={16} aria-hidden />}
          onClick={() => {
            trackClubContact(club.id, 'WHATSAPP');
          }}
          sx={{ minHeight: 44 }}
        >
          {t(label)}
        </Button>
      ))}
    </Box>
  );
}
