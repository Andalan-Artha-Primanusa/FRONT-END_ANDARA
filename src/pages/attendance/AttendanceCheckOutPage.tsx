import AndalanAttendanceCard from "@/features/attendance/components/AndalanAttendanceCard";
import "@/pages/dashboard/overview/OverviewPage.css";
import "@/pages/payroll/PayrollShared.css";
import "./AttendancePages.css";

const AttendanceCheckOutPage = () => (
  <div className="crud-page attendance-page">
    <AndalanAttendanceCard mode="check-out" />
  </div>
);

export default AttendanceCheckOutPage;
