import type { AutocompleteRenderGroupParams } from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import ListSubheader from '@mui/material/ListSubheader';
import type { ReactNode } from 'react';

/**
 * Группа выпадающего списка городов — ADR-096: подзаголовок с названием
 * области над её городами. Города вне областей (группа `''`) идут первыми
 * и без подзаголовка.
 */
export function renderRegionGroup({
  key,
  group,
  children,
}: AutocompleteRenderGroupParams): ReactNode {
  return (
    <li key={key}>
      {group !== '' && <ListSubheader component="div">{group}</ListSubheader>}
      <Box component="ul" sx={{ p: 0 }}>
        {children}
      </Box>
    </li>
  );
}
