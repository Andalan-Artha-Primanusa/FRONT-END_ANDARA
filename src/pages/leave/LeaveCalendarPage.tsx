import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, PageHeader } from "@/shared/ui";
import { showToast } from '@/shared/ui/toast';
import { getLeaveCalendar } from "@/features/leave/api/leave.service";

import { ChevronLeft, ChevronRight, CircleCheckBig, CircleX, Clock3, Calendar, RefreshCw } from "lucide-react";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "./LeaveShared.css";
import "./LeavePages.css";

interface CalendarEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  status: string;
}

const LeaveCalendarPage = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // April 2026

  const [loading, setLoading] = useState(false);

  // Calculate statistics
  const stats = useMemo(() => {
    const approved = events.filter(e => e.status === 'approved').length;
    const rejected = events.filter(e => e.status === 'rejected').length;
    const pending = events.filter(e => e.status === 'pending').length;

    return { approved, rejected, pending, total: events.length };
  }, [events]);

  const loadCalendar = async () => {
    setLoading(true);

    try {
      const result = await getLeaveCalendar();

      const parsedEvents = result.items.map((item: any) => ({
        id: item.id,
        title: item.title,
        start: item.start,
        end: item.end,
        status: item.status,
      }));
      
      setEvents(parsedEvents);
    } catch {
      // Error handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCalendar();
  }, []);

  // Generate calendar days
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (day: number, month: number, year: number) => {
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    return events.filter(event => {
      const eventStart = event.start.split('T')[0];
      const eventEnd = event.end.split('T')[0];
      return dateStr >= eventStart && dateStr <= eventEnd;
    });
  };

  const getEventColor = (status: string) => {
    switch(status) {
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return 'var(--color-primary)';
    }
  };

  const monthDays = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: monthDays }, (_, i) => i + 1);
  const previousDays = Array.from({ length: firstDay }, (_, i) => i);

  const monthName = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _leaveSummaryCards = [
    {
      label: 'Total Pengajuan',
      subtitle: 'Semua data pengajuan cuti',
      value: String(stats.total),
      change: 'Ringkasan keseluruhan',
      tone: 'blue' as const,
      icon: Calendar,
    },
    {
      label: 'Menunggu',
      subtitle: 'Menunggu persetujuan',
      value: String(stats.pending),
      change: 'Perlu tindakan persetujuan',
      tone: 'orange' as const,
      icon: Clock3,
    },
    {
      label: 'Disetujui',
      subtitle: 'Pengajuan disetujui',
      value: String(stats.approved),
      change: 'Status final berhasil',
      tone: 'green' as const,
      icon: CircleCheckBig,
    },
    {
      label: 'Ditolak',
      subtitle: 'Pengajuan ditolak',
      value: String(stats.rejected),
      change: 'Perlu revisi atau tindak lanjut',
      tone: 'red' as const,
      icon: CircleX,
    },
  ];

  return (
    <div className="crud-page">
      <PageHeader
        title="Kalender Cuti"
        subtitle="Visual kalender pengajuan cuti dengan analitik yang konsisten."
        badge={{ icon: Calendar, label: "Pusat Kalender" }}
        scope
        actions={
          <button className="btn-outline" onClick={() => void loadCalendar()}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Segarkan
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="leave-requests-wrapper">
        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Total Pengajuan</p>
              <p className="leave-summary-subtitle">Semua data cuti</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-blue">
              <Calendar size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-blue">{stats.total}</div>
          <p className="leave-summary-trend">Ringkasan keseluruhan</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Menunggu</p>
              <p className="leave-summary-subtitle">Menunggu persetujuan</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-orange">
              <Clock3 size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-orange">{stats.pending}</div>
          <p className="leave-summary-trend">Perlu tindakan persetujuan</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Disetujui</p>
              <p className="leave-summary-subtitle">Pengajuan disetujui</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-green">
              <CircleCheckBig size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-green">{stats.approved}</div>
          <p className="leave-summary-trend">Status final berhasil</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Ditolak</p>
              <p className="leave-summary-subtitle">Pengajuan ditolak</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-red">
              <CircleX size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-red">{stats.rejected}</div>
          <p className="leave-summary-trend">Perlu revisi</p>
        </div>
      </div>

      {/* Analytics Title Card */}
      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Kalender Cuti</h2>
            <p className="analytics-subtitle">Visual kalender pengajuan cuti</p>
          </div>
        </div>
      </Card>

      <div className="crud-table-section">
        {/* Calendar Grid */}
        <Card className="crud-table-card">
          <div className="calendar-header">
            <button 
              className="calendar-nav-btn"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="calendar-month">{monthName}</h2>
            <button 
              className="calendar-nav-btn"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day headers */}
          <div className="calendar-grid">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
              <div key={day} className="calendar-day-header">{day}</div>
            ))}

            {/* Previous month days */}
            {previousDays.map((_, i) => (
              <div key={`prev-${i}`} className="calendar-day empty"></div>
            ))}

            {/* Current month days */}
            {days.map(day => {
              const dayEvents = getEventsForDate(day, currentDate.getMonth(), currentDate.getFullYear());
              const hasEvents = dayEvents.length > 0;
              
              return (
                <div 
                  key={day} 
                  className={`calendar-day ${hasEvents ? 'has-events' : ''}`}
                  title={dayEvents.map(e => e.title).join('\n')}
                >
                  <span className="calendar-day-number">{day}</span>
                  {hasEvents && (
                    <div className="calendar-day-events">
                      {dayEvents.slice(0, 2).map(event => (
                        <div 
                          key={event.id}
                          className="calendar-event-dot"
                          style={{ backgroundColor: getEventColor(event.status) }}
                          title={event.title}
                        />
                      ))}
                      {dayEvents.length > 2 && <span className="calendar-event-more">+{dayEvents.length - 2}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="calendar-legend">
            <div className="legend-item">
              <div className="legend-color approved"></div>
              <span>Disetujui</span>
            </div>
            <div className="legend-item">
              <div className="legend-color pending"></div>
              <span>Menunggu</span>
            </div>
            <div className="legend-item">
              <div className="legend-color rejected"></div>
              <span>Ditolak</span>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
};

export default LeaveCalendarPage;
