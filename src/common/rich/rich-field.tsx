import { linkToken, mentionToken } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  AtSign,
  Bold,
  Eye,
  Italic,
  Link2,
  List,
  ListOrdered,
  PenLine,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';
import { useRef, useState, type ReactNode, type RefObject } from 'react';

import { useT } from '@/common/i18n';

import MentionPicker, { type PickedMention } from './mention-picker';
import RichText from './rich-text';

interface RichFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly label?: string;
  readonly placeholder?: string;
  readonly helperText?: string;
  readonly minRows?: number;
  readonly maxRows?: number;
  readonly maxLength?: number;
  /** Поле снаружи — фокус на «Цитировать» у форума. */
  readonly inputRef?: RefObject<HTMLTextAreaElement | null>;
}

/** Правка текста: что стало и где поставить курсор. */
interface Edit {
  readonly text: string;
  readonly from: number;
  readonly to: number;
}

/** Обернуть выделение — **жирный**, _курсив_; без выделения — пара знаков с курсором между. */
function wrap(text: string, from: number, to: number, mark: string): Edit {
  const selected = text.slice(from, to);
  const next = `${text.slice(0, from)}${mark}${selected}${mark}${text.slice(to)}`;

  return { text: next, from: from + mark.length, to: to + mark.length };
}

/** Строки выделения — в список: маркер в начало каждой. */
function listify(text: string, from: number, to: number, numbered: boolean): Edit {
  const start = text.lastIndexOf('\n', from - 1) + 1;
  const endBreak = text.indexOf('\n', to);
  const end = endBreak === -1 ? text.length : endBreak;
  const lines = text.slice(start, end).split('\n');
  const marked = lines
    .map(
      (line, index) =>
        `${numbered ? `${String(index + 1)}.` : '-'} ${line.replace(/^\s*([-•]|\d+[.)])\s+/, '')}`,
    )
    .join('\n');
  const next = `${text.slice(0, start)}${marked}${text.slice(end)}`;

  return { text: next, from: start, to: start + marked.length };
}

/** Вставить на место выделения. */
function insert(text: string, from: number, to: number, piece: string): Edit {
  const before = text.slice(0, from);
  const space = before === '' || /\s$/.test(before) ? '' : ' ';
  const next = `${before}${space}${piece} ${text.slice(to)}`;
  const caret = from + space.length + piece.length + 1;

  return { text: next, from: caret, to: caret };
}

/**
 * Поле текста с панелью — ADR-076: жирный, курсив, списки, ссылка с
 * подписью, отметка игрока, клуба, тренера и товара; «Просмотр» показывает
 * текст так, как его увидят. Хранится строкой разметки, без HTML.
 *
 * Панель работает с выделением: выделил слово и нажал «Ж» — слово жирное;
 * без выделения встают пустые знаки с курсором между. «@» в начале слова
 * открывает отметку, как в мессенджерах.
 */
export default function RichField({
  value,
  onChange,
  label,
  placeholder,
  helperText,
  minRows = 3,
  maxRows = 16,
  maxLength,
  inputRef,
}: RichFieldProps): ReactNode {
  const t = useT();
  const local = useRef<HTMLTextAreaElement | null>(null);
  const own = inputRef ?? local;
  const [preview, setPreview] = useState(false);
  const [picker, setPicker] = useState<'player' | 'product' | null>(null);
  const [link, setLink] = useState<{ label: string; href: string } | null>(null);
  // Выделение на момент открытия окна: в окне фокус уходит из поля.
  const selection = useRef({ from: 0, to: 0 });

  const remember = () => {
    const field = own.current;
    selection.current = {
      from: field?.selectionStart ?? value.length,
      to: field?.selectionEnd ?? value.length,
    };
  };

  const apply = (edit: (text: string, from: number, to: number) => Edit, useSaved = false) => {
    const field = own.current;
    const { from, to } = useSaved
      ? selection.current
      : { from: field?.selectionStart ?? value.length, to: field?.selectionEnd ?? value.length };
    const next = edit(value, from, to);

    onChange(maxLength === undefined ? next.text : next.text.slice(0, maxLength));
    // Курсор — после правки, когда React уже вписал новое значение.
    requestAnimationFrame(() => {
      own.current?.focus();
      own.current?.setSelectionRange(next.from, next.to);
    });
  };

  const onPick = (mention: PickedMention) => {
    setPicker(null);
    apply((text, from, to) => {
      // «@», набранная перед открытием окна, заменяется отметкой.
      const at = text.charAt(from - 1) === '@' ? from - 1 : from;
      return insert(text, at, to, mentionToken(mention.target, mention.ref, mention.label));
    }, true);
  };

  return (
    <Box data-rich-field>
      {label !== undefined && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75, fontWeight: 600 }}>
          {label}
        </Typography>
      )}
      <Box
        role="toolbar"
        aria-label={t('rich.toolbar')}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 0.25,
          px: 0.5,
          py: 0.25,
          mb: 0.75,
          borderRadius: 2,
          bgcolor: 'var(--paper-sunken)',
        }}
      >
        <Tool
          label={t('rich.bold')}
          icon={Bold}
          data="bold"
          disabled={preview}
          onAction={() => {
            apply((text, from, to) => wrap(text, from, to, '**'));
          }}
        />
        <Tool
          label={t('rich.italic')}
          icon={Italic}
          data="italic"
          disabled={preview}
          onAction={() => {
            apply((text, from, to) => wrap(text, from, to, '_'));
          }}
        />
        <Tool
          label={t('rich.bullets')}
          icon={List}
          data="bullets"
          disabled={preview}
          onAction={() => {
            apply((text, from, to) => listify(text, from, to, false));
          }}
        />
        <Tool
          label={t('rich.numbers')}
          icon={ListOrdered}
          data="numbers"
          disabled={preview}
          onAction={() => {
            apply((text, from, to) => listify(text, from, to, true));
          }}
        />
        <Tool
          label={t('rich.link')}
          icon={Link2}
          data="link"
          disabled={preview}
          onAction={() => {
            remember();
            const { from, to } = selection.current;
            setLink({ label: value.slice(from, to), href: 'https://' });
          }}
        />
        <Tool
          label={t('rich.mention')}
          icon={AtSign}
          data="mention"
          disabled={preview}
          onAction={() => {
            remember();
            setPicker('player');
          }}
        />
        <Tool
          label={t('rich.product')}
          icon={ShoppingBag}
          data="product"
          disabled={preview}
          onAction={() => {
            remember();
            setPicker('product');
          }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Button
          size="small"
          variant="text"
          onClick={() => {
            setPreview(!preview);
          }}
          startIcon={preview ? <PenLine size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          aria-pressed={preview}
          sx={{ minHeight: 36 }}
        >
          {t(preview ? 'rich.edit' : 'rich.preview')}
        </Button>
      </Box>

      {preview ? (
        <Box
          sx={{
            minHeight: 96,
            p: 1.75,
            border: '1px solid var(--line-strong)',
            borderRadius: 2,
          }}
          data-rich-preview
        >
          {value.trim() === '' ? (
            <Typography color="text.secondary">{t('rich.previewEmpty')}</Typography>
          ) : (
            <RichText text={value} />
          )}
        </Box>
      ) : (
        <TextField
          inputRef={own}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onKeyUp={(event) => {
            // «@» в начале слова — окно отметки, как в мессенджерах.
            const field = event.currentTarget.querySelector('textarea');
            if (event.key !== '@' || field === null) return;
            const before = field.value.slice(0, field.selectionStart - 1);
            if (before === '' || /\s$/.test(before)) {
              remember();
              setPicker('player');
            }
          }}
          placeholder={placeholder}

          helperText={helperText}
          multiline
          minRows={minRows}
          maxRows={maxRows}
          fullWidth
          slotProps={{
            htmlInput: {
              'aria-label': label ?? placeholder,
              ...(maxLength === undefined ? {} : { maxLength }),
            },
          }}
        />
      )}

      {picker !== null && (
        <MentionPicker
          initial={picker}
          onPick={onPick}
          onClose={() => {
            setPicker(null);
          }}
        />
      )}

      {link !== null && (
        <Dialog
          open
          onClose={() => {
            setLink(null);
          }}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>{t('rich.link')}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
            <TextField
              label={t('rich.link.label')}
              value={link.label}
              onChange={(event) => {
                setLink({ ...link, label: event.target.value });
              }}
            />
            <TextField
              autoFocus
              label={t('rich.link.href')}
              value={link.href}
              error={!/^https?:\/\/\S+\.\S+/.test(link.href)}
              onChange={(event) => {
                setLink({ ...link, href: event.target.value.trim() });
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button
              variant="text"
              onClick={() => {
                setLink(null);
              }}
            >
              {t('rich.cancel')}
            </Button>
            <Button
              disabled={!/^https?:\/\/\S+\.\S+/.test(link.href)}
              onClick={() => {
                const piece = linkToken(link.label, link.href);
                setLink(null);
                apply((text, from, to) => insert(text, from, to, piece), true);
              }}
            >
              {t('rich.insert')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

/** Кнопка панели. Не забирает фокус: выделение в поле остаётся. */
function Tool({
  label,
  icon: Icon,
  data,
  disabled,
  onAction,
}: {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly data: string;
  readonly disabled: boolean;
  readonly onAction: () => void;
}): ReactNode {
  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        size="small"
        disabled={disabled}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={onAction}
        data-rich-tool={data}
        sx={{ borderRadius: 1.5, width: 36, height: 36 }}
      >
        <Icon size={18} aria-hidden />
      </IconButton>
    </Tooltip>
  );
}
