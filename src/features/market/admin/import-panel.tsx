import { IMPORT_BATCH_MAX } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { FileUp } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, formatCount, useLocale, useT } from '@/common/i18n';

import { importProducts } from '../api';
import { marketKeys } from '../queries';
import {
  EMPTY_TALLY,
  parseImportFile,
  runImport,
  type ImportTally,
  type ParsedImport,
} from './import-run';

/** Сколько ошибок проверки показать: дальше они обычно повторяют первые. */
const FIRST_ERRORS = 10;

type Phase = 'idle' | 'running' | 'done' | 'stopped' | 'failed';

/**
 * Импорт каталога — `docs/10` 5.8, раздел 6.
 *
 * Файл разбирается и проверяется здесь же, до записи. Отправка — пачками по
 * очереди с полосой хода и счётом «заведено / обновлено / отвергнуто».
 * Остановить можно в любой момент: текущая пачка дойдёт, следующие — нет.
 * Пока импорт идёт, закрытие вкладки спрашивает подтверждения.
 */
export default function ImportPanel(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const stop = useRef(false);
  const [file, setFile] = useState<{ readonly name: string; readonly parsed: ParsedImport } | null>(
    null,
  );
  const [phase, setPhase] = useState<Phase>('idle');
  const [tally, setTally] = useState<ImportTally>(EMPTY_TALLY);
  const [error, setError] = useState<unknown>(null);
  const running = phase === 'running';

  useEffect(() => {
    if (!running) return;

    const warn = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);

    return () => {
      window.removeEventListener('beforeunload', warn);
    };
  }, [running]);

  const pick = async (chosen: File): Promise<void> => {
    const text = await chosen.text();

    setFile({ name: chosen.name, parsed: parseImportFile(text, t('catalog.import.notJson')) });
    setPhase('idle');
    setTally(EMPTY_TALLY);
    setError(null);
  };

  const start = async (rows: readonly unknown[]): Promise<void> => {
    stop.current = false;
    setPhase('running');
    setTally(EMPTY_TALLY);
    setError(null);

    const outcome = await runImport(rows, importProducts, {
      shouldStop: () => stop.current,
      onProgress: setTally,
    });

    setTally(outcome.tally);
    setPhase(outcome.status);
    if (outcome.status === 'failed') setError(outcome.error);
    await queryClient.invalidateQueries({ queryKey: marketKeys.all });
  };

  const parsed = file?.parsed;
  const count = (value: number): string => formatCount(value, locale);

  return (
    <Box sx={{ mt: 3, display: 'grid', gap: 3 }}>
      <Paper variant="outlined" component="section" sx={{ p: { xs: 2.5, sm: 4 } }}>
        <Typography variant="h2">{t('catalog.tab.import')}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
          {fill(t('catalog.import.lead'), { size: String(IMPORT_BATCH_MAX) })}
        </Typography>
        <input
          ref={input}
          type="file"
          accept=".jsonl,.ndjson,application/x-ndjson,application/jsonl,text/plain"
          hidden
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            event.target.value = '';
            if (chosen !== undefined) void pick(chosen);
          }}
        />
        <Button
          variant="outlined"
          startIcon={<FileUp size={18} aria-hidden />}
          disabled={running}
          onClick={() => input.current?.click()}
          sx={{ mt: 3, minHeight: 48 }}
        >
          {file === null ? t('catalog.import.pick') : t('catalog.import.again')}
        </Button>

        {parsed !== undefined && file !== null && (
          <Box sx={{ mt: 3 }}>
            <Typography sx={{ fontWeight: 600 }}>{file.name}</Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {[
                fill(t('catalog.import.rows'), { count: count(parsed.total) }),
                fill(t('catalog.import.valid'), { count: count(parsed.rows.length) }),
                fill(t('catalog.import.invalid'), { count: count(parsed.errors.length) }),
              ].join(' · ')}
            </Typography>

            {parsed.errors.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {t('catalog.import.firstErrors')}
                </Typography>
                <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                  {parsed.errors.slice(0, FIRST_ERRORS).map((item) => (
                    <Typography component="li" variant="body2" key={item.line}>
                      {`${fill(t('catalog.import.line'), { line: String(item.line) })}: ${item.message}`}
                    </Typography>
                  ))}
                </Box>
              </Alert>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                disabled={running || parsed.rows.length === 0}
                onClick={() => void start(parsed.rows)}
                sx={{ minHeight: 48, px: 4 }}
              >
                {fill(t('catalog.import.start'), { count: count(parsed.rows.length) })}
              </Button>
              {running && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    stop.current = true;
                  }}
                  sx={{ minHeight: 48 }}
                >
                  {t('catalog.import.stop')}
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Paper>

      {phase !== 'idle' && parsed !== undefined && (
        <Paper
          variant="outlined"
          component="section"
          aria-live="polite"
          sx={{ p: { xs: 2.5, sm: 4 } }}
        >
          <Typography variant="h3">
            {t(
              phase === 'running'
                ? 'catalog.import.running'
                : phase === 'done'
                  ? 'catalog.import.done'
                  : phase === 'stopped'
                    ? 'catalog.import.stopped'
                    : 'catalog.import.failed',
            )}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={parsed.rows.length === 0 ? 0 : (tally.sent / parsed.rows.length) * 100}
            aria-label={t('catalog.import.progressLabel')}
            sx={{ mt: 2, height: 8, borderRadius: 999 }}
          />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, fontVariantNumeric: 'tabular-nums' }}
          >
            {fill(t('catalog.import.progress'), {
              done: count(tally.sent),
              total: count(parsed.rows.length),
            })}
          </Typography>
          <Typography sx={{ mt: 1, fontVariantNumeric: 'tabular-nums' }}>
            {[
              fill(t('catalog.import.created'), { count: count(tally.created) }),
              fill(t('catalog.import.updated'), { count: count(tally.updated) }),
              fill(t('catalog.import.rejected'), { count: count(tally.rejected.length) }),
            ].join(' · ')}
          </Typography>
          {error !== null && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {t(errorMessageKey(error))}
            </Alert>
          )}
          {tally.rejected.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {t('catalog.import.rejectedList')}
              </Typography>
              <Box
                component="ul"
                sx={{ m: 0, mt: 0.5, pl: 2.5, maxHeight: 320, overflowY: 'auto' }}
              >
                {tally.rejected.map((row, index) => (
                  <Typography
                    component="li"
                    variant="body2"
                    key={`${String(row.rttfId)}-${String(index)}`}
                  >
                    {`rttfId ${row.rttfId === null ? '—' : String(row.rttfId)}: ${row.reason ?? t('catalog.import.noReason')}`}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
