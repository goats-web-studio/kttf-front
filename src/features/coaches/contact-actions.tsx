import type { CoachView, ContactKind } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { AtSign, MessageCircle, Phone, Send, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import {
  instagramHandle,
  instagramHref,
  phoneHref,
  telegramHandle,
  telegramHref,
  whatsappHref,
} from '@/features/clubs/contacts';

import {
  COACH_REQUESTS,
  COACH_REQUEST_LABELS,
  coachMessage,
  primaryCoachContact,
} from './contacts';
import { trackCoachContact } from './track';

type Contacts = Pick<
  CoachView,
  'id' | 'player' | 'phone' | 'whatsapp' | 'telegram' | 'instagram' | 'primaryContact'
>;

interface Action {
  readonly kind: ContactKind;
  readonly href: string;
  readonly label: MessageKey;
  readonly icon: LucideIcon;
  readonly external: boolean;
}

/**
 * Кнопки связи под шапкой тренера — как у клуба (ADR-055, решение 3):
 * главная залита и она одна на экране (07, запрет 2), WhatsApp — с готовым
 * текстом. На телефоне три кнопки в ряд (`docs/11` 5.3). Каждое нажатие
 * считается в статистику тренера.
 */
export default function CoachContactActions({ coach }: { readonly coach: Contacts }): ReactNode {
  const t = useT();
  const primary = primaryCoachContact(coach);
  const actions: Action[] = [];

  if (coach.whatsapp !== null) {
    actions.push({
      kind: 'WHATSAPP',
      href: whatsappHref(coach.whatsapp, coachMessage(coach.player.firstName, t)),
      label: 'club.contact.whatsapp',
      icon: MessageCircle,
      external: true,
    });
  }
  if (coach.phone !== null) {
    actions.push({
      kind: 'PHONE',
      href: phoneHref(coach.phone),
      label: 'club.contact.call',
      icon: Phone,
      external: false,
    });
  }
  if (coach.telegram !== null) {
    actions.push({
      kind: 'TELEGRAM',
      href: telegramHref(coach.telegram),
      label: 'club.contact.telegram',
      icon: Send,
      external: true,
    });
  }

  if (actions.length === 0) return null;

  // Главная — первой: на телефоне она под большим пальцем.
  actions.sort((a, b) => Number(b.kind === primary) - Number(a.kind === primary));

  return (
    <Box
      data-coach-contacts
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: {
          xs: `repeat(${String(actions.length)}, minmax(0, 1fr))`,
          sm: 'repeat(auto-fit, minmax(160px, max-content))',
        },
      }}
    >
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <Button
            key={action.kind}
            variant={action.kind === primary ? 'contained' : 'outlined'}
            href={action.href}
            startIcon={<Icon size={18} aria-hidden />}
            {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            onClick={() => {
              trackCoachContact(coach.id, action.kind);
            }}
            sx={{
              // Три кнопки в ряд на 360px (`docs/11` 5.3): иконка над
              // словом, иначе «Позвонить» не помещается в треть ширины.
              minHeight: { xs: 56, sm: 48 },
              px: { xs: 0.5, sm: 2.75 },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 0.25, sm: 0 },
              fontSize: { xs: 13, sm: 15 },
              '& .MuiButton-startIcon': { mx: { xs: 0 }, mr: { sm: 1 }, ml: { sm: -0.5 } },
            }}
          >
            {t(action.label)}
          </Button>
        );
      })}
    </Box>
  );
}

/** Контакты списком — в боковой колонке: сам номер, имя в Telegram и Инстаграм. */
export function CoachContactList({ coach }: { readonly coach: Contacts }): ReactNode {
  const t = useT();
  const rows: { key: string; icon: LucideIcon; content: ReactNode }[] = [];

  if (coach.phone !== null) {
    rows.push({
      key: 'phone',
      icon: Phone,
      content: (
        <Link
          href={phoneHref(coach.phone)}
          onClick={() => {
            trackCoachContact(coach.id, 'PHONE');
          }}
        >
          {coach.phone}
        </Link>
      ),
    });
  }
  if (coach.whatsapp !== null) {
    rows.push({
      key: 'whatsapp',
      icon: MessageCircle,
      content: (
        <Link
          href={whatsappHref(coach.whatsapp, coachMessage(coach.player.firstName, t))}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackCoachContact(coach.id, 'WHATSAPP');
          }}
        >
          {`WhatsApp ${coach.whatsapp}`}
        </Link>
      ),
    });
  }
  if (coach.telegram !== null) {
    rows.push({
      key: 'telegram',
      icon: Send,
      content: (
        <Link
          href={telegramHref(coach.telegram)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackCoachContact(coach.id, 'TELEGRAM');
          }}
        >
          @{telegramHandle(coach.telegram)}
        </Link>
      ),
    });
  }
  if (coach.instagram !== null) {
    rows.push({
      key: 'instagram',
      icon: AtSign,
      content: (
        <Link
          href={instagramHref(coach.instagram)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackCoachContact(coach.id, 'INSTAGRAM');
          }}
        >
          {`${t('club.contact.instagram')} @${instagramHandle(coach.instagram)}`}
        </Link>
      ),
    });
  }

  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('coach.contacts.none')}
      </Typography>
    );
  }

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
 * Готовые сообщения под тренировками: пробная, для ребёнка, в группу,
 * вопрос (`docs/11` 3.1). Только при WhatsApp — у звонка и Telegram текста
 * заранее не подставить.
 */
export function CoachQuickRequests({ coach }: { readonly coach: Contacts }): ReactNode {
  const t = useT();

  if (coach.whatsapp === null) return null;

  const whatsapp = coach.whatsapp;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {COACH_REQUESTS.map((request) => (
        <Button
          key={request}
          size="small"
          href={whatsappHref(whatsapp, coachMessage(coach.player.firstName, t, request))}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<MessageCircle size={16} aria-hidden />}
          onClick={() => {
            trackCoachContact(coach.id, 'WHATSAPP');
          }}
          sx={{ minHeight: 44 }}
        >
          {t(COACH_REQUEST_LABELS[request])}
        </Button>
      ))}
    </Box>
  );
}
