import QrAttendanceScanner from "@/features/attendance/components/QrAttendanceScanner";
import AndalanAttendanceCard from "@/features/attendance/components/AndalanAttendanceCard";
import { isLegacyPresentationSession } from "@/shared/config/legacyPresentation";
import "@/pages/dashboard/overview/OverviewPage.css";
import "@/pages/payroll/PayrollShared.css";
import "./AttendancePages.css";

const AttendanceCheckOutPage = () => (
  <div className="crud-page attendance-page">
    {isLegacyPresentationSession() ? <AndalanAttendanceCard mode="check-out" /> : <QrAttendanceScanner mode="check-out" />}
  </div>
);

export default AttendanceCheckOutPage;
