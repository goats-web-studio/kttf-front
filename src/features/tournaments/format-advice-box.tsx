import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill } from '@/common/i18n';

import {
  adviceApplied,
  adviseGroups,
  applyAdvice,
  MAX_FOR_ROUND_ROBIN,
  MIN_FOR_GROUPS,
} from './format-advice';
import { toFormatConfig, type FormatDraft } from './format-draft';
import { previewFormat } from './format-preview';
import type { FormCheckText } from './tournament-form-texts';

/**
 * Совет по группам под ожидаемый состав — `format-advice.ts`.
 *
 * У схем с группами — «Подобрать»: число групп ставится так, чтобы
 * вышедших было ровно на сетку. У круговой на большой состав и у групп на
 * маленький — «Переключить» на подходящую схему. Совет только предлагает:
 * поля остаются в руках организатора.
 */
export function FormatAdvice({
  draft,
  participants,
  texts,
  onChange,
}: {
  readonly draft: FormatDraft;
  readonly participants: number;
  readonly texts: FormCheckText;
  readonly onChange: (draft: FormatDraft) => void;
}): ReactNode {
  const n = String(participants);
  const hasGroups = draft.type === 'GROUPS_KNOCKOUT' || draft.type === 'GROUPS_FINAL_GROUPS';

  if (draft.type === 'ROUND_ROBIN' && participants > MAX_FOR_ROUND_ROBIN) {
    const matches = previewFormat(toFormatConfig(draft), participants).totalMatches;
    const advice = adviseGroups('GROUPS_KNOCKOUT', participants);
    return (
      <AdviceBox
        text={fill(texts.adviceRoundRobin, { n, matches: String(matches) })}
        action={texts.adviceSwitch}
        onAction={() => {
          const next = { ...draft, type: 'GROUPS_KNOCKOUT' as const };
          onChange(advice === null ? next : applyAdvice(next, advice));
        }}
      />
    );
  }

  if (hasGroups && participants < MIN_FOR_GROUPS) {
    return (
      <AdviceBox
        text={fill(texts.adviceSmall, { n })}
        action={texts.adviceSwitch}
        onAction={() => {
          onChange({ ...draft, type: 'ROUND_ROBIN' });
        }}
      />
    );
  }

  const advice = adviseGroups(draft.type, participants);
  if (advice === null) return null;

  if (adviceApplied(draft, advice)) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ pt: { sm: 2 } }}>
        {fill(texts.adviceApplied, { n })}
      </Typography>
    );
  }

  const sizes = previewFormat(toFormatConfig(applyAdvice(draft, advice)), participants).groups;
  const min = Math.min(...sizes);
  const max = Math.max(...sizes);

  return (
    <AdviceBox
      text={fill(texts.adviceGroups, {
        n,
        groups: String(advice.groupCount),
        sizes: min === max ? String(min) : `${String(min)}–${String(max)}`,
        advance: String(advice.advancePerGroup),
      })}
      action={texts.adviceApply}
      onAction={() => {
        onChange(applyAdvice(draft, advice));
      }}
    />
  );
}

function AdviceBox({
  text,
  action,
  onAction,
}: {
  readonly text: string;
  readonly action: string;
  readonly onAction: () => void;
}): ReactNode {
  return (
    <Box
      data-format-advice
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: 3,
        bgcolor: 'var(--gold-50)',
        border: '1px solid var(--line)',
      }}
    >
      <Sparkles size={18} aria-hidden style={{ flexShrink: 0 }} />
      <Typography variant="body2" sx={{ flex: 1, minWidth: 200 }}>
        {text}
      </Typography>
      <Button variant="outlined" size="small" onClick={onAction} sx={{ minHeight: 40 }}>
        {action}
      </Button>
    </Box>
  );
}
