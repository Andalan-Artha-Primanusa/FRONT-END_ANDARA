import QrAttendanceScanner from "@/features/attendance/components/QrAttendanceScanner";
import AndalanAttendanceCard from "@/features/attendance/components/AndalanAttendanceCard";
import { isLegacyPresentationSession } from "@/shared/config/legacyPresentation";
import "@/pages/dashboard/overview/OverviewPage.css";
import "@/pages/payroll/PayrollShared.css";
import "./AttendancePages.css";

const AttendanceCheckInPage = () => (
  <div className="crud-page attendance-page">
    {isLegacyPresentationSession() ? <AndalanAttendanceCard mode="check-in" /> : <QrAttendanceScanner mode="check-in" />}
  </div>
);

export default AttendanceCheckInPage;
