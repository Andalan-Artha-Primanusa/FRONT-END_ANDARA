# PageLayout Component Documentation

## Overview
`PageLayout` is a standardized page template component that provides a consistent structure for all pages in the HRIS application. It includes header, content area, and footer sections with built-in support for actions, filters, pagination, empty states, and loading states.

## Design Tokens
- Primary Blue: `#2563eb`
- Spacing Grid: 8px base (4, 8, 12, 16, 20, 24, 32, 48px)
- Border Color: `#e5e7eb`
- Typography: Responsive across 480px, 768px, 1024px breakpoints

## Components

### 1. PageLayout
Main container component that wraps the entire page.

```tsx
import { PageLayout } from '@/shared/layouts/PageLayout';

<PageLayout>
  {/* Header, Content, Footer */}
</PageLayout>
```

**Props:**
```typescript
interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}
```

---

### 2. PageHeader
Header section with title, breadcrumb, and action buttons.

```tsx
import { PageHeader } from '@/shared/layouts/PageLayout';

<PageHeader
  title="User Management"
  subtitle="Manage system users and permissions"
  breadcrumb={[
    { label: 'Admin', href: '/admin' },
    { label: 'Users' }
  ]}
  actions={<button>Add User</button>}
>
  {/* Optional filters */}
</PageHeader>
```

**Props:**
```typescript
interface PageHeaderProps {
  title: string;              // Required: Page title
  subtitle?: string;          // Optional: Subtitle/description
  breadcrumb?: Array<{
    label: string;
    href?: string;           // href makes it a link
  }>;
  actions?: React.ReactNode; // Right-aligned action buttons
  children?: React.ReactNode; // Filter components
  className?: string;
}
```

**Example with Breadcrumb & Actions:**
```tsx
<PageHeader
  title="Edit User"
  breadcrumb={[
    { label: 'Admin', href: '/admin' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Edit' }
  ]}
  actions={
    <>
      <button className="btn btn-secondary">Cancel</button>
      <button className="btn btn-primary">Save</button>
    </>
  }
/>
```

---

### 3. PageContent
Main content area with layout options.

```tsx
import { PageContent } from '@/shared/layouts/PageLayout';

<PageContent layout="default">
  {/* Page content */}
</PageContent>
```

**Props:**
```typescript
interface PageContentProps {
  children: React.ReactNode;
  className?: string;
  layout?: 'default' | 'grid' | 'full';
}
```

**Layout Options:**
- `default`: Standard flex layout (for tables, single content)
- `grid`: CSS Grid with auto-fill (for card layouts)
- `full`: Full-width single column

**Examples:**
```tsx
// Single table layout
<PageContent layout="default">
  <Table {...props} />
</PageContent>

// Multiple cards/columns
<PageContent layout="grid">
  <Card>{{content}}</Card>
  <Card>{{content}}</Card>
  <Card>{{content}}</Card>
</PageContent>

// Full-width content
<PageContent layout="full">
  <Alert />
  <Form />
</PageContent>
```

---

### 4. PageTableWrapper
Wrapper for table components with proper styling.

```tsx
import { PageTableWrapper } from '@/shared/layouts/PageLayout';

<PageTableWrapper>
  <Table {...props} />
</PageTableWrapper>
```

---

### 5. PageFooter
Footer section with pagination and info text.

```tsx
import { PageFooter } from '@/shared/layouts/PageLayout';

<PageFooter
  info="Showing 1-10 of 125 users"
  pagination={<Pagination {...paginationProps} />}
/>
```

**Props:**
```typescript
interface PageFooterProps {
  children?: React.ReactNode;
  pagination?: React.ReactNode;
  info?: string;
  className?: string;
}
```

---

### 6. PageEmpty
Empty state component for when no data exists.

```tsx
import { PageEmpty } from '@/shared/layouts/PageLayout';
import { Plus } from 'lucide-react';

<PageEmpty
  icon={<Plus size={80} />}
  title="No users found"
  description="Get started by creating your first user"
  action={<button className="btn btn-primary">Create User</button>}
/>
```

**Props:**
```typescript
interface PageEmptyProps {
  icon?: React.ReactNode;           // Large icon (use lucide-react)
  title: string;                    // Main empty state message
  description?: string;             // Secondary text
  action?: React.ReactNode;         // CTA button
}
```

---

### 7. PageLoading
Loading state component with spinner.

```tsx
import { PageLoading } from '@/shared/layouts/PageLayout';

<PageLoading message="Loading users..." />
```

**Props:**
```typescript
interface PageLoadingProps {
  message?: string;
}
```

---

### 8. PageFiltersSearch
Search input component for filters.

```tsx
import { PageFiltersSearch } from '@/shared/layouts/PageLayout';

<PageFiltersSearch
  placeholder="Search users..."
  value={searchTerm}
  onChange={setSearchTerm}
  onSearch={handleSearch}
/>
```

---

### 9. PageFiltersButtons
Container for filter buttons.

```tsx
import { PageFiltersButtons } from '@/shared/layouts/PageLayout';

<PageFiltersButtons>
  <button className="btn btn-secondary">Filter</button>
  <button className="btn btn-secondary">Export</button>
</PageFiltersButtons>
```

---

### 10. PageLayoutTemplate
Composite helper that combines PageLayout + Header + Content + Footer with built-in support for loading/empty states.

```tsx
import { PageLayoutTemplate } from '@/shared/layouts/PageLayout';

<PageLayoutTemplate
  title="User Management"
  subtitle="Manage system users"
  breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'Users' }]}
  actions={<button>Add User</button>}
  loading={isLoading}
  empty={{
    icon: <Plus size={80} />,
    title: 'No users found',
    description: 'Create your first user to get started',
    action: <button>Create User</button>
  }}
  footer={{
    info: `Showing ${paginationInfo}`,
    pagination: <Pagination {...props} />
  }}
>
  <Table {...tableProps} />
</PageLayoutTemplate>
```

---

## Complete Page Example

```tsx
import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import {
  PageLayout,
  PageHeader,
  PageContent,
  PageFooter,
  PageEmpty,
  PageFiltersSearch,
  PageFiltersButtons,
  PageTableWrapper
} from '@/shared/layouts/PageLayout';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/shared/ui/Table';
import { Pagination } from '@/shared/ui/Pagination';

const UsersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Mock data
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Manager' }
  ];

  const isEmpty = users.length === 0;

  return (
    <PageLayout>
      <PageHeader
        title="User Management"
        subtitle="Manage system users and permissions"
        breadcrumb={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users' }
        ]}
        actions={
          <button className="btn btn-primary">
            <Plus size={18} />
            Add User
          </button>
        }
      >
        <PageFiltersSearch
          placeholder="Search users..."
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <PageFiltersButtons>
          <button className="btn btn-secondary">Filter</button>
          <button className="btn btn-secondary">Export</button>
        </PageFiltersButtons>
      </PageHeader>

      <PageContent>
        {isEmpty ? (
          <PageEmpty
            icon={<Plus size={80} />}
            title="No users found"
            description="Get started by creating your first user"
            action={<button className="btn btn-primary">Create User</button>}
          />
        ) : (
          <PageTableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell header>Name</TableCell>
                  <TableCell header>Email</TableCell>
                  <TableCell header>Role</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PageTableWrapper>
        )}
      </PageContent>

      {!isEmpty && (
        <PageFooter
          info={`Showing 1-${users.length} of ${users.length} users`}
          pagination={
            <Pagination
              currentPage={currentPage}
              totalPages={1}
              onPageChange={setCurrentPage}
            />
          }
        />
      )}
    </PageLayout>
  );
};

export default UsersPage;
```

---

## Responsive Design

PageLayout is fully responsive with breakpoints at:
- **1024px and below**: Reduced padding, header actions wrap
- **768px and below**: Single-column layout, stacked filters
- **480px and below**: Mobile optimized, minimal spacing

## CSS Classes

### Main Classes
```css
.page-layout              /* Main container */
.page-header              /* Header wrapper */
.page-header-top          /* Title + actions row */
.page-header-content      /* Title/subtitle section */
.page-header-actions      /* Action buttons container */
.page-title               /* Page title (h1) */
.page-subtitle            /* Subtitle/description */
.page-breadcrumb          /* Breadcrumb navigation */
.page-filters             /* Filter section */
.page-filters-search      /* Search input wrapper */
.page-filters-buttons     /* Filter buttons container */
.page-body                /* Content area */
.page-content             /* Content container (flex) */
.page-content-grid        /* Grid layout for cards */
.page-content-full        /* Full-width column */
.page-table-wrapper       /* Table container */
.page-footer              /* Footer section */
.page-footer-info         /* Info/record count text */
.page-footer-pagination   /* Pagination container */
.page-empty               /* Empty state container */
.page-empty-icon          /* Empty state icon */
.page-empty-title         /* Empty state title */
.page-empty-description   /* Empty state description */
.page-empty-action        /* Empty state action button */
.page-loading             /* Loading state container */
.page-loading-spinner     /* Loading spinner animation */
```

## Usage Checklist

- ✅ Always wrap pages with `<PageLayout>`
- ✅ Use `<PageHeader>` with required `title` prop
- ✅ Use `<PageContent>` for main content area
- ✅ Use `<PageTableWrapper>` when displaying tables
- ✅ Add `<PageFooter>` with pagination for data lists
- ✅ Show `<PageEmpty>` when no results exist
- ✅ Show `<PageLoading>` during data fetch
- ✅ Use design tokens for consistent spacing (var(--space-*))
- ✅ Use `breadcrumb` prop for navigation context
- ✅ Test responsive behavior at 480px, 768px, 1024px

## Color Scheme
All colors use CSS design tokens:
- Primary Blue: `var(--color-primary)` (#2563eb)
- Text Primary: `var(--color-text-primary)` (#1f2937)
- Text Secondary: `var(--color-text-secondary)` (#6b7280)
- Border: `var(--color-border)` (#e5e7eb)
- Background: `var(--color-background)` (#f9fafb)
- White: `var(--color-white)` (#ffffff)

## Best Practices

1. **Always provide breadcrumb for nested pages** - Helps users understand navigation
2. **Use PageLayoutTemplate for simple cases** - Reduces boilerplate
3. **Keep headers lean** - Too many actions make interface cluttered
4. **Show empty states gracefully** - Include helpful CTA buttons
5. **Display loading states during data fetch** - Don't leave users guessing
6. **Use consistent action button order** - Secondary then Primary (right side)
7. **Limit filters to essential ones** - Avoid overwhelming users
8. **Paginate large datasets** - Table with 1000+ rows impacts performance

---

**Last Updated:** 2024
**Status:** Production Ready v1.0
