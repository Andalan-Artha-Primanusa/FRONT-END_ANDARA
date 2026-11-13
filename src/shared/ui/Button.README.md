# Button Component Documentation

## Overview
`Button` is a standardized button component that integrates with the design system's white + blue theme. It supports multiple variants, sizes, and states with full accessibility support.

## Design System Colors
- Primary Blue: `#2563eb`
- Secondary Gray: `#f3f4f6`
- Success Green: `#10b981`
- Danger Red: `#ef4444`
- Warning Amber: `#f59e0b`

## Basic Usage

```tsx
import { Button } from '@/shared/ui';

export const MyComponent = () => (
  <Button onClick={() => console.log('clicked')}>
    Click Me
  </Button>
);
```

## Variants

### Primary (Default)
Main action button with blue background.

```tsx
<Button variant="primary">Save Changes</Button>
```

**Use case:** Primary CTA, form submission, main actions

### Secondary
Secondary action with gray background.

```tsx
<Button variant="secondary">Learn More</Button>
```

**Use case:** Secondary CTAs, auxiliary actions

### Outline
Bordered button with transparent background.

```tsx
<Button variant="outline">Edit</Button>
```

**Use case:** Optional actions, less emphasis than primary

### Ghost
Minimal button with no background.

```tsx
<Button variant="ghost">Settings</Button>
```

**Use case:** Navigation, minimal UI, tertiary actions

### Success
Green button for positive actions.

```tsx
<Button variant="success">Approve</Button>
```

**Use case:** Confirmation, approval, success actions

### Danger
Red button for destructive actions.

```tsx
<Button variant="danger">Delete</Button>
```

**Use case:** Delete, remove, destructive operations

### Warning
Amber button for cautionary actions.

```tsx
<Button variant="warning">Proceed with Caution</Button>
```

**Use case:** Risky operations, warnings

## Sizes

### Small (sm)
```tsx
<Button size="sm">Small Button</Button>
```
- Height: 32px
- Padding: 4px 12px
- Font size: 12px (sm)

### Medium (md) - Default
```tsx
<Button size="md">Medium Button</Button>
```
- Height: 40px
- Padding: 8px 16px
- Font size: 14px (base)

### Large (lg)
```tsx
<Button size="lg">Large Button</Button>
```
- Height: 48px
- Padding: 12px 24px
- Font size: 14px (base)

## Specialized Buttons

### Primary Button Helper
```tsx
import { PrimaryButton } from '@/shared/ui';

<PrimaryButton>Save</PrimaryButton>
```

### Secondary Button Helper
```tsx
import { SecondaryButton } from '@/shared/ui';

<SecondaryButton>Cancel</SecondaryButton>
```

### Outline Button Helper
```tsx
import { OutlineButton } from '@/shared/ui';

<OutlineButton>Edit</OutlineButton>
```

### Ghost Button Helper
```tsx
import { GhostButton } from '@/shared/ui';

<GhostButton>More Options</GhostButton>
```

### Success Button Helper
```tsx
import { SuccessButton } from '@/shared/ui';

<SuccessButton>Confirm</SuccessButton>
```

### Danger Button Helper
```tsx
import { DangerButton } from '@/shared/ui';

<DangerButton>Delete Forever</DangerButton>
```

### Warning Button Helper
```tsx
import { WarningButton } from '@/shared/ui';

<WarningButton>Caution: Proceed</WarningButton>
```

### Icon Button
Square button optimized for icons.

```tsx
import { IconButton } from '@/shared/ui';
import { Plus, Trash2, Settings } from 'lucide-react';

<IconButton size="md">
  <Plus size={20} />
</IconButton>

<IconButton variant="danger" size="md">
  <Trash2 size={20} />
</IconButton>

<IconButton variant="ghost">
  <Settings size={20} />
</IconButton>
```

## States

### Disabled
```tsx
<Button disabled>Disabled Button</Button>
```

### Loading
```tsx
<Button loading>Processing...</Button>
```

Shows spinner and prevents interaction.

```tsx
const [isLoading, setIsLoading] = useState(false);

<Button
  loading={isLoading}
  onClick={async () => {
    setIsLoading(true);
    await saveData();
    setIsLoading(false);
  }}
>
  Save
</Button>
```

### Full Width
```tsx
<Button fullWidth>Full Width Button</Button>
```

### Block (Same as Full Width)
```tsx
<Button block>Block Button</Button>
```

## Complete Examples

### Form with Buttons
```tsx
import { Button, SecondaryButton } from '@/shared/ui';

<form onSubmit={handleSubmit}>
  <input type="text" placeholder="Name" />
  <textarea placeholder="Message"></textarea>
  
  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
    <Button type="submit">Send</Button>
    <SecondaryButton type="button" onClick={handleReset}>
      Clear
    </SecondaryButton>
  </div>
</form>
```

### Confirmation Dialog
```tsx
import { Button, DangerButton, SecondaryButton } from '@/shared/ui';

<div style={{ textAlign: 'center' }}>
  <h2>Confirm Delete?</h2>
  <p>This action cannot be undone.</p>
  
  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
    <SecondaryButton onClick={handleCancel}>Cancel</SecondaryButton>
    <DangerButton onClick={handleDelete}>Delete</DangerButton>
  </div>
</div>
```

### Table Actions
```tsx
import { Button, IconButton } from '@/shared/ui';
import { Edit, Trash2, Eye } from 'lucide-react';

<tr>
  <td>John Doe</td>
  <td>john@example.com</td>
  <td>
    <div style={{ display: 'flex', gap: '8px' }}>
      <IconButton variant="ghost" size="sm" title="View">
        <Eye size={18} />
      </IconButton>
      <IconButton variant="ghost" size="sm" title="Edit">
        <Edit size={18} />
      </IconButton>
      <IconButton variant="danger" size="sm" title="Delete">
        <Trash2 size={18} />
      </IconButton>
    </div>
  </td>
</tr>
```

### Button Group
```tsx
import { Button, ButtonGroup } from '@/shared/ui';

<ButtonGroup direction="horizontal" gap="md">
  <Button variant="secondary">Back</Button>
  <Button variant="primary">Next</Button>
</ButtonGroup>

[or vertically]

<ButtonGroup direction="vertical" gap="md" style={{ width: '100%' }}>
  <Button fullWidth variant="primary">Sign In</Button>
  <Button fullWidth variant="ghost">Forgot Password?</Button>
</ButtonGroup>
```

## Props

### Button Component Props

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // Style variant (default: 'primary')
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'danger' | 'warning';
  
  // Button size (default: 'md')
  size?: 'sm' | 'md' | 'lg';
  
  // Button content (required)
  children: React.ReactNode;
  
  // Full width button (default: false)
  fullWidth?: boolean;
  
  // Icon-only button (default: false)
  isIcon?: boolean;
  
  // Loading state (default: false)
  loading?: boolean;
  
  // Block-level button (default: false)
  block?: boolean;
  
  // Custom className for additional styles
  className?: string;
  
  // Standard HTML button props
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  // ... all other HTMLButtonElement attributes
}
```

## Color Tokens

All colors use CSS variables for consistency:

```css
/* Primary */
var(--color-primary)           /* #2563eb */
var(--color-primary-dark)      /* #1d4ed8 */
var(--color-primary-darker)    /* #1e40af */
var(--color-primary-light)     /* #dbeafe */
var(--color-primary-lighter)   /* #eff6ff */

/* Semantic */
var(--color-success)           /* #10b981 */
var(--color-error)             /* #ef4444 */
var(--color-warning)           /* #f59e0b */

/* Text & Background */
var(--color-text-primary)      /* #1f2937 */
var(--color-text-secondary)    /* #6b7280 */
var(--color-text-inverse)      /* #ffffff */
var(--color-white)             /* #ffffff */
var(--color-gray-100)          /* #f3f4f6 */
var(--color-gray-200)          /* #e5e7eb */
var(--color-gray-300)          /* #d1d5db */
var(--color-border)            /* #e5e7eb */
```

## Accessibility

- Focus states: Blue outline (3px, rgba(37, 99, 235, 0.1))
- Disabled state: 60% opacity, cursor not-allowed
- High contrast: All text meets WCAG AA standards
- Keyboard accessible: Tab navigation, Enter/Space activation
- Touch-friendly: Minimum 40px height for touch targets
- Reduced motion: Respects `prefers-reduced-motion` setting

## CSS Classes

```css
.ui-button                     /* Main button element */
.ui-button--primary            /* Primary variant */
.ui-button--secondary          /* Secondary variant */
.ui-button--outline            /* Outline variant */
.ui-button--ghost              /* Ghost variant */
.ui-button--success            /* Success variant */
.ui-button--danger             /* Danger variant */
.ui-button--warning            /* Warning variant */
.ui-button--sm                 /* Small size */
.ui-button--md                 /* Medium size */
.ui-button--lg                 /* Large size */
.ui-button--full-width         /* Full width */
.ui-button--icon               /* Icon button */
.ui-button--loading            /* Loading state */
.ui-button--block              /* Block display */
.ui-button:disabled            /* Disabled state */
.ui-button:focus-visible       /* Focus state */
.ui-button:hover               /* Hover state */
.ui-button:active              /* Active/pressed state */
.ui-button-spinner             /* Loading spinner animation */
```

## Responsive Design

Button sizes adapt on smaller screens:
- Desktop (>768px): Full sizing as specified
- Tablet (480-768px): Slightly reduced padding
- Mobile (<480px): Optimized for touch with appropriate spacing

## Best Practices

1. **Use Appropriate Variants**
   - Primary: Main CTAs, form submission
   - Secondary: Alternative actions
   - Danger: Destructive operations (always require confirmation)
   - Ghost: Navigation, minimal prominence

2. **Size Properly**
   - `sm`: Inline actions, compact spaces
   - `md`: Forms, modal dialogs (default)
   - `lg`: Primary page actions, hero sections

3. **Icon + Text**
   ```tsx
   <Button>
     <Plus size={18} style={{ marginRight: '4px' }} />
     Add Item
   </Button>
   ```

4. **Provide Feedback**
   - Use loading state during async operations
   - Disable buttons when appropriate
   - Show success/error states after actions

5. **Spacing**
   - Use ButtonGroup for organized button layouts
   - Maintain consistent gap (12px recommended)
   - Full-width for mobile-first designs

6. **Avoid**
   - Multiple primary buttons (only one main action per context)
   - Buttons that toggle rapidly (debounce if needed)
   - Unclear button labels (use action verbs: Save, Delete, etc.)
   - Mixing too many variants on same page

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- IE11: Not supported (modern features)

## Migration Guide

### From Old Button Component

**Before:**
```tsx
<button className="btn btn-primary">Click</button>
```

**After:**
```tsx
<Button variant="primary">Click</Button>
```

### From Hardcoded Buttons

**Before:**
```tsx
<button
  style={{
    backgroundColor: '#2563eb',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer'
  }}
>
  Click
</button>
```

**After:**
```tsx
<Button variant="primary" size="md">Click</Button>
```

---

**Last Updated:** 2024
**Status:** Production Ready v2.0
**Design System:** White + Blue Theme
