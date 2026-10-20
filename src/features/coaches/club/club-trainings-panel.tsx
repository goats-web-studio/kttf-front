import {
  CLUB_TRAININGS_MAX,
  type ClubTrainingInput,
  type ClubTrainingsManageView,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import EditorSection from '@/features/clubs/page-editor/editor-section';

import { setClubTrainings } from '../api';
import { moveRow } from '../editor/form-model';
import { CoachPicker } from '../editor/pickers';
import TrainingFields from '../editor/training-fields';
import { LINK_KEYS_FOR_CLUB } from '../labels';
import { LinkStatus, LinkedTrainings } from '../link-requests';
import { clubTrainingsManageQuery, coachKeys } from '../queries';
import {
  clubTrainingRowsOf,
  emptyClubTrainingRow,
  toClubTrainingInputs,
  type ClubTrainingRow,
} from '../training-rows';

/**
 * «Тренировки» в кабинете клуба (ADR-059, решение владельца от 20.10.2026):
 * свои тренировки клуба с тренером со страницей или без него, запросы
 * тренеров, которые указали клуб местом, и тренеры, которые здесь уже
 * тренируют. Подтверждает вторая сторона, разорвать может любая.
 */
export default function ClubTrainingsPanel({ clubId }: { readonly clubId: string }): ReactNode {
  const t = useT();
  const manage = useQuery(clubTrainingsManageQuery(clubId));

  return (
    <QueryState
      isPending={manage.isPending}
      error={manage.error}
      onRetry={() => void manage.refetch()}
      loading={<RowsSkeleton rows={3} />}
    >
      {manage.data !== undefined && (
        <>
          <LinkedTrainings
            title={t('training.requests.clubTitle')}
            lead={t('training.requests.clubLead')}
            trainings={manage.data.requests}
            confirm
            declineLabel={t('training.link.decline')}
            showCoach
          />
          <ClubTrainingsEditor clubId={clubId} manage={manage.data} />
          <LinkedTrainings
            title={t('training.coachOwned.title')}
            lead={t('training.coachOwned.lead')}
            trainings={manage.data.coachTrainings}
            confirm={false}
            declineLabel={t('training.link.remove')}
            showCoach
          />
        </>
      )}
    </QueryState>
  );
}

function ClubTrainingsEditor({
  clubId,
  manage,
}: {
  readonly clubId: string;
  readonly manage: ClubTrainingsManageView;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<readonly ClubTrainingRow[]>(() =>
    clubTrainingRowsOf(manage.trainings),
  );
  const [invalid, setInvalid] = useState<MessageKey | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (trainings: ClubTrainingInput[]) => setClubTrainings(clubId, { trainings }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: coachKeys.all });
      // Идентификаторы новых строк и статусы связи — из свежего ответа:
      // без `id` следующее сохранение завело бы тренировки заново.
      const fresh = queryClient.getQueryData<ClubTrainingsManageView>(
        coachKeys.clubTrainingsManage(clubId),
      );
      if (fresh !== undefined) setRows(clubTrainingRowsOf(fresh.trainings));
      setSaved(true);
    },
  });

  const update = (next: readonly ClubTrainingRow[]): void => {
    setSaved(false);
    setRows(next);
  };
  const patch = (key: string, change: Partial<ClubTrainingRow>): void => {
    update(rows.map((row) => (row.key === key ? { ...row, ...change } : row)));
  };

  return (
    <EditorSection
      title={t('training.club.title')}
      lead={t('training.club.lead')}
      isPending={save.isPending}
      saved={saved}
      error={save.error}
      invalid={invalid}
      onSave={() => {
        const trainings = toClubTrainingInputs(rows);

        if (trainings === null) {
          setInvalid('coach.editor.servicesInvalid');
          return;
        }

        setInvalid(null);
        save.mutate(trainings);
      }}
    >
      {rows.length === 0 && (
        <Typography color="text.secondary">{t('training.club.empty')}</Typography>
      )}
      <Box sx={{ display: 'grid', gap: 2 }}>
        {rows.map((row, index) => (
          <TrainingFields
            key={row.key}
            row={row}
            onPatch={(change) => {
              patch(row.key, change);
            }}
            index={index}
            count={rows.length}
            onMove={(by) => {
              update(moveRow(rows, index, by));
            }}
            onRemove={() => {
              update(rows.filter((item) => item.key !== row.key));
            }}
            status={<LinkStatus link={row.link} keys={LINK_KEYS_FOR_CLUB} />}
          >
            <Box sx={{ maxWidth: { md: 480 } }}>
              <CoachPicker
                value={row.coach}
                onChange={(coach) => {
                  // Другой тренер — новая связь: подтверждение заново.
                  patch(row.key, { coach, link: 'NONE' });
                }}
              />
            </Box>
          </TrainingFields>
        ))}
      </Box>
      {rows.length < CLUB_TRAININGS_MAX && (
        <Button
          startIcon={<Plus size={16} aria-hidden />}
          onClick={() => {
            update([...rows, emptyClubTrainingRow()]);
          }}
          sx={{ mt: 2, minHeight: 44 }}
        >
          {t('coach.editor.addService')}
        </Button>
      )}
    </EditorSection>
  );
}
