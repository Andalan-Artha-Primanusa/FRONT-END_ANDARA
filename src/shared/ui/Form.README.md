# Form Components Documentation

## Overview
Form components provide standardized, accessible input fields that integrate with the design system's white + blue theme. All components support validation states, help text, and follow WCAG accessibility guidelines.

## Design System Colors & Typography
- Primary Blue: `#2563eb`
- Input Height: 40px (md size)
- Border Color: `#e5e7eb`
- Text Color: `#1f2937` (primary), `#6b7280` (secondary)

## Core Components

### Input
Standard text input field with optional label, error message, and help text.

```tsx
import { Input } from '@/shared/ui';

<Input
  label="Email Address"
  type="email"
  placeholder="you@example.com"
  required
/>
```

**Props:**
```typescript
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;           // Field label
  error?: string;           // Error message to display
  help?: string;            // Help/hint text below field
  required?: boolean;       // Mark label as required
  status?: 'error' | 'success' | 'warning' | 'default';
}
```

**Examples:**
```tsx
// With validation
const [email, setEmail] = useState('');
const [error, setError] = useState('');

<Input
  label="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={error || ''}
  help="We'll never share your email"
  required
/>

// With status
<Input
  label="Username"
  status="success"
/>

// Different input types
<Input type="password" label="Password" />
<Input type="number" label="Age" />
<Input type="tel" label="Phone" />
<Input type="url" label="Website" />
```

### TextArea
Multi-line text input with optional character count.

```tsx
import { TextArea } from '@/shared/ui';

<TextArea
  label="Message"
  placeholder="Your message here..."
  maxLength={500}
  showCharCount
/>
```

**Props:**
```typescript
interface FormTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  help?: string;
  required?: boolean;
  showCharCount?: boolean;  // Show current/max characters
}
```

**Examples:**
```tsx
// With character limit feedback
<TextArea
  label="Bio"
  placeholder="Tell us about yourself"
  maxLength={250}
  showCharCount
  required
/>

// Custom height
<TextArea
  label="Comments"
  style={{ minHeight: '150px' }}
/>
```

### Select
Dropdown menu for selecting from predefined options.

```tsx
import { Select } from '@/shared/ui';

<Select
  label="Country"
  options={[
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
  ]}
  required
/>
```

**Props:**
```typescript
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  help?: string;
  required?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}
```

**Examples:**
```tsx
const [selected, setSelected] = useState('');

<Select
  label="Department"
  value={selected}
  onChange={(e) => setSelected(e.target.value)}
  options={[
    { value: 'eng', label: 'Engineering' },
    { value: 'sales', label: 'Sales' },
    { value: 'hr', label: 'Human Resources', disabled: true },
  ]}
  error={selected === '' ? 'Please select a department' : ''}
/>
```

### Checkbox
Single checkbox input typical for boolean options.

```tsx
import { Checkbox } from '@/shared/ui';

<Checkbox
  id="terms"
  label="I agree to the terms and conditions"
  required
/>
```

**Props:**
```typescript
interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
}
```

### CheckboxGroup
Multiple checkboxes for selecting multiple options.

```tsx
import { CheckboxGroup } from '@/shared/ui';

const [interests, setInterests] = useState(['sports', 'music']);

<CheckboxGroup
  label="Interests"
  items={[
    { value: 'sports', label: 'Sports' },
    { value: 'music', label: 'Music' },
    { value: 'art', label: 'Art' },
    { value: 'tech', label: 'Technology' },
  ]}
  value={interests}
  onChange={setInterests}
/>
```

**Props:**
```typescript
interface FormCheckboxGroupProps {
  label?: string;
  error?: string;
  required?: boolean;
  items: Array<{ value: string; label: string; disabled?: boolean }>;
  value?: string[];
  onChange?: (values: string[]) => void;
}
```

### Radio
Single radio button for boolean choice.

```tsx
import { Radio } from '@/shared/ui';

<Radio
  id="gender-male"
  name="gender"
  value="male"
  label="Male"
/>
<Radio
  id="gender-female"
  name="gender"
  value="female"
  label="Female"
/>
```

### RadioGroup
Multiple radio buttons for selecting one option.

```tsx
import { RadioGroup } from '@/shared/ui';

const [plan, setPlan] = useState('basic');

<RadioGroup
  label="Subscription Plan"
  items={[
    { value: 'basic', label: 'Basic - $0/month' },
    { value: 'pro', label: 'Pro - $9.99/month' },
    { value: 'enterprise', label: 'Enterprise - Custom pricing' },
  ]}
  value={plan}
  onChange={setPlan}
/>
```

**Props:**
```typescript
interface FormRadioGroupProps {
  label?: string;
  error?: string;
  required?: boolean;
  items: Array<{ value: string; label: string; disabled?: boolean }>;
  value?: string;
  onChange?: (value: string) => void;
}
```

### DatePicker
Date input field.

```tsx
import { DatePicker } from '@/shared/ui';

<DatePicker
  label="Birth Date"
  value={birthDate}
  onChange={(e) => setBirthDate(e.target.value)}
/>
```

### TimePicker
Time input field.

```tsx
import { TimePicker } from '@/shared/ui';

<TimePicker
  label="Meeting Time"
  required
/>
```

### InputAddon
Input field with prefix/suffix icons or text.

```tsx
import { InputAddon } from '@/shared/ui';
import { DollarSign } from 'lucide-react';

<InputAddon
  prefix={<DollarSign size={18} />}
  placeholder="Amount"
  type="number"
/>

<InputAddon
  suffix=".com"
  placeholder="example"
  prefix="https://"
/>
```

## Form Container

```tsx
import { Form, Input, Button } from '@/shared/ui';

<Form onSubmit={handleSubmit}>
  <Input
    label="Name"
    placeholder="Your name"
    required
  />
  <Input
    label="Email"
    type="email"
    placeholder="you@example.com"
    required
  />
  <Button type="submit">Submit</Button>
</Form>
```

## Complete Form Example

```tsx
import React, { useState } from 'react';
import {
  Form,
  Input,
  TextArea,
  Select,
  CheckboxGroup,
  RadioGroup,
  Button,
  PrimaryButton,
  SecondaryButton,
} from '@/shared/ui';

export const UserForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    role: 'user',
    skills: [],
    bio: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.department) newErrors.department = 'Department is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      console.log('Form submitted:', formData);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Input
        label="Full Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        required
      />

      <Input
        type="email"
        label="Email Address"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={errors.email}
        help="We'll use this to contact you"
        required
      />

      <Select
        label="Department"
        value={formData.department}
        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
        options={[
          { value: 'eng', label: 'Engineering' },
          { value: 'sales', label: 'Sales' },
          { value: 'hr', label: 'Human Resources' },
        ]}
        error={errors.department}
        required
      />

      <RadioGroup
        label="Role"
        items={[
          { value: 'user', label: 'User' },
          { value: 'admin', label: 'Administrator' },
          { value: 'moderator', label: 'Moderator' },
        ]}
        value={formData.role}
        onChange={(role) => setFormData({ ...formData, role })}
      />

      <CheckboxGroup
        label="Skills"
        items={[
          { value: 'react', label: 'React' },
          { value: 'typescript', label: 'TypeScript' },
          { value: 'nodejs', label: 'Node.js' },
          { value: 'python', label: 'Python' },
        ]}
        value={formData.skills}
        onChange={(skills) => setFormData({ ...formData, skills })}
      />

      <TextArea
        label="Bio"
        value={formData.bio}
        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
        placeholder="Tell us about yourself..."
        showCharCount
        maxLength={300}
      />

      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <PrimaryButton type="submit">Save</PrimaryButton>
        <SecondaryButton type="reset">Clear</SecondaryButton>
      </div>
    </Form>
  );
};
```

## Validation States

### Error State
```tsx
<Input
  label="Email"
  error="Please enter a valid email address"
  status="error"
/>
```

### Success State
```tsx
<Input
  label="Username"
  status="success"
/>
```

### Warning State
```tsx
<Input
  label="Password"
  status="warning"
  help="Password is weak. Add uppercase, numbers, and symbols."
/>
```

## Help Text

```tsx
<Input
  label="Phone Number"
  help="Format: +1 (555) 123-4567"
/>

<Select
  label="Country"
  help="Select your primary location"
  options={[...]}
/>
```

## Responsive Design

All form components are fully responsive:
- Desktop (>768px): Full width with proper spacing
- Tablet (480-768px): Optimized spacing
- Mobile (<480px): Touch-friendly, full-width inputs

```tsx
// For multi-column layouts on desktop
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '16px',
}}>
  <Input label="First Name" />
  <Input label="Last Name" />
</div>
```

## Accessibility Features

- **ARIA Labels**: All inputs have proper `aria-label` or associated `<label>` elements
- **Error Association**: Error messages linked via `aria-describedby`
- **Focus States**: Clear focus indicators (blue outline)
- **Disabled States**: Properly marked and styled
- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Space, Arrow keys)
- **Screen Readers**: Proper semantic HTML and ARIA attributes
- **High Contrast**: Meets WCAG AA standards

```tsx
// Accessible form example
<form>
  <Input
    id="email-input"
    label="Email"
    required
    error={!isValidEmail ? "Invalid email" : ""}
    aria-invalid={!isValidEmail}
    aria-describedby="email-help"
  />
  <span id="email-help">We'll never share your email</span>
</form>
```

## CSS Classes

```css
.ui-form-group          /* Form field container */
.ui-form-group--inline  /* Horizontal layout */
.ui-form-group--row     /* Grid row layout */
.ui-label               /* Field label */
.ui-label--required     /* Required indicator */
.ui-label--disabled     /* Disabled label */
.ui-label-help          /* Help text next to label */
.ui-input               /* Text input */
.ui-input--error        /* Error state */
.ui-input--success      /* Success state */
.ui-input--warning      /* Warning state */
.ui-textarea            /* Text area */
.ui-select              /* Select dropdown */
.ui-select-multiple     /* Multi-select */
.ui-checkbox            /* Checkbox */
.ui-checkbox-group      /* Checkbox container */
.ui-checkbox-item       /* Checkbox item */
.ui-radio               /* Radio button */
.ui-radio-group         /* Radio container */
.ui-radio-item          /* Radio item */
.ui-error-text          /* Error message */
.ui-help-text           /* Help/hint text */
.ui-char-count          /* Character count */
.ui-input-addon         /* Input with prefix/suffix */
.ui-input-addon--prefix /* Prefix element */
.ui-input-addon--suffix /* Suffix element */
```

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support with touch optimization

## Migration Guide

### From HTML Form Elements

**Before:**
```tsx
<input type="text" placeholder="Name" />
<select>
  <option>Select...</option>
</select>
```

**After:**
```tsx
<Input label="Name" placeholder="Name" />
<Select
  label="Choose"
  options={[{ value: 'val', label: 'Option' }]}
/>
```

### From Custom Form Components

**Before:**
```tsx
<div className="form-group">
  <label>Email</label>
  <input type="email" />
  {error && <span className="error">{error}</span>}
</div>
```

**After:**
```tsx
<Input
  label="Email"
  type="email"
  error={error}
/>
```

---

**Last Updated:** 2024
**Status:** Production Ready v2.0
**Design System:** White + Blue Theme
