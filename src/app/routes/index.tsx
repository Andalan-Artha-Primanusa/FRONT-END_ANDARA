import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { lazy, type ReactNode } from "react";
import { getRoleBasedDashboardPathFromStorage } from "@/features/auth/utils/roleRedirect";
import { ProtectedRoute } from "./ProtectedRoute";
import { MenuRouteGuard } from "./MenuRouteGuard";
import { useAuthSession } from "./useAuthSession";
import { LoadingState } from "@/shared/ui/DataStateDisplay";
import LoginPage from "../../pages/auth/login/LoginPage";
import GoogleCallbackPage from "../../pages/auth/login/GoogleCallbackPage";
import ForgotPasswordPage from "../../pages/auth/login/ForgotPasswordPage";
import ResetPasswordPage from "../../pages/auth/login/ResetPasswordPage";
import RegisterPage from "../../pages/auth/register/RegisterPage";
import DashboardLayout from "../layouts/DashboardLayout";

const NotFoundPage = lazy(() => import("../../pages/error/NotFoundPage"));
const OverviewPage = lazy(() => import("../../pages/dashboard/overview/OverviewPage"));
const CustomDashboardPage = lazy(() => import("../../pages/dashboard/custom/CustomDashboardPage"));
const EmployeeDashboardPage = lazy(() => import("../../pages/dashboard/EmployeeDashboardPage"));
const EmployeesPage = lazy(() => import("../../pages/employee/EmployeesPage"));
const EmployeeDetailPage = lazy(() => import("../../pages/employee/EmployeeDetailPage"));
const EmployeeCreatePage = lazy(() => import("../../pages/employee/EmployeeCreatePage"));
const EmployeeEditPage = lazy(() => import("../../pages/employee/EmployeeEditPage"));
const ProfilesPage = lazy(() => import("../../pages/profiles/ProfilesPage"));
const AttendanceOverviewPage = lazy(() => import("../../pages/attendance/AttendanceOverviewPage"));
const AttendanceCheckInPage = lazy(() => import("../../pages/attendance/AttendanceCheckInPage"));
const AttendanceCheckOutPage = lazy(() => import("../../pages/attendance/AttendanceCheckOutPage"));
const AttendanceHistoryPage = lazy(() => import("../../pages/attendance/AttendanceHistoryPage"));
const AttendanceTodayPage = lazy(() => import("../../pages/attendance/AttendanceTodayPage"));
const OvertimePage = lazy(() => import("../../pages/attendance/OvertimePage"));
const AttendanceReportsPage = lazy(() => import("../../pages/attendance/AttendanceReportsPage"));
const AttendanceMonitoringPage = lazy(() => import("../../pages/attendance/AttendanceMonitoringPage"));
const LeaveRequestsPage = lazy(() => import("../../pages/leave/LeaveRequestsPage"));
const CreateLeavePage = lazy(() => import("../../pages/leave/CreateLeavePage"));
const UpdateLeavePage = lazy(() => import("../../pages/leave/UpdateLeavePage"));
const LeaveBalancePage = lazy(() => import("../../pages/leave/LeaveBalancePage"));
const LeaveCalendarPage = lazy(() => import("../../pages/leave/LeaveCalendarPage"));
const LeaveApprovalPage = lazy(() => import("../../pages/leave/LeaveApprovalPage"));
const MyLeavesPage = lazy(() => import("../../pages/ess/MyLeavesPage"));
const LeavePolicyPage = lazy(() => import("../../pages/admin/LeavePolicyPage"));
const LeavePolicyFormPage = lazy(() => import("../../pages/admin/LeavePolicyFormPage"));
const LeaveTypePage = lazy(() => import("../../pages/admin/LeaveTypePage"));
const LeaveTypeFormPage = lazy(() => import("../../pages/admin/LeaveTypeFormPage"));
const PayrollDashboard = lazy(() => import("../../pages/payroll/PayrollDashboard"));
const PayrollManagementPage = lazy(() => import("../../pages/payroll/PayrollManagementPage"));
const PayrollListPage = lazy(() => import("../../pages/payroll/PayrollListPage"));
const PayrollProcessPage = lazy(() => import("../../pages/payroll/PayrollProcessPage"));
const PayrollDetailsPage = lazy(() => import("../../pages/payroll/PayrollDetailsPage"));
const PayrollReportsPage = lazy(() => import("../../pages/payroll/PayrollReportsPage"));
const MyPayrollPage = lazy(() => import("../../pages/ess/MyPayrollPage"));
const AdminReimbursementsPage = lazy(() => import("../../pages/admin/AdminReimbursementsPage"));
const MyReimbursementsPage = lazy(() => import("../../pages/ess/MyReimbursementsPage"));
const KpiListPage = lazy(() => import("../../pages/admin/AdminKpiPage"));
const KpiFormPage = lazy(() => import("../../pages/admin/KpiFormPage"));
const MyKpiPage = lazy(() => import("../../pages/ess/MyKpiPage"));
const TrainingManagementPage = lazy(() => import("../../pages/admin/TrainingManagementPage"));
const TrainingFormPage = lazy(() => import("../../pages/admin/TrainingFormPage"));
const MyTrainingsPage = lazy(() => import("../../pages/ess/MyTrainingsPage"));
const CompetencyMatrixPage = lazy(() => import("../../pages/admin/CompetencyMatrixPage"));
const MyCompetenciesPage = lazy(() => import("../../pages/ess/MyCompetenciesPage"));
const AssetManagementPage = lazy(() => import("../../pages/admin/AssetManagementPage"));
const AssetFormPage = lazy(() => import("../../pages/admin/AssetFormPage"));
const MyAssetsPage = lazy(() => import("../../pages/ess/MyAssetsPage"));
const MyDocumentsPage = lazy(() => import("../../pages/ess/MyDocumentsPage"));
const ApprovalFlowPage = lazy(() => import("../../pages/admin/ApprovalFlowPage"));
const OrgChartPage = lazy(() => import("../../pages/admin/OrgChartPage"));
const LocationsPage = lazy(() => import("../../pages/locations/LocationsPage"));
const CreateLocationPage = lazy(() => import("../../pages/locations/CreateLocationPage"));
const EditLocationPage = lazy(() => import("../../pages/locations/EditLocationPage"));
const WorkSchedulesPage = lazy(() => import("../../pages/work-schedule/WorkSchedulesPage"));
const WorkScheduleCreatePage = lazy(() => import("../../pages/work-schedule/WorkScheduleCreatePage"));
const WorkScheduleEditPage = lazy(() => import("../../pages/work-schedule/WorkScheduleEditPage"));
const NotificationsPage = lazy(() => import("../../pages/notifications/NotificationsPage"));
const ReportsDashboardPage = lazy(() => import("../../pages/reports/ReportsDashboardPage"));
const AdminUsersPage = lazy(() => import("../../pages/admin/AdminUsersPage"));
const AdminUserCreatePage = lazy(() => import("../../pages/admin/AdminUserCreatePage"));
const AdminRolesPage = lazy(() => import("../../pages/admin/AdminRolesPage"));
const AdminPermissionsPage = lazy(() => import("../../pages/admin/AdminPermissionsPage"));
const MenuPermissionsPage = lazy(() => import("../../pages/admin/MenuPermissionsPage"));
const AdminUserAssignRolesPage = lazy(() => import("../../pages/admin/AdminUserAssignRolesPage"));
const AdminRoleAssignPermissionsPage = lazy(() => import("../../pages/admin/AdminRoleAssignPermissionsPage"));
const AdminRoleFormPage = lazy(() => import("../../pages/admin/AdminRoleFormPage"));
const AdminNotificationsPage = lazy(() => import("../../pages/admin/AdminNotificationsPage"));
const AdminEmailSendPage = lazy(() => import("../../pages/admin/AdminEmailSendPage"));
const AdminEmailNotificationsPage = lazy(() => import("../../pages/admin/AdminEmailNotificationsPage"));
const AdminAuditLogsPage = lazy(() => import("../../pages/admin/AdminAuditLogsPage"));
const AdminImportPage = lazy(() => import("../../pages/admin/AdminImportPage"));
const MasterDataPage = lazy(() => import("../../pages/admin/MasterDataPage"));
const CompanySettingsPage = lazy(() => import("../../pages/admin/CompanySettingsPage"));
const CompanyManagementPage = lazy(() => import("../../pages/admin/CompanyManagementPage"));
const CompanyFormPage = lazy(() => import("../../pages/admin/CompanyFormPage"));
const NotificationSettingsPage = lazy(() => import("../../pages/admin/NotificationSettingsPage"));
const MyProfilePage = lazy(() => import("../../pages/profiles/MyProfilePage"));
const AndalanMobilePage = lazy(() => import("../../pages/andalan/AndalanMobilePage"));
const AndalanMobileFormPage = lazy(() => import("../../pages/andalan/AndalanMobileFormPage"));
const AndalanKpiPage = lazy(() => import("../../pages/andalan/AndalanKpiPage"));
const AndalanKpiFormPage = lazy(() => import("../../pages/andalan/AndalanKpiFormPage"));
const AndalanWorkforcePage = lazy(() => import("../../pages/andalan/AndalanWorkforcePage"));
const AndalanWorkforceFormPage = lazy(() => import("../../pages/andalan/AndalanWorkforceFormPage"));
const ForceResetPasswordPage = lazy(() => import("../../pages/auth/login/ForceResetPasswordPage"));

const FullPageLoader = () => (
  <div style={{ display: "flex", height: "100vh", width: "100vw", alignItems: "center", justifyContent: "center" }}>
    <LoadingState message="Memeriksa sesi..." />
  </div>
);

const RootRedirect = () => {
  const authStatus = useAuthSession();
  const dashboardPath = getRoleBasedDashboardPathFromStorage();

  if (authStatus === "checking") return <FullPageLoader />;
  return authStatus === "authenticated" ? <Navigate to={dashboardPath} replace /> : <Navigate to="/login" replace />;
};

const GuestRoute = () => {
  const authStatus = useAuthSession();
  const dashboardPath = getRoleBasedDashboardPathFromStorage();

  if (authStatus === "checking") return <FullPageLoader />;
  return authStatus === "authenticated" ? <Navigate to={dashboardPath} replace /> : <Outlet />;
};

const layoutRoute = (path: string, element: ReactNode) => ({
  path,
  element: <DashboardLayout />,
  children: [{ index: true, element }],
});

export const router = createBrowserRouter([
  { path: "/", element: <RootRedirect /> },
  {
    element: <GuestRoute />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/auth/google/callback", element: <GoogleCallbackPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/force-reset-password", element: <ForceResetPasswordPage /> },
      layoutRoute("/dashboard", <OverviewPage />),
      layoutRoute("/dashboard/custom", <CustomDashboardPage />),
      layoutRoute("/employee-dashboard", <MenuRouteGuard menuKey="employee-dashboard"><EmployeeDashboardPage /></MenuRouteGuard>),
      // Temporary presentation mode: employee read-only page is not gated by
      // the frontend menu/RBAC guard. Backend writes remain protected.
      layoutRoute("/employees", <EmployeesPage />),
      layoutRoute("/employees/add", <MenuRouteGuard menuKey="workforce.employees"><EmployeeCreatePage /></MenuRouteGuard>),
      layoutRoute("/employees/update/:id", <MenuRouteGuard menuKey="workforce.employees"><EmployeeEditPage /></MenuRouteGuard>),
      layoutRoute("/employees/:id", <EmployeeDetailPage />),
      layoutRoute("/profiles", <ProfilesPage />),
      layoutRoute("/profiles/view/:id", <ProfilesPage />),
      layoutRoute("/my/profile", <MenuRouteGuard menuKey="ess.profile"><MyProfilePage /></MenuRouteGuard>),
      layoutRoute("/andalan/mobile/news/create", <AndalanMobileFormPage />),
      layoutRoute("/andalan/mobile/news/edit/:id", <AndalanMobileFormPage />),
      layoutRoute("/andalan/mobile/roster/create", <AndalanMobileFormPage />),
      layoutRoute("/andalan/mobile/roster/edit/:id", <AndalanMobileFormPage />),
      layoutRoute("/andalan/mobile", <AndalanMobilePage />),
      layoutRoute("/andalan/mobile/news", <AndalanMobilePage />),
      layoutRoute("/andalan/mobile/roster", <AndalanMobilePage />),
      layoutRoute("/andalan/mobile/leave", <AndalanMobilePage />),
      layoutRoute("/andalan/mobile/reimburse", <AndalanMobilePage />),
      layoutRoute("/andalan/mobile/trips", <AndalanMobilePage />),
      layoutRoute("/andalan/kpi/create", <AndalanKpiFormPage />),
      layoutRoute("/andalan/kpi/edit/:id", <AndalanKpiFormPage />),
      layoutRoute("/andalan/kpi", <AndalanKpiPage />),
      layoutRoute("/andalan/workforce/payroll/create", <AndalanWorkforceFormPage />),
      layoutRoute("/andalan/workforce/payroll/edit/:id", <AndalanWorkforceFormPage />),
      layoutRoute("/andalan/workforce/training/create", <AndalanWorkforceFormPage />),
      layoutRoute("/andalan/workforce/training/edit/:id", <AndalanWorkforceFormPage />),
      layoutRoute("/andalan/workforce/assets/create", <AndalanWorkforceFormPage />),
      layoutRoute("/andalan/workforce/assets/edit/:id", <AndalanWorkforceFormPage />),
      layoutRoute("/andalan/workforce/overtime/create", <AndalanWorkforceFormPage />),
      layoutRoute("/andalan/workforce/overtime/edit/:id", <AndalanWorkforceFormPage />),
      layoutRoute("/andalan/workforce/documents/create", <AndalanWorkforceFormPage />),
      layoutRoute("/andalan/workforce/documents/edit/:id", <AndalanWorkforceFormPage />),
      layoutRoute("/andalan/workforce/payroll", <AndalanWorkforcePage />),
      layoutRoute("/andalan/workforce/training", <AndalanWorkforcePage />),
      layoutRoute("/andalan/workforce/assets", <AndalanWorkforcePage />),
      layoutRoute("/andalan/workforce/overtime", <AndalanWorkforcePage />),
      layoutRoute("/andalan/workforce/documents", <AndalanWorkforcePage />),
      layoutRoute("/attendance", <AttendanceOverviewPage />),
      layoutRoute("/attendance/check-in", <MenuRouteGuard menuKey="ess.attendance.check-in"><AttendanceCheckInPage /></MenuRouteGuard>),
      layoutRoute("/attendance/check-out", <MenuRouteGuard menuKey="ess.attendance.check-out"><AttendanceCheckOutPage /></MenuRouteGuard>),
      layoutRoute("/attendance/history", <MenuRouteGuard menuKey="ess.attendance.history"><AttendanceHistoryPage /></MenuRouteGuard>),
      layoutRoute("/attendance/today", <AttendanceTodayPage />),
      layoutRoute("/attendance/overtime", <OvertimePage />),
      layoutRoute("/attendance/reports", <AttendanceReportsPage />),
      layoutRoute("/attendance/monitoring", <AttendanceMonitoringPage />),
      layoutRoute("/my/overtime", <MenuRouteGuard menuKey="ess.overtime"><OvertimePage /></MenuRouteGuard>),
      layoutRoute("/leave/requests", <LeaveRequestsPage />),
      layoutRoute("/leave/requests/create", <CreateLeavePage />),
      layoutRoute("/leave/request", <CreateLeavePage />),
      layoutRoute("/leave/requests/edit/:id", <UpdateLeavePage />),
      layoutRoute("/leave/requests/view/:id", <UpdateLeavePage />),
      layoutRoute("/leave/request/:id", <UpdateLeavePage />),
      layoutRoute("/leave/approval", <MenuRouteGuard menuKey="leave.approve"><LeaveApprovalPage /></MenuRouteGuard>),
      layoutRoute("/leave/calendar", <LeaveCalendarPage />),
      layoutRoute("/leave/balance", <LeaveBalancePage />),
      layoutRoute("/leave/my-leave", <MenuRouteGuard menuKey="ess.leave"><MyLeavesPage /></MenuRouteGuard>),
      {
        path: "/leave/policy",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <MenuRouteGuard menuKey="leave.policy"><LeavePolicyPage /></MenuRouteGuard> },
          { path: "create", element: <LeavePolicyFormPage /> },
          { path: "edit/:id", element: <LeavePolicyFormPage /> },
        ],
      },
      {
        path: "/leave/type",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <MenuRouteGuard menuKey="leave.policy"><LeaveTypePage /></MenuRouteGuard> },
          { path: "create", element: <LeaveTypeFormPage /> },
          { path: "edit/:id", element: <LeaveTypeFormPage /> },
        ],
      },
      layoutRoute("/payroll", <MenuRouteGuard menuKey="compensation.payroll"><PayrollDashboard /></MenuRouteGuard>),
      layoutRoute("/payroll/list", <MenuRouteGuard menuKey="compensation.payroll"><PayrollListPage /></MenuRouteGuard>),
      layoutRoute("/payroll/process", <Navigate to="/payroll/process/generate" replace />),
      layoutRoute("/payroll/process/generate", <MenuRouteGuard menuKey="compensation.payroll"><PayrollProcessPage mode="generate" showTabs={false} /></MenuRouteGuard>),
      layoutRoute("/payroll/process/approval", <MenuRouteGuard menuKey="compensation.payroll"><PayrollProcessPage mode="approve" showTabs={false} /></MenuRouteGuard>),
      layoutRoute("/payroll/process/payment", <MenuRouteGuard menuKey="compensation.payroll"><PayrollProcessPage mode="payment" showTabs={false} /></MenuRouteGuard>),
      layoutRoute("/payroll/run", <MenuRouteGuard menuKey="compensation.payroll"><PayrollManagementPage /></MenuRouteGuard>),
      layoutRoute("/payroll/component", <Navigate to="/payroll/component/allowance" replace />),
      layoutRoute("/payroll/component/allowance", <MenuRouteGuard menuKey="compensation.payroll"><PayrollDetailsPage componentMode="allowance" showTabs={false} /></MenuRouteGuard>),
      layoutRoute("/payroll/component/deduction", <MenuRouteGuard menuKey="compensation.payroll"><PayrollDetailsPage componentMode="deduction" showTabs={false} /></MenuRouteGuard>),
      layoutRoute("/payroll/reports", <MenuRouteGuard menuKey="compensation.payroll"><PayrollReportsPage /></MenuRouteGuard>),
      layoutRoute("/my/payroll", <MenuRouteGuard menuKey="ess.payslip"><MyPayrollPage /></MenuRouteGuard>),
      layoutRoute("/reimbursements", <MenuRouteGuard menuKey="compensation.reimbursement"><AdminReimbursementsPage /></MenuRouteGuard>),
      layoutRoute("/my/reimbursements", <MenuRouteGuard menuKey="ess.reimbursement"><MyReimbursementsPage /></MenuRouteGuard>),
      {
        path: "/kpis",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <MenuRouteGuard menuKey="performance-dev.kpi"><KpiListPage /></MenuRouteGuard> },
          { path: "create", element: <MenuRouteGuard menuKey="performance-dev.kpi"><KpiFormPage /></MenuRouteGuard> },
          { path: "edit/:id", element: <MenuRouteGuard menuKey="performance-dev.kpi"><KpiFormPage /></MenuRouteGuard> },
        ],
      },
      layoutRoute("/my/kpi", <MenuRouteGuard menuKey="ess.kpi"><MyKpiPage /></MenuRouteGuard>),
      layoutRoute("/training", <Navigate to="/training/programs" replace />),
      layoutRoute("/training/programs", <MenuRouteGuard menuKey="performance-dev.training"><TrainingManagementPage /></MenuRouteGuard>),
      layoutRoute("/training/programs/create", <MenuRouteGuard menuKey="performance-dev.training"><TrainingFormPage /></MenuRouteGuard>),
      layoutRoute("/training/programs/edit/:id", <MenuRouteGuard menuKey="performance-dev.training"><TrainingFormPage /></MenuRouteGuard>),
      layoutRoute("/my/trainings", <MenuRouteGuard menuKey="ess.training"><MyTrainingsPage /></MenuRouteGuard>),
      layoutRoute("/competencies", <MenuRouteGuard menuKey="performance-dev.competency"><CompetencyMatrixPage /></MenuRouteGuard>),
      layoutRoute("/my/competencies", <MenuRouteGuard menuKey="ess.competency"><MyCompetenciesPage /></MenuRouteGuard>),
      layoutRoute("/assets", <MenuRouteGuard menuKey="assets"><AssetManagementPage /></MenuRouteGuard>),
      layoutRoute("/assets/create", <MenuRouteGuard menuKey="assets"><AssetFormPage /></MenuRouteGuard>),
      layoutRoute("/assets/edit/:id", <MenuRouteGuard menuKey="assets"><AssetFormPage /></MenuRouteGuard>),
      layoutRoute("/my/assets", <MenuRouteGuard menuKey="ess.assets"><MyAssetsPage /></MenuRouteGuard>),
      layoutRoute("/my/documents", <MenuRouteGuard menuKey="ess.documents"><MyDocumentsPage /></MenuRouteGuard>),
      layoutRoute("/approval-flows", <MenuRouteGuard menuKey="approval-center"><ApprovalFlowPage /></MenuRouteGuard>),
      layoutRoute("/organization/chart", <OrgChartPage />),
      layoutRoute("/locations", <MenuRouteGuard menuKey="admin.locations"><LocationsPage /></MenuRouteGuard>),
      layoutRoute("/locations/create", <MenuRouteGuard menuKey="admin.locations"><CreateLocationPage /></MenuRouteGuard>),
      layoutRoute("/locations/edit/:id", <MenuRouteGuard menuKey="admin.locations"><EditLocationPage /></MenuRouteGuard>),
      layoutRoute("/work-schedules", <MenuRouteGuard menuKey="admin.work-schedules"><WorkSchedulesPage /></MenuRouteGuard>),
      layoutRoute("/work-schedules/add", <MenuRouteGuard menuKey="admin.work-schedules"><WorkScheduleCreatePage /></MenuRouteGuard>),
      layoutRoute("/work-schedules/edit/:id", <MenuRouteGuard menuKey="admin.work-schedules"><WorkScheduleEditPage /></MenuRouteGuard>),
      layoutRoute("/notifications", <MenuRouteGuard menuKey="ess.notifications"><NotificationsPage /></MenuRouteGuard>),
      layoutRoute("/reports", <Navigate to="/reports/dashboard-summary" replace />),
      layoutRoute("/reports/dashboard-summary", <ReportsDashboardPage />),
      layoutRoute("/admin/users", <MenuRouteGuard menuKey="admin.users"><AdminUsersPage /></MenuRouteGuard>),
      layoutRoute("/admin/users/create", <MenuRouteGuard menuKey="admin.users"><AdminUserCreatePage /></MenuRouteGuard>),
      layoutRoute("/admin/users/assign-roles", <MenuRouteGuard menuKey="admin.users"><AdminUserAssignRolesPage /></MenuRouteGuard>),
      layoutRoute("/admin/roles", <MenuRouteGuard menuKey="admin.roles"><AdminRolesPage /></MenuRouteGuard>),
      layoutRoute("/admin/roles/create", <MenuRouteGuard menuKey="admin.roles"><AdminRoleFormPage /></MenuRouteGuard>),
      layoutRoute("/admin/roles/edit/:id", <MenuRouteGuard menuKey="admin.roles"><AdminRoleFormPage /></MenuRouteGuard>),
      layoutRoute("/admin/roles/assign-permissions", <MenuRouteGuard menuKey="admin.roles"><AdminRoleAssignPermissionsPage /></MenuRouteGuard>),
      layoutRoute("/admin/permissions", <MenuRouteGuard menuKey="admin.permissions"><AdminPermissionsPage /></MenuRouteGuard>),
      layoutRoute("/admin/menu-permissions", <MenuRouteGuard menuKey="admin.menu-permissions"><MenuPermissionsPage /></MenuRouteGuard>),
      layoutRoute("/admin/notifications", <MenuRouteGuard menuKey="admin.notifications"><AdminNotificationsPage /></MenuRouteGuard>),
      layoutRoute("/admin/notifications/email-send", <MenuRouteGuard menuKey="admin.email-send"><AdminEmailSendPage /></MenuRouteGuard>),
      layoutRoute("/admin/notifications/email-logs", <MenuRouteGuard menuKey="admin.email-logs"><AdminEmailNotificationsPage /></MenuRouteGuard>),
      layoutRoute("/admin/audit-logs", <MenuRouteGuard menuKey="admin.audit-logs"><AdminAuditLogsPage /></MenuRouteGuard>),
      layoutRoute("/admin/import", <MenuRouteGuard menuKey="admin.import"><AdminImportPage /></MenuRouteGuard>),
      layoutRoute("/organization/master-data", <Navigate to="/organization/master-data/departments" replace />),
      layoutRoute("/organization/master-data/departments", <MenuRouteGuard menuKey="admin.departments"><MasterDataPage /></MenuRouteGuard>),
      layoutRoute("/organization/master-data/positions", <MenuRouteGuard menuKey="admin.positions"><MasterDataPage /></MenuRouteGuard>),
      layoutRoute("/settings/company", <MenuRouteGuard menuKey="admin.company"><CompanySettingsPage /></MenuRouteGuard>),
      layoutRoute("/companies", <MenuRouteGuard menuKey="admin.companies"><CompanyManagementPage /></MenuRouteGuard>),
      layoutRoute("/companies/create", <MenuRouteGuard menuKey="admin.companies"><CompanyFormPage /></MenuRouteGuard>),
      layoutRoute("/companies/:id/edit", <MenuRouteGuard menuKey="admin.companies"><CompanyFormPage /></MenuRouteGuard>),
      layoutRoute("/settings/notifications", <MenuRouteGuard menuKey="admin.notification-settings"><NotificationSettingsPage /></MenuRouteGuard>),
      { path: "/settings/master-data/leave-type", element: <Navigate to="/leave/type" replace /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
