import {
  ACHIEVEMENT_ROLES,
  CLUB_IMAGE_MAX_BYTES,
  COACH_CATEGORIES,
  CREDENTIAL_KINDS,
  SPORTS_RANKS,
  coachLimits,
  rejectPhoto,
  type AchievementRole,
  type CoachAchievementInput,
  type CoachCategory,
  type CoachCredentialInput,
  type CoachView,
  type CredentialKind,
  type SportsRank,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, BadgeCheck, Plus, Upload, X } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import EditorSection from '@/features/clubs/page-editor/editor-section';

import { setCoachAchievements, setCoachCredentials, uploadCoachDoc } from '../api';
import { Badge } from '../coach-cards';
import CredentialScan from '../credential-scan';
import {
  ACHIEVEMENT_ROLE_KEYS,
  COACH_CATEGORY_KEYS,
  CREDENTIAL_KIND_KEYS,
  SPORTS_RANK_KEYS,
} from '../labels';
import { coachKeys } from '../queries';
import {
  FIELDS_GRID as GRID,
  QUALIFICATION_FIELDS,
  achievementRowsOf,
  credentialRowsOf,
  emptyAchievementRow,
  emptyCredentialRow,
  moveRow,
  toAchievementInputs,
  toCredentialInputs,
  type AchievementRow,
  type CredentialRow,
} from './form-model';
import { useFieldsEditor } from './use-fields-editor';

/**
 * «Квалификация» — разряд, категории, образование, документы со сканами и
 * заслуги (`docs/11` 4.3, 5.4). Всё необязательно. Три раздела сохраняются
 * каждый сам: поля страницы — `PATCH`, документы и заслуги — списками.
 */
export default function CoachQualificationEditor({
  coach,
}: {
  readonly coach: CoachView;
}): ReactNode {
  return (
    <>
      <QualificationFields coach={coach} />
      <CredentialsEditor coach={coach} />
      <AchievementsEditor coach={coach} />
    </>
  );
}

function QualificationFields({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const editor = useFieldsEditor(coach, QUALIFICATION_FIELDS);
  const { form, set, isInvalid } = editor;

  return (
    <EditorSection
      title={t('coach.qualification.title')}
      lead={t('coach.editor.qualificationLead')}
      onSave={editor.submit}
      isPending={editor.isPending}
      saved={editor.saved}
      error={editor.error}
      invalid={editor.hasInvalid ? 'coach.editor.invalid' : null}
    >
      <Box sx={GRID}>
        <TextField
          select
          label={t('coach.field.sportsRank')}
          value={form.sportsRank}
          onChange={(event) => {
            set('sportsRank', event.target.value as SportsRank | '');
          }}
        >
          <MenuItem value="">{t('player.form.notSet')}</MenuItem>
          {SPORTS_RANKS.map((rank) => (
            <MenuItem key={rank} value={rank}>
              {t(SPORTS_RANK_KEYS[rank])}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={t('coach.field.coachCategory')}
          value={form.coachCategory}
          onChange={(event) => {
            set('coachCategory', event.target.value as CoachCategory | '');
          }}
        >
          <MenuItem value="">{t('player.form.notSet')}</MenuItem>
          {COACH_CATEGORIES.map((category) => (
            <MenuItem key={category} value={category}>
              {t(COACH_CATEGORY_KEYS[category])}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={t('coach.field.refereeCategory')}
          value={form.refereeCategory}
          onChange={(event) => {
            set('refereeCategory', event.target.value);
          }}
          error={isInvalid('refereeCategory')}
          helperText={t('coach.field.refereeCategoryHint')}
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
        <TextField
          label={t('coach.field.education')}
          value={form.education}
          onChange={(event) => {
            set('education', event.target.value);
          }}
          error={isInvalid('education')}
          helperText={t('coach.field.educationHint')}
          slotProps={{ htmlInput: { maxLength: 300 } }}
        />
      </Box>
    </EditorSection>
  );
}

/** Кнопки строки списка: выше, ниже, убрать. */
function RowActions({
  index,
  count,
  onMove,
  onRemove,
}: {
  readonly index: number;
  readonly count: number;
  readonly onMove: (by: -1 | 1) => void;
  readonly onRemove: () => void;
}): ReactNode {
  const t = useT();

  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <IconButton
        aria-label={t('manage.prices.up')}
        disabled={index === 0}
        onClick={() => {
          onMove(-1);
        }}
        sx={{ width: 44, height: 44 }}
      >
        <ArrowUp size={18} aria-hidden />
      </IconButton>
      <IconButton
        aria-label={t('manage.prices.down')}
        disabled={index === count - 1}
        onClick={() => {
          onMove(1);
        }}
        sx={{ width: 44, height: 44 }}
      >
        <ArrowDown size={18} aria-hidden />
      </IconButton>
      <IconButton
        aria-label={t('manage.prices.remove')}
        onClick={onRemove}
        sx={{ width: 44, height: 44 }}
      >
        <X size={18} aria-hidden />
      </IconButton>
    </Box>
  );
}

/**
 * Документы: вид, название, кем выдан, год и скан. «Проверено KTTF» ставит
 * администратор и только читается здесь; правка названия, года или скана
 * снимает отметку сама — проверяли другое.
 */
function CredentialsEditor({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<readonly CredentialRow[]>(() => credentialRowsOf(coach));
  const [invalid, setInvalid] = useState<MessageKey | null>(null);
  const [saved, setSaved] = useState(false);
  const max = coachLimits('FREE').credentials;

  const save = useMutation({
    mutationFn: (credentials: CoachCredentialInput[]) =>
      setCoachCredentials(coach.id, { credentials }),
    // Новые документы получили идентификаторы — без них следующее
    // сохранение завело бы их заново, без отметки «проверено».
    onSuccess: async (view) => {
      setRows(credentialRowsOf(view));
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: coachKeys.all });
    },
  });

  const update = (next: readonly CredentialRow[]): void => {
    setSaved(false);
    setRows(next);
  };
  const patch = (key: string, change: Partial<CredentialRow>): void => {
    update(rows.map((row) => (row.key === key ? { ...row, ...change } : row)));
  };

  return (
    <EditorSection
      title={t('coach.editor.credentials')}
      lead={t('coach.editor.credentialsLead')}
      isPending={save.isPending}
      saved={saved}
      error={save.error}
      invalid={invalid}
      onSave={() => {
        const credentials = toCredentialInputs(rows);

        if (credentials === null) {
          setInvalid('coach.editor.credentialsInvalid');
          return;
        }

        setInvalid(null);
        save.mutate(credentials);
      }}
    >
      {rows.length === 0 && (
        <Typography color="text.secondary">{t('coach.editor.credentialsEmpty')}</Typography>
      )}
      <Box sx={{ display: 'grid', gap: 2 }}>
        {rows.map((row, index) => {
          const stored = coach.credentials.find((credential) => credential.id === row.id);

          return (
            <Box
              key={row.key}
              data-credential-row
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr 1fr', md: '170px minmax(0, 1fr) 100px auto' },
                alignItems: 'start',
                pb: 2.5,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <TextField
                select
                size="small"
                label={t('coach.editor.credentialKind')}
                value={row.kind}
                onChange={(event) => {
                  patch(row.key, { kind: event.target.value as CredentialKind });
                }}
              >
                {CREDENTIAL_KINDS.map((kind) => (
                  <MenuItem key={kind} value={kind}>
                    {t(CREDENTIAL_KIND_KEYS[kind])}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label={t('coach.editor.credentialTitle')}
                value={row.title}
                onChange={(event) => {
                  patch(row.key, { title: event.target.value });
                }}
                slotProps={{ htmlInput: { maxLength: 150 } }}
                sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, gridRow: { xs: 1, md: 'auto' } }}
              />
              <TextField
                size="small"
                label={t('coach.editor.year')}
                value={row.year}
                onChange={(event) => {
                  patch(row.key, { year: event.target.value });
                }}
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }}
              />
              <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
                <RowActions
                  index={index}
                  count={rows.length}
                  onMove={(by) => {
                    update(moveRow(rows, index, by));
                  }}
                  onRemove={() => {
                    update(rows.filter((item) => item.key !== row.key));
                  }}
                />
              </Box>
              <TextField
                size="small"
                label={t('coach.editor.issuer')}
                value={row.issuer}
                onChange={(event) => {
                  patch(row.key, { issuer: event.target.value });
                }}
                slotProps={{ htmlInput: { maxLength: 150 } }}
                sx={{ gridColumn: '1 / -1' }}
              />
              <Box
                sx={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <ScanUpload
                  coachId={coach.id}
                  hasFile={row.file !== null}
                  onUploaded={(url) => {
                    patch(row.key, { file: url });
                  }}
                />
                {row.file !== null &&
                  (stored?.fileUrl != null && stored.file === row.file ? (
                    <CredentialScan url={stored.fileUrl} isPublic={false} version={stored.file} />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {t('coach.editor.scanNew')}
                    </Typography>
                  ))}
                {row.file !== null && (
                  <Button
                    variant="text"
                    onClick={() => {
                      patch(row.key, { file: null, filePublic: false });
                    }}
                    sx={{ minHeight: 44 }}
                  >
                    {t('coach.editor.scanRemove')}
                  </Button>
                )}
                <FormControlLabel
                  disabled={row.file === null}
                  control={
                    <Checkbox
                      checked={row.file !== null && row.filePublic}
                      onChange={(event) => {
                        patch(row.key, { filePublic: event.target.checked });
                      }}
                    />
                  }
                  label={t('coach.editor.scanPublic')}
                  sx={{ minHeight: 44, mr: 0 }}
                />
                {row.verifiedAt !== null && (
                  <Badge tone="ok">
                    <BadgeCheck size={14} aria-hidden />
                    {t('coach.credential.verified')}
                  </Badge>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
      {rows.length < max && (
        <Button
          startIcon={<Plus size={16} aria-hidden />}
          onClick={() => {
            update([...rows, emptyCredentialRow()]);
          }}
          sx={{ mt: 2, minHeight: 44 }}
        >
          {t('coach.editor.addCredential')}
        </Button>
      )}
    </EditorSection>
  );
}

/**
 * Загрузка скана: только фото — первую страницу снимают телефоном. Путь
 * встаёт в строку и уходит на сервер при сохранении списка.
 */
function ScanUpload({
  coachId,
  hasFile,
  onUploaded,
}: {
  readonly coachId: string;
  readonly hasFile: boolean;
  readonly onUploaded: (url: string) => void;
}): ReactNode {
  const t = useT();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState<MessageKey | null>(null);
  const upload = useMutation({
    mutationFn: (file: File) => uploadCoachDoc(coachId, file),
    onSuccess: (uploaded) => {
      onUploaded(uploaded.url);
    },
  });

  return (
    <>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';

          if (file === undefined) return;

          const rejection = rejectPhoto(file, CLUB_IMAGE_MAX_BYTES);

          if (rejection !== null) {
            setRejected(rejection === 'SIZE' ? 'manage.page.imageTooBig' : 'manage.page.imageType');
            return;
          }

          setRejected(null);
          upload.mutate(file);
        }}
      />
      <Button
        variant="outlined"
        startIcon={<Upload size={16} aria-hidden />}
        disabled={upload.isPending}
        onClick={() => input.current?.click()}
        sx={{ minHeight: 44 }}
      >
        {upload.isPending
          ? t('manage.page.uploading')
          : t(hasFile ? 'coach.editor.scanReplace' : 'coach.editor.scanUpload')}
      </Button>
      {rejected !== null && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {t(rejected)}
        </Alert>
      )}
      {upload.error !== null && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {t(errorMessageKey(upload.error))}
        </Alert>
      )}
    </>
  );
}

/** Заслуги — «год — достижение», игроком и тренером. */
function AchievementsEditor({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<readonly AchievementRow[]>(() => achievementRowsOf(coach));
  const [invalid, setInvalid] = useState<MessageKey | null>(null);
  const [saved, setSaved] = useState(false);
  const max = coachLimits('FREE').achievements;

  const save = useMutation({
    mutationFn: (achievements: CoachAchievementInput[]) =>
      setCoachAchievements(coach.id, { achievements }),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: coachKeys.all });
    },
  });

  const update = (next: readonly AchievementRow[]): void => {
    setSaved(false);
    setRows(next);
  };
  const patch = (key: string, change: Partial<AchievementRow>): void => {
    update(rows.map((row) => (row.key === key ? { ...row, ...change } : row)));
  };

  return (
    <EditorSection
      title={t('coach.achievements.title')}
      lead={t('coach.editor.achievementsLead')}
      isPending={save.isPending}
      saved={saved}
      error={save.error}
      invalid={invalid}
      onSave={() => {
        const achievements = toAchievementInputs(rows);

        if (achievements === null) {
          setInvalid('coach.editor.achievementsInvalid');
          return;
        }

        setInvalid(null);
        save.mutate(achievements);
      }}
    >
      {rows.length === 0 && (
        <Typography color="text.secondary">{t('coach.editor.achievementsEmpty')}</Typography>
      )}
      <Box sx={{ display: 'grid', gap: 2 }}>
        {rows.map((row, index) => (
          <Box
            key={row.key}
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr 100px', md: '170px 100px minmax(0, 1fr) auto' },
              alignItems: 'start',
              pb: 2,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <TextField
              select
              size="small"
              label={t('coach.editor.role')}
              value={row.role}
              onChange={(event) => {
                patch(row.key, { role: event.target.value as AchievementRole });
              }}
            >
              {ACHIEVEMENT_ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  {t(ACHIEVEMENT_ROLE_KEYS[role])}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label={t('coach.editor.year')}
              value={row.year}
              onChange={(event) => {
                patch(row.key, { year: event.target.value });
              }}
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }}
            />
            <TextField
              size="small"
              label={t('coach.editor.achievement')}
              placeholder={t('coach.editor.achievementHint')}
              value={row.title}
              onChange={(event) => {
                patch(row.key, { title: event.target.value });
              }}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}
            />
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
              <RowActions
                index={index}
                count={rows.length}
                onMove={(by) => {
                  update(moveRow(rows, index, by));
                }}
                onRemove={() => {
                  update(rows.filter((item) => item.key !== row.key));
                }}
              />
            </Box>
          </Box>
        ))}
      </Box>
      {rows.length < max && (
        <Button
          startIcon={<Plus size={16} aria-hidden />}
          onClick={() => {
            update([...rows, emptyAchievementRow()]);
          }}
          sx={{ mt: 2, minHeight: 44 }}
        >
          {t('coach.editor.addAchievement')}
        </Button>
      )}
    </EditorSection>
  );
}
