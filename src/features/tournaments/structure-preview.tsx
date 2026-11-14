import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ArrowDown, ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill } from '@/common/i18n';

import type { FormatDraft } from './format-draft';
import type { FormatPreview } from './format-preview';
import type { FormCheckText } from './tournament-form-texts';

interface StructurePreviewProps {
  readonly draft: FormatDraft;
  readonly preview: FormatPreview;
  readonly participants: number;
  readonly texts: FormCheckText;
  /** Полный вид — в окне: все группы и все круги сетки. */
  readonly full?: boolean;
}

/** Сколько групп видно в компактном виде — остальные «+N». */
const COMPACT_GROUPS = 8;
/** Сколько точек-игроков рисуется в одной карточке. */
const MAX_DOTS = 24;

/**
 * Турнир картинкой — как он будет выглядеть при ожидаемом составе.
 *
 * Не та же иллюстрация, что у карточки схемы, а расчёт: группы ровно тех
 * размеров, что даст жеребьёвка (`previewFormat` — тот же движок), в каждой
 * закрашены выходящие дальше, справа — сетка по кругам или финальные группы
 * за места. Организатор видит, во что превращаются его «6 групп, выходят 4»,
 * до того как нажать «Создать».
 */
export default function StructurePreview({
  draft,
  preview,
  participants,
  texts,
  full = false,
}: StructurePreviewProps): ReactNode {
  const stages: ReactNode[] = [];

  if (draft.type === 'ROUND_ROBIN') {
    stages.push(
      <Card
        key="rr"
        title={texts.everyone}
        subtitle={fill(texts.players, { n: String(participants) })}
      >
        <Dots count={participants} filled={0} />
      </Card>,
    );
  }

  if (preview.groups.length > 0) {
    const shown = full ? preview.groups : preview.groups.slice(0, COMPACT_GROUPS);
    const hidden = preview.groups.length - shown.length;

    stages.push(
      <Box key="groups" sx={{ display: 'grid', gap: 1, minWidth: 0 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 1,
            gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
          }}
        >
          {shown.map((size, index) => (
            <Card key={index} title={fill(texts.group, { n: String(index + 1) })}>
              <Dots count={size} filled={Math.min(draft.advancePerGroup, size)} />
            </Card>
          ))}
          {hidden > 0 && (
            <Card title={`+${String(hidden)}`}>
              <Box sx={{ height: 8 }} />
            </Card>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {texts.advanceNote}
        </Typography>
      </Box>,
    );
  }

  if (preview.bracketSize > 0) {
    stages.push(
      <Box key="bracket" sx={{ display: 'grid', gap: 1, minWidth: 0 }}>
        <Card title={fill(texts.bracket, { n: String(preview.bracketSize) })}>
          <Bracket size={preview.bracketSize} full={full} final={texts.final} />
        </Card>
        {preview.exitBracketMatches > 0 && (
          <Typography variant="caption" color="text.secondary">
            {texts.exitBracket}
          </Typography>
        )}
      </Box>,
    );
  }

  if (preview.finalGroups.length > 0) {
    // k-я финальная группа играет за места сразу после (k−1)-й.
    const starts = preview.finalGroups.map((_size, index) =>
      preview.finalGroups.slice(0, index).reduce((sum, size) => sum + size, 1),
    );
    stages.push(
      <Box key="finals" sx={{ display: 'grid', gap: 1, minWidth: 0 }}>
        {preview.finalGroups.map((size, index) => {
          const from = starts[index] ?? 1;
          return (
            <Card
              key={index}
              title={fill(texts.finalGroup, { from: String(from), to: String(from + size - 1) })}
              accent={index === 0}
            >
              <Dots count={size} filled={0} />
            </Card>
          );
        })}
      </Box>,
    );
  }

  return (
    <Box
      data-structure-preview
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { md: 'flex-start' },
        gap: 1.5,
        p: 2,
        borderRadius: 3,
        bgcolor: 'var(--paper-sunken)',
      }}
    >
      {stages.flatMap((stage, index) =>
        index === 0
          ? [
              <Box key={`s${String(index)}`} sx={{ flex: 1, minWidth: 0 }}>
                {stage}
              </Box>,
            ]
          : [
              <Box
                key={`a${String(index)}`}
                aria-hidden
                sx={{ color: 'var(--ink-400)', alignSelf: 'center', display: 'flex' }}
              >
                <Box component="span" sx={{ display: { xs: 'none', md: 'flex' } }}>
                  <ArrowRight size={20} />
                </Box>
                <Box component="span" sx={{ display: { xs: 'flex', md: 'none' } }}>
                  <ArrowDown size={20} />
                </Box>
              </Box>,
              <Box key={`s${String(index)}`} sx={{ flex: 1, minWidth: 0 }}>
                {stage}
              </Box>,
            ],
      )}
    </Box>
  );
}

function Card({
  title,
  subtitle,
  accent = false,
  children,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly accent?: boolean;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: 'var(--paper)',
        border: '1px solid',
        borderColor: accent ? 'var(--red-600)' : 'var(--line)',
        minWidth: 0,
      }}
    >
      <Typography variant="caption" component="div" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      {subtitle !== undefined && (
        <Typography variant="caption" component="div" color="text.secondary" sx={{ mb: 1 }}>
          {subtitle}
        </Typography>
      )}
      {children}
    </Box>
  );
}

/** Игроки точками: первые `filled` закрашены — они выходят дальше. */
function Dots({ count, filled }: { readonly count: number; readonly filled: number }): ReactNode {
  const shown = Math.min(count, MAX_DOTS);

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
      {Array.from({ length: shown }, (_unused, index) => (
        <Box
          key={index}
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            ...(index < filled
              ? { bgcolor: 'var(--red-600)' }
              : { border: '1.5px solid var(--ink-400)' }),
          }}
        />
      ))}
      {count > shown && (
        <Typography variant="caption" color="text.secondary">
          +{count - shown}
        </Typography>
      )}
    </Box>
  );
}

/**
 * Сетка по кругам: столбец на круг, в нём по планке на встречу. В компактном
 * виде — только подписи кругов, в полном — планки (не больше 16 на круг).
 */
function Bracket({
  size,
  full,
  final,
}: {
  readonly size: number;
  readonly full: boolean;
  readonly final: string;
}): ReactNode {
  const rounds: number[] = [];
  for (let matches = size / 2; matches >= 1; matches /= 2) rounds.push(matches);

  const label = (matches: number): string => (matches === 1 ? final : `1/${String(matches)}`);

  if (!full) {
    return (
      <Typography variant="caption" color="text.secondary" component="div">
        {rounds.map(label).join(' · ')}
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'stretch', overflowX: 'auto' }}>
      {rounds.map((matches) => (
        <Box
          key={matches}
          sx={{ display: 'grid', gap: 0.5, minWidth: 40, alignContent: 'space-around' }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            {label(matches)}
          </Typography>
          {Array.from({ length: Math.min(matches, 16) }, (_unused, index) => (
            <Box
              key={index}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: matches === 1 ? 'var(--red-600)' : 'var(--ink-300)',
              }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}
