# Table Component Documentation

## Overview

The Table component is a flexible, design-system-aware component for displaying tabular data. It supports sorting, selection, actions, and responsive design.

## Features

- ✅ Header with blue background from design tokens
- ✅ Sortable columns with indicators
- ✅ Row selection with checkboxes
- ✅ Action buttons (view, edit, delete, approve, reject)
- ✅ Empty state support
- ✅ Loading state with shimmer animation
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Keyboard navigation support
- ✅ Accessibility features (ARIA labels, color contrast)
- ✅ TypeScript strict mode

## Basic Usage

```typescript
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/shared/ui';

export const MyTablePage = () => {
  return (
    <Table>
      <TableHeader>
        <TableRow isHeader>
          <TableCell isHeader>Name</TableCell>
          <TableCell isHeader>Email</TableCell>
          <TableCell isHeader>Status</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

## Advanced Usage with Actions

```typescript
import { Table, TableHeader, TableBody, TableRow, TableCell, TableActions, TableAction } from '@/shared/ui';
import { Edit, Trash2, Eye } from 'lucide-react';

export const UserTableWithActions = () => {
  const handleEdit = (id: number) => {
    // Handle edit
  };

  const handleDelete = (id: number) => {
    // Handle delete
  };

  const handleView = (id: number) => {
    // Handle view
  };

  return (
    <Table>
      <TableHeader>
        <TableRow isHeader>
          <TableCell isHeader>Name</TableCell>
          <TableCell isHeader>Email</TableCell>
          <TableCell isHeader align="right">Actions</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell align="right">
              <TableActions>
                <TableAction
                  icon={<Eye size={18} />}
                  title="View"
                  variant="view"
                  onClick={() => handleView(user.id)}
                />
                <TableAction
                  icon={<Edit size={18} />}
                  title="Edit"
                  variant="edit"
                  onClick={() => handleEdit(user.id)}
                />
                <TableAction
                  icon={<Trash2 size={18} />}
                  title="Delete"
                  variant="delete"
                  onClick={() => handleDelete(user.id)}
                />
              </TableActions>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

## With Sorting

```typescript
import { useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/shared/ui';

export const SortableTable = () => {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSort = (columnKey: string) => {
    setSortConfig((current) => {
      if (current?.key === columnKey) {
        // Toggle direction
        return {
          key: columnKey,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key: columnKey, direction: 'asc' };
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow isHeader>
          <TableCell
            isHeader
            sortable
            sortDirection={sortConfig?.key === 'name' ? sortConfig.direction : null}
            onSort={() => handleSort('name')}
          >
            Name
          </TableCell>
          <TableCell
            isHeader
            sortable
            sortDirection={sortConfig?.key === 'email' ? sortConfig.direction : null}
            onSort={() => handleSort('email')}
          >
            Email
          </TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* Render sorted data */}
      </TableBody>
    </Table>
  );
};
```

## With Loading State

```typescript
<Table loading>
  <TableHeader>
    <TableRow isHeader>
      <TableCell isHeader>Name</TableCell>
      <TableCell isHeader>Email</TableCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    {/* Will show shimmer animation */}
  </TableBody>
</Table>
```

## With Empty State

```typescript
import { TableEmpty } from '@/shared/ui';
import { InboxX } from 'lucide-react';

<Table empty>
  <TableHeader>
    <TableRow isHeader>
      <TableCell isHeader>Name</TableCell>
      <TableCell isHeader>Email</TableCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell colSpan={2}>
        <TableEmpty
          icon={<InboxX size={48} />}
          title="No users found"
          description="Try adjusting your search or filters"
        />
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Props Reference

### Table
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | - | Table content (TableHeader, TableBody) |
| `className` | string | '' | Additional CSS classes |
| `loading` | boolean | false | Show loading shimmer animation |
| `empty` | boolean | false | Show empty state |

### TableCell
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | - | Cell content |
| `align` | 'left' \| 'center' \| 'right' | 'left' | Text alignment |
| `isHeader` | boolean | false | Is header cell |
| `sortable` | boolean | false | Enable sorting |
| `sortDirection` | 'asc' \| 'desc' \| null | null | Current sort direction |
| `onSort` | () => void | - | Sort callback |
| `nowrap` | boolean | false | Prevent text wrapping |
| `truncate` | boolean | false | Truncate text with ellipsis |
| `hideMobile` | boolean | false | Hide on mobile (< 768px) |

### TableAction
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | ReactNode | - | Icon element (lucide-react) |
| `onClick` | () => void | - | Click handler |
| `variant` | 'view' \| 'edit' \| 'delete' \| 'approve' \| 'reject' | 'view' | Button style |
| `title` | string | - | Tooltip/title text |
| `disabled` | boolean | false | Disable button |

## Design System Integration

This component uses the following design tokens:

- **Colors**: `var(--color-primary)`, `var(--color-border)`, `var(--color-text-primary)`
- **Spacing**: `var(--padding-md)`, `var(--space-2)`, `var(--space-4)`
- **Shadows**: `var(--shadow-sm)`, `var(--shadow-md)`
- **Border Radius**: `var(--radius-md)`
- **Transitions**: `var(--transition-normal)`

All values are defined in `src/shared/styles/design-tokens.css`.

## Responsive Behavior

- **Desktop (> 768px)**: Full table display with all columns
- **Tablet (480px - 768px)**: Reduced padding, smaller font
- **Mobile (< 480px)**: 
  - Hide `hideMobile` columns
  - Smaller padding and font
  - Horizontal scroll for wide tables
  - Alternative card layout available

## Migration Guide (from Old Table)

Old API (DataTable component):
```typescript
<DataTable columns={columns} data={data} />
```

New API (Table components):
```typescript
<Table>
  <TableHeader>
    <TableRow isHeader>
      {columns.map(col => <TableCell isHeader>{col.header}</TableCell>)}
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map(row => (
      <TableRow key={row.id}>
        {columns.map(col => (
          <TableCell>{col.render ? col.render(row[col.key], row) : row[col.key]}</TableCell>
        ))}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- ✅ Keyboard navigation support
- ✅ ARIA labels on interactive elements
- ✅ Color contrast ≥ 4.5:1 (WCAG AA)
- ✅ Focus indicators visible
- ✅ Screen reader friendly

## Performance

- Component uses `React.memo` internally for cell components
- Efficient re-rendering with proper key props
- No unnecessary DOM manipulations
- Optimized CSS animations (GPU accelerated when possible)

## Common Use Cases

### Example 1: Admin User Management
See: `src/pages/admin/AdminUsersPage.tsx` (to be migrated)

### Example 2: Payroll Management
See: `src/pages/payroll/PayrollListPage.tsx` (to be migrated)

### Example 3: Leave Requests
See: `src/pages/leave/LeaveRequestsPage.tsx` (to be migrated)
