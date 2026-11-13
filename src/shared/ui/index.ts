/* ========================================
   SHARED UI COMPONENTS INDEX
   Central export file for all UI components
   Design System: White + Blue Theme
   ======================================== */

/* ========================================
   BUTTON COMPONENTS (NEW DESIGN SYSTEM)
   ====================================== */
export {
  Button,
  PrimaryButton,
  SecondaryButton,
  OutlineButton,
  GhostButton,
  SuccessButton,
  DangerButton,
  WarningButton,
  IconButton,
  ButtonGroup,
  type ButtonProps,
} from './Button';

/* ========================================
   FORM COMPONENTS (NEW DESIGN SYSTEM)
   ====================================== */
export {
  Input,
  TextArea,
  Select,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
  DatePicker,
  TimePicker,
  InputAddon,
  Form,
  type FormInputProps,
  type FormTextAreaProps,
  type FormSelectProps,
  type FormCheckboxProps,
  type FormCheckboxGroupProps,
  type FormRadioProps,
  type FormRadioGroupProps,
  type FormInputAddonProps,
  type FormProps,
} from './Form';

/* ========================================
   TABLE COMPONENTS (NEW DESIGN SYSTEM)
   ======================================== */
export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  TableAction,
  TableActions,
} from './Table/Table';

/* ========================================
   CARD COMPONENTS (NEW DESIGN SYSTEM)
   ======================================== */
export {
  Card,
} from './Card';

/* ========================================
   PAGE HEADER (UNIFIED DESIGN SYSTEM)
   ======================================== */
export { PageHeader, type PageHeaderProps, type PageHeaderBadge } from './PageHeader';

export {
  CardHeader,
} from './CardHeader';

export {
  CardBody,
  CardFooter,
  CardStat,
  CardHorizontal,
  CardGrid,
} from './Card/Card';

/* ========================================
   BADGE COMPONENTS (NEW DESIGN SYSTEM)
   ======================================== */
export {
  Badge,
  BadgeGroup,
  StatusBadge,
  LabelBadge,
} from './Badge/Badge';

/* ========================================
   PAGINATION COMPONENTS (NEW DESIGN SYSTEM)
   ======================================== */
export {
  Pagination,
  SimplePagination,
  PaginationWithSize,
} from './Pagination';

/* ========================================
   ALERT COMPONENTS (NEW DESIGN SYSTEM)
   ======================================== */
export {
  Alert,
  InlineAlert,
  SuccessAlert,
  ErrorAlert,
  WarningAlert,
  InfoAlert,
  AlertContainer,
} from './Alert/Alert';

/* ========================================
   SKELETON COMPONENTS (NEW DESIGN SYSTEM)
   ======================================== */
export {
  Skeleton,
  SkeletonGroup,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonTable,
  SkeletonList,
} from './Skeleton';

/* ========================================
   EXISTING COMPONENTS (TO BE REFACTORED)
   Note: These will be gradually refactored to use design tokens
   ======================================== */

// Modal Components
export { Modal } from './Modal';
export { ConfirmDialog } from './ConfirmDialog';

// Tabs Component
export { Tabs } from './Tabs';

// Breadcrumbs Component
export { Breadcrumbs } from './Breadcrumbs';

// Data Display
export { DataStateDisplay } from './DataStateDisplay';
export { RouteSuspenseFallback, type RouteSuspenseFallbackProps } from './RouteSuspenseFallback';

// Protected Components
export { CanAccess as ProtectedComponent } from './ProtectedComponent';
export { ProtectedRoute } from './ProtectedRoute';

/* ========================================
   UTILITY & HELPER EXPORTS
   ======================================== */

// Additional utilities can be exported here as needed
