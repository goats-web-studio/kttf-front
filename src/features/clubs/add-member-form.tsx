import { ERROR_CODES, isAppError } from '@kttf/shared/errors';
import type { AddMemberInput, ClubRole } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, useT, type MessageKey } from '@/common/i18n';

import { addClubMember } from './api';
import { toIdentifier } from './identifier';
import { CLUB_ROLE_KEYS } from './labels';
import { clubKeys } from './queries';

/**
 * Роли, которые владелец назначает из интерфейса.
 *
 * Судьи нет: владелец продукта отложил эту роль, турнир ведёт организатор
 * (ADR-043). Контракт её принимает — вернуть пункт можно одной строкой.
 */
const ASSIGNABLE: readonly ClubRole[] = ['ORGANIZER', 'OWNER'];

/**
 * Добавление в состав — ТЗ 1, ADR-043.
 *
 * Человек указывается тем, чем входит: логином или телефоном. Аккаунт у него
 * уже должен быть — пригласить по номеру, которого на платформе нет, нельзя,
 * и отказ это прямо говорит.
 */
export default function AddMemberForm({ clubId }: { readonly clubId: string }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<ClubRole>('ORGANIZER');
  const [added, setAdded] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: (input: AddMemberInput) => addClubMember(clubId, input),
    onSuccess: async (member) => {
      setIdentifier('');
      setAdded(member.name ?? t('club.staff.noProfile'));
      await queryClient.invalidateQueries({ queryKey: clubKeys.members(clubId) });
    },
  });

  const value = identifier.trim();

  return (
    <Box
      component="form"
      noValidate
      sx={{ mt: 3 }}
      onSubmit={(event) => {
        event.preventDefault();
        if (value === '') return;
        setAdded(null);
        add.mutate({ identifier: toIdentifier(value), role });
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr auto' },
          alignItems: 'start',
        }}
      >
        <TextField
          label={t('club.staff.add.identifier')}
          helperText={t('club.staff.add.hint')}
          value={identifier}
          autoComplete="off"
          onChange={(event) => {
            setIdentifier(event.target.value);
          }}
        />
        <TextField
          select
          label={t('club.staff.add.role')}
          value={role}
          onChange={(event) => {
            const next = ASSIGNABLE.find((item) => item === event.target.value);
            if (next !== undefined) setRole(next);
          }}
        >
          {ASSIGNABLE.map((item) => (
            <MenuItem key={item} value={item}>
              {t(CLUB_ROLE_KEYS[item])}
            </MenuItem>
          ))}
        </TextField>
        <Button type="submit" disabled={add.isPending || value === ''} sx={{ minHeight: 40 }}>
          {add.isPending ? t('common.loading') : t('club.staff.add.submit')}
        </Button>
      </Box>

      {add.error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(addErrorKey(add.error))}
        </Alert>
      )}
      {added !== null && add.error === null && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {fill(t('club.staff.add.done'), { name: added })}
        </Alert>
      )}
    </Box>
  );
}

/**
 * Отказ — словами про состав, а не общим текстом.
 *
 * «Не найдено» здесь значит «такого логина или телефона нет на платформе»:
 * сам клуб открыт на этой же странице. Запрет у владельца — единственный
 * случай: попытка понизить последнего владельца (форма видна только ему).
 */
function addErrorKey(error: unknown): MessageKey {
  if (isAppError(error) && error.code === ERROR_CODES.NOT_FOUND) {
    return 'club.staff.add.notFound';
  }
  if (isAppError(error) && error.code === ERROR_CODES.FORBIDDEN) {
    return 'club.staff.add.lastOwner';
  }

  return errorMessageKey(error);
}
