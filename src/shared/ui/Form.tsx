import React from 'react';
import './Form.css';

/* ========================================
   FORM INPUT TYPES
   ====================================== */

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  help?: string;
  required?: boolean;
  status?: 'error' | 'success' | 'warning' | 'default';
}

export interface FormTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  help?: string;
  required?: boolean;
  showCharCount?: boolean;
}

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  help?: string;
  required?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

export interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
}

export interface FormRadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
}

export interface FormCheckboxGroupProps {
  label?: string;
  error?: string;
  required?: boolean;
  items: Array<{ value: string; label: string; disabled?: boolean }>;
  value?: string[];
  onChange?: (values: string[]) => void;
}

export interface FormRadioGroupProps {
  label?: string;
  error?: string;
  required?: boolean;
  items: Array<{ value: string; label: string; disabled?: boolean }>;
  value?: string;
  onChange?: (value: string) => void;
}

export interface FormInputAddonProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: string;
}

/* ========================================
   INPUT - Text input field
   ====================================== */

export const Input = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, help, required, status = 'default', className, ...props }, ref) => {
    const statusClass =
      error ? 'ui-input--error' : status === 'success' ? 'ui-input--success' : status === 'warning' ? 'ui-input--warning' : '';

    return (
      <div className={`ui-form-group ${className || ''}`}>
        {label && (
          <label className={`ui-label ${required ? 'ui-label--required' : ''}`}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`ui-input ${statusClass}`}
          aria-label={label || props.placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id}-error` : help ? `${props.id}-help` : undefined}
          {...props}
        />
        {error && (
          <span className="ui-error-text" id={`${props.id}-error`}>
            {error}
          </span>
        )}
        {help && !error && (
          <span className="ui-help-text" id={`${props.id}-help`}>
            {help}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

/* ========================================
   TEXTAREA - Multi-line text input
   ====================================== */

export const TextArea = React.forwardRef<HTMLTextAreaElement, FormTextAreaProps>(
  ({ label, error, help, required, showCharCount, maxLength, className, ...props }, ref) => {
    const [charCount, setCharCount] = React.useState(0);

    return (
      <div className={`ui-form-group ${className || ''}`}>
        {label && (
          <label className={`ui-label ${required ? 'ui-label--required' : ''}`}>
            {label}
            {showCharCount && maxLength && (
              <span className="ui-label-help">
                {charCount}/{maxLength}
              </span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          className={`ui-textarea ${error ? 'ui-input--error' : ''}`}
          maxLength={maxLength}
          onChange={(e) => {
            setCharCount(e.target.value.length);
            props.onChange?.(e);
          }}
          aria-label={label || props.placeholder}
          aria-invalid={!!error}
          {...props}
        />
        {showCharCount && maxLength && (
          <span
            className={`ui-char-count ${
              charCount > maxLength * 0.8
                ? charCount === maxLength
                  ? 'ui-char-count--error'
                  : 'ui-char-count--warning'
                : ''
            }`}
          >
            {charCount}/{maxLength}
          </span>
        )}
        {error && (
          <span className="ui-error-text">{error}</span>
        )}
        {help && !error && (
          <span className="ui-help-text">{help}</span>
        )}
      </div>
    );
  }
);
TextArea.displayName = 'TextArea';

/* ========================================
   SELECT - Dropdown select
   ====================================== */

export const Select = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, help, required, options, className, ...props }, ref) => {
    return (
      <div className={`ui-form-group ${className || ''}`}>
        {label && (
          <label className={`ui-label ${required ? 'ui-label--required' : ''}`}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`ui-select ${error ? 'ui-input--error' : ''}`}
          aria-label={label}
          aria-invalid={!!error}
          {...props}
        >
          <option value="">-- Select an option --</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span className="ui-error-text">{error}</span>
        )}
        {help && !error && (
          <span className="ui-help-text">{help}</span>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

/* ========================================
   CHECKBOX - Single checkbox
   ====================================== */

export const Checkbox = React.forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, required, className, ...props }, ref) => {
    const uid = React.useId();
    const checkboxId = props.id || `checkbox-${uid}`;
    return (
      <div className={`ui-checkbox-item ${className || ''}`}>
        <input
          ref={ref}
          type="checkbox"
          className="ui-checkbox"
          id={checkboxId}
          {...props}
        />
        {label && (
          <label htmlFor={checkboxId} className={`${required ? 'ui-label--required' : ''}`}>
            {label}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

/* ========================================
   CHECKBOX GROUP - Multiple checkboxes
   ====================================== */

export const CheckboxGroup: React.FC<FormCheckboxGroupProps> = ({
  label,
  error,
  required,
  items,
  value = [],
  onChange,
}) => {
  const handleChange = (itemValue: string, checked: boolean) => {
    const newValue = checked ? [...value, itemValue] : value.filter((v) => v !== itemValue);
    onChange?.(newValue);
  };

  return (
    <div className="ui-form-group">
      {label && (
        <label className={`ui-label ${required ? 'ui-label--required' : ''}`}>
          {label}
        </label>
      )}
      <div className="ui-checkbox-group">
        {items.map((item) => (
          <div key={item.value} className="ui-checkbox-item">
            <input
              type="checkbox"
              id={`checkbox-${item.value}`}
              className="ui-checkbox"
              checked={value.includes(item.value)}
              onChange={(e) => handleChange(item.value, e.target.checked)}
              disabled={item.disabled}
            />
            <label htmlFor={`checkbox-${item.value}`}>{item.label}</label>
          </div>
        ))}
      </div>
      {error && <span className="ui-error-text">{error}</span>}
    </div>
  );
};

/* ========================================
   RADIO BUTTON - Single radio
   ====================================== */

export const Radio = React.forwardRef<HTMLInputElement, FormRadioProps>(
  ({ label, required, className, ...props }, ref) => {
    const uid = React.useId();
    const radioId = props.id || `radio-${uid}`;
    return (
      <div className={`ui-radio-item ${className || ''}`}>
        <input
          ref={ref}
          type="radio"
          className="ui-radio"
          id={radioId}
          {...props}
        />
        {label && (
          <label htmlFor={radioId} className={`${required ? 'ui-label--required' : ''}`}>
            {label}
          </label>
        )}
      </div>
    );
  }
);
Radio.displayName = 'Radio';

/* ========================================
   RADIO GROUP - Multiple radio options
   ====================================== */

export const RadioGroup: React.FC<FormRadioGroupProps> = ({
  label,
  error,
  required,
  items,
  value = '',
  onChange,
}) => {
  const groupName = `radio-group-${React.useId()}`;

  return (
    <div className="ui-form-group">
      {label && (
        <label className={`ui-label ${required ? 'ui-label--required' : ''}`}>
          {label}
        </label>
      )}
      <div className="ui-radio-group">
        {items.map((item) => (
          <div key={item.value} className="ui-radio-item">
            <input
              type="radio"
              name={groupName}
              id={`radio-${item.value}`}
              className="ui-radio"
              value={item.value}
              checked={value === item.value}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={item.disabled}
            />
            <label htmlFor={`radio-${item.value}`}>{item.label}</label>
          </div>
        ))}
      </div>
      {error && <span className="ui-error-text">{error}</span>}
    </div>
  );
};

/* ========================================
   DATE PICKER - Date input
   ====================================== */

export const DatePicker = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, help, required, className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="date"
        label={label}
        error={error}
        help={help}
        required={required}
        className={className}
        {...props}
      />
    );
  }
);
DatePicker.displayName = 'DatePicker';

/* ========================================
   TIME PICKER - Time input
   ====================================== */

export const TimePicker = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, help, required, className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="time"
        label={label}
        error={error}
        help={help}
        required={required}
        className={className}
        {...props}
      />
    );
  }
);
TimePicker.displayName = 'TimePicker';

/* ========================================
   INPUT WITH ADDON - Input with prefix/suffix
   ====================================== */

export const InputAddon = React.forwardRef<HTMLInputElement, FormInputAddonProps>(
  ({ prefix, suffix, error, className, ...props }, ref) => {
    return (
      <div className={`ui-form-group ${className || ''}`}>
        <div className={`ui-input-addon ${error ? 'ui-input--error' : ''}`}>
          {prefix && <span className="ui-input-addon--prefix">{prefix}</span>}
          <input ref={ref} className="ui-input" style={{ border: 'none' }} {...props} />
          {suffix && <span className="ui-input-addon--suffix">{suffix}</span>}
        </div>
        {error && <span className="ui-error-text">{error}</span>}
      </div>
    );
  }
);
InputAddon.displayName = 'InputAddon';

/* ========================================
   FORM - Form container
   ====================================== */

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <form ref={ref} className={className} {...props}>
        {children}
      </form>
    );
  }
);
Form.displayName = 'Form';
