import type { RegistrationView, TournamentView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, MoreHorizontal } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, formatMoney, useLocale, useT } from '@/common/i18n';
import RatingValue from '@/common/ui/rating-value';
import { useSessionStore } from '@/features/auth/session-store';
import { isClubStaff } from '@/features/clubs/roles';
import { playerName } from '@/features/players/player-name';

import AddParticipant from './add-participant';
import { removeRegistration, updateRegistration } from './api';
import CoachDialog from './coach-dialog';
import CoachNote from './coach-note';
import { REGISTRATION_STATUS_KEYS } from './labels';
import ReplaceParticipant from './replace-participant';
import { paymentSummary } from './payment-summary';
import { tournamentKeys } from './queries';
import { isCoachEditable } from './registration-coach';

/** Числа — одной ширины цифр, чтобы разряды стояли столбиком (раздел 6.1). */
const NUM = { fontVariantNumeric: 'tabular-nums' } as const;

/** Действие в строке: на телефоне — зона нажатия 44px (раздел 9). */
const ROW_ACTION = { minHeight: { xs: 44, sm: 32 } } as const;

interface ParticipantsPanelProps {
  readonly tournament: TournamentView;
  readonly registrations: readonly RegistrationView[];
}

/**
 * Состав участников — ТЗ 4.3 и 4.4.
 *
 * Список открыт всем: кто заявился на турнир — такой же спортивный факт, как
 * и результаты. Органы управления показываются владельцу и организатору
 * клуба-хозяина (ADR-014); право всё равно проверяет сервер.
 *
 * Порядок задаёт сервер — посев, затем время записи. Пересортировывать на
 * клиенте нечего: посев и есть тот порядок, в котором участники войдут в
 * жеребьёвку.
 */
export default function ParticipantsPanel({
  tournament,
  registrations,
}: ParticipantsPanelProps): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);
  const isStaff = isClubStaff(user, tournament.clubId);

  // Заявки вне рейтинга участниками ещё не стали (ADR-044): в составе их
  // нет, организатор видит их отдельным списком, отклонённые не видны никому.
  const applications = registrations.filter((registration) => registration.status === 'PENDING');
  const participants = registrations.filter(
    (registration) => registration.status !== 'PENDING' && registration.status !== 'REJECTED',
  );

  const locale = useLocale();
  // Оплата видна только организатору: сервер отдаёт `paid` ему одному.
  const payment = isStaff ? paymentSummary(participants, tournament.entryFee) : null;

  if (participants.length === 0 && !isStaff) {
    return null;
  }

  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Typography variant="h2">
        {t('participants.title')}{' '}
        <Typography
          component="span"
          variant="h2"
          color="text.secondary"
          sx={{ fontWeight: 400, ...NUM }}
        >
          {participants.length}
        </Typography>
      </Typography>

      {payment !== null && participants.length > 0 && (
        <Typography color="text.secondary" sx={{ mt: 0.5, ...NUM }}>
          {fill(t('participants.paid.summary'), {
            paid: String(payment.paid),
            total: String(payment.total),
          })}
          {tournament.entryFee > 0 &&
            ` · ${fill(t('participants.paid.collected'), {
              amount: formatMoney(payment.collected, locale),
            })}`}
        </Typography>
      )}

      {isStaff && applications.length > 0 && (
        <Applications tournament={tournament} applications={applications} />
      )}

      {isStaff && <AddParticipant tournament={tournament} registrations={registrations} />}

      {participants.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {t('participants.empty')}
        </Typography>
      ) : (
        // Органы управления шире телефона: таблица прокручивается вбок
        // целиком, а не сминает имена.
        // На карточке, как остальные блоки страницы: на фоне сайта строки
        // таблицы терялись среди рисунка.
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ mt: 2, borderRadius: 4, bgcolor: 'background.paper' }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="right" sx={{ width: isStaff ? 96 : 48 }}>
                  {t('participants.seed')}
                </TableCell>
                <TableCell>{t('participants.player')}</TableCell>
                <TableCell align="right">{t('participants.rating')}</TableCell>
                <TableCell>{t('participants.status')}</TableCell>
                {payment !== null && <TableCell>{t('participants.paid')}</TableCell>}
                {isStaff && <TableCell>{t('participants.actions')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {participants.map((registration) => (
                <Row
                  key={registration.id}
                  tournament={tournament}
                  registration={registration}
                  isStaff={isStaff}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

function Row({
  tournament,
  registration,
  isStaff,
}: {
  readonly tournament: TournamentView;
  readonly registration: RegistrationView;
  readonly isStaff: boolean;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
  };

  const update = useMutation({
    mutationFn: (input: Parameters<typeof updateRegistration>[2]) =>
      updateRegistration(tournament.id, registration.id, input),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: () => removeRegistration(tournament.id, registration.id),
    onSuccess: refresh,
  });

  const [editingCoach, setEditingCoach] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const closeMenu = (): void => {
    setMenu(null);
  };
  // Заменить можно, пока расстановка есть, а турнир не закончен (ADR-062);
  // сыгравшего сервер заменить не даст.
  const replaceable =
    (tournament.status === 'REG_CLOSED' || tournament.status === 'RUNNING') &&
    registration.status !== 'WAITLIST';

  const isWithdrawn = registration.status === 'WITHDRAWN' || registration.status === 'NO_SHOW';
  const error = update.error ?? remove.error;

  return (
    <TableRow sx={{ verticalAlign: 'middle' }}>
      <TableCell align="right" sx={{ color: 'text.secondary', ...NUM }}>
        {/* Посев правится в своей колонке: в «Действиях» поле не помещалось
            и переносилось на новую строку. */}
        {isStaff ? (
          <TextField
            size="small"
            aria-label={t('participants.seed')}
            placeholder="—"
            type="number"
            defaultValue={registration.seed ?? ''}
            onBlur={(event) => {
              const raw = event.target.value.trim();
              const seed = raw === '' ? null : Number(raw);

              if (seed === registration.seed || (seed !== null && !Number.isInteger(seed))) {
                return;
              }

              update.mutate({ seed });
            }}
            slotProps={{
              htmlInput: { inputMode: 'numeric', min: 1, sx: { ...NUM, textAlign: 'right' } },
            }}
            sx={{ width: 72 }}
          />
        ) : (
          (registration.seed ?? '—')
        )}
      </TableCell>
      <TableCell>
        <Link
          href={`/players/${registration.player.id}`}
          color="text.primary"
          sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}
        >
          {playerName(registration.player)}
        </Link>
        {!registration.isRated && (
          // Вне зачёта: играет, но результаты не рейтинговые — ТЗ 4.4.
          // Меткой-состоянием, а не серой припиской: организатор должен
          // видеть её в длинном составе с первого взгляда.
          <Box
            component="span"
            data-unrated
            sx={{
              ml: 1,
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              typography: 'caption',
              fontWeight: 600,
              color: 'var(--warn-text)',
              bgcolor: 'var(--warn-50)',
              whiteSpace: 'nowrap',
            }}
          >
            {t('participants.unrated')}
          </Box>
        )}
        <CoachNote coach={registration.coach} />
        {error !== null && (
          <Typography role="alert" variant="body2" color="error" sx={{ mt: 0.5 }}>
            {t(errorMessageKey(error))}
          </Typography>
        )}
      </TableCell>
      <TableCell align="right" sx={NUM}>
        {/* Рейтинг на старте, если турнир начат: он и пошёл в расчёт (ТС 5.4). */}
        <RatingValue value={registration.ratingAtStart ?? registration.player.rating} />
      </TableCell>
      <TableCell sx={{ color: 'text.secondary' }}>
        {t(REGISTRATION_STATUS_KEYS[registration.status])}
      </TableCell>
      {isStaff && registration.paid !== null && (
        <TableCell>
          {/* Учёт наличных в зале, не платёж (ADR-062): одно касание
              ставит и снимает, сервер пишет каждое в журнал. */}
          {/* Состояние и действие читаются сразу: зелёное «Оплачено» с
              галочкой — оплата отмечена; «Отметить оплату» — ещё нет, и
              кнопка говорит, что сделает. Повторное касание снимает отметку. */}
          <Button
            variant={registration.paid ? 'contained' : 'outlined'}
            color={registration.paid ? 'success' : 'secondary'}
            size="small"
            disabled={update.isPending}
            aria-pressed={registration.paid}
            data-paid={registration.paid}
            // Подсказка — родным title: всплывашка MUI не влезла бы в бюджет
            // консоли, где эта же панель открывается «Составом».
            title={registration.paid ? t('participants.paid.undo') : undefined}
            {...(registration.paid ? { startIcon: <Check size={16} aria-hidden /> } : {})}
            onClick={() => {
              update.mutate({ paid: !registration.paid });
            }}
            sx={{ ...ROW_ACTION, whiteSpace: 'nowrap' }}
          >
            {registration.paid ? t('participants.paid.yes') : t('participants.paid.no')}
          </Button>
        </TableCell>
      )}
      {isStaff && (
        <TableCell>
          {/* В строке — одно частое действие фиксированной ширины, остальные
              в меню «⋯»: пять кнопок в ряд не помещались в карточку и
              обрезались, а разная их ширина разводила столбцы. */}
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
            <Button
              variant="text"
              size="small"
              disabled={update.isPending}
              onClick={() => {
                update.mutate({ isRated: !registration.isRated });
              }}
              sx={{ ...ROW_ACTION, minWidth: 176, justifyContent: 'flex-start' }}
            >
              {registration.isRated ? t('participants.markUnrated') : t('participants.markRated')}
            </Button>

            <IconButton
              size="small"
              aria-label={t('participants.actions')}
              aria-haspopup="menu"
              aria-expanded={menu !== null}
              onClick={(event) => {
                setMenu(event.currentTarget);
              }}
              sx={{ width: 40, height: 40 }}
            >
              <MoreHorizontal size={18} aria-hidden />
            </IconButton>
            <Menu
              anchorEl={menu}
              open={menu !== null}
              onClose={closeMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem
                disabled={update.isPending}
                onClick={() => {
                  closeMenu();
                  update.mutate({ status: isWithdrawn ? 'CONFIRMED' : 'WITHDRAWN' });
                }}
                sx={{ minHeight: 44 }}
              >
                {isWithdrawn ? t('participants.restore') : t('participants.withdraw')}
              </MenuItem>
              {replaceable && !replacing && (
                <MenuItem
                  onClick={() => {
                    closeMenu();
                    setReplacing(true);
                  }}
                  sx={{ minHeight: 44 }}
                >
                  {t('participants.replace')}
                </MenuItem>
              )}
              {/* Тренер на турнире — до старта (ADR-059, T3): после него по
                  записи уже считаются медали учеников. */}
              {isCoachEditable(tournament.status) && (
                <MenuItem
                  onClick={() => {
                    closeMenu();
                    setEditingCoach(true);
                  }}
                  sx={{ minHeight: 44 }}
                >
                  {t('participants.editCoach')}
                </MenuItem>
              )}
              {/* Удалить запись можно только до старта: после него участник
                  снимается, а не исчезает — его встречи уже в таблице (ADR-009). */}
              {tournament.startedAt === null && (
                <MenuItem
                  disabled={remove.isPending}
                  onClick={() => {
                    closeMenu();
                    remove.mutate();
                  }}
                  sx={{ minHeight: 44, color: 'error.main' }}
                >
                  {t('participants.remove')}
                </MenuItem>
              )}
            </Menu>
          </Stack>
          {replacing && (
            <ReplaceParticipant
              tournament={tournament}
              registration={registration}
              onClose={() => {
                setReplacing(false);
              }}
            />
          )}
          <CoachDialog
            registration={registration}
            open={editingCoach}
            onClose={() => {
              setEditingCoach(false);
            }}
          />
        </TableCell>
      )}
    </TableRow>
  );
}

/**
 * Заявки вне рейтинговой планки — ADR-044.
 *
 * Стоят над составом: это решения, которых ждут люди, и до старта их нужно
 * принять. Не рассмотренные к старту в турнир не попадают.
 */
function Applications({
  tournament,
  applications,
}: {
  readonly tournament: TournamentView;
  readonly applications: readonly RegistrationView[];
}): ReactNode {
  const t = useT();

  return (
    <Box
      sx={{
        mt: 2,
        p: { xs: 2, sm: 2.5 },
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'var(--paper-sunken)',
      }}
    >
      <Typography variant="h3">
        {t('participants.applications')}{' '}
        <Typography component="span" variant="h3" color="text.secondary" sx={NUM}>
          {applications.length}
        </Typography>
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t('participants.applications.hint')}
      </Typography>
      <Stack component="ul" spacing={1} sx={{ m: 0, mt: 1.5, p: 0, listStyle: 'none' }}>
        {applications.map((application) => (
          <Application key={application.id} tournament={tournament} application={application} />
        ))}
      </Stack>
    </Box>
  );
}

function Application({
  tournament,
  application,
}: {
  readonly tournament: TournamentView;
  readonly application: RegistrationView;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();

  const decide = useMutation({
    mutationFn: (status: 'CONFIRMED' | 'REJECTED') =>
      updateRegistration(tournament.id, application.id, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });

  return (
    <Stack
      component="li"
      direction="row"
      useFlexGap
      spacing={1.5}
      sx={{ alignItems: 'center', flexWrap: 'wrap' }}
    >
      <Box sx={{ flex: 1, minWidth: 180 }}>
        <Link
          href={`/players/${application.player.id}`}
          color="text.primary"
          sx={{ fontWeight: 500 }}
        >
          {playerName(application.player)}
        </Link>
        <Typography component="span" color="text.secondary" sx={{ ml: 1, ...NUM }}>
          <RatingValue value={application.player.rating} />
        </Typography>
        {decide.error !== null && (
          <Typography role="alert" variant="body2" color="error" sx={{ mt: 0.5 }}>
            {t(errorMessageKey(decide.error))}
          </Typography>
        )}
      </Box>
      <Button
        size="small"
        disabled={decide.isPending}
        onClick={() => {
          decide.mutate('CONFIRMED');
        }}
        sx={ROW_ACTION}
      >
        {t('participants.accept')}
      </Button>
      <Button
        variant="text"
        color="error"
        size="small"
        disabled={decide.isPending}
        onClick={() => {
          decide.mutate('REJECTED');
        }}
        sx={ROW_ACTION}
      >
        {t('participants.reject')}
      </Button>
    </Stack>
  );
}
