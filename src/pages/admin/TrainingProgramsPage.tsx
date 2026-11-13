import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, GraduationCap, Calendar, Users, BookOpen, Search, Filter, Clock, Award, Edit, Trash2, BookTemplate, CheckCircle, TrendingUp, UserPlus, X, Loader2, History } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { PageHeader } from '@/shared/ui';
import { trainingService } from '@/features/training/api/training.service';
import { employeeService } from '@/features/employee/api/employee.service';
import type { TrainingProgram } from '@/features/training/types/training.types';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import './TrainingProgramsPage.css';
import { showToast } from '@/shared/ui/toast';
import { ApprovalHistoryModal } from "@/shared/components/ApprovalHistoryModal";
import { parsePaginatedResponse } from '@/shared/api/pagination';

const formatDateTime = (input: string) => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
};

const TrainingProgramsPage: React.FC = () => {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter & Pagination State
  const [activeTab, setActiveTab] = useState<"Semua" | "Active" | "Draft" | "Completed" | "Cancelled">("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [totalPrograms, setTotalPrograms] = useState(0);

  // History Modal State
  const [historyModal, setHistoryModal] = useState<{ module: string; id: number } | null>(null);

  // Enroll Modal State
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [selectedProgramName, setSelectedProgramName] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: currentPage, per_page: pageSize };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (activeTab !== 'Semua') params.status = activeTab.toLowerCase();
      const data = await trainingService.getPrograms(params);
      const parsed = parsePaginatedResponse<TrainingProgram>(data);
      setPrograms(parsed.items);
      setTotalPages(parsed.totalPages);
      setTotalPrograms(parsed.total);
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [currentPage, pageSize, searchQuery, activeTab]);

  // Filter Logic
  const filteredPrograms = useMemo(() => {
    return programs.filter(p => {
      const searchStr = searchQuery.toLowerCase();
      const textMatch = ((p as any).title || p.nama || '')?.toLowerCase().includes(searchStr) ||
                        (p.category || '')?.toLowerCase().includes(searchStr);
      
      let statusMatch = true;
      if (activeTab === "Active") statusMatch = p.status === 'active';
      else if (activeTab === "Draft") statusMatch = p.status === 'draft';
      else if (activeTab === "Completed") statusMatch = p.status === 'completed';
      else if (activeTab === "Cancelled") statusMatch = p.status === 'cancelled';
      
      return textMatch && statusMatch;
    });
  }, [programs, searchQuery, activeTab]);

  // Sort by title
  const sortedPrograms = useMemo(() => {
    return [...filteredPrograms].sort((a, b) => {
      const valA = ((a as any).title || '').toLowerCase();
      const valB = ((b as any).title || '').toLowerCase();
      return valA < valB ? -1 : valA > valB ? 1 : 0;
    });
  }, [filteredPrograms]);

  // Paginate
  const paginatedPrograms = sortedPrograms;

  const [totalPages, setTotalPages] = useState(1);

  // Summary Cards
  const summaryCards = useMemo(() => [
    {
      label: "Total Program",
      subtitle: "Seluruh program pelatihan",
      value: String(totalPrograms),
      change: "Program Pelatihan",
      tone: "blue" as const,
      icon: GraduationCap,
    },
    {
      label: "Hasil Filter",
      subtitle: "Program sesuai pencarian",
      value: String(sortedPrograms.length),
      change: `${paginatedPrograms.length} data per halaman`,
      tone: "green" as const,
      icon: Search,
    },
    {
      label: "Aktif",
      subtitle: "Program yang sedang aktif",
      value: String(programs.filter(p => p.status === 'active').length),
      change: "Program Aktif",
      tone: "orange" as const,
      icon: CheckCircle,
    },
    {
      label: "Kategori",
      subtitle: "Kategori pelatihan",
      value: String(new Set(programs.map(p => p.category).filter(Boolean)).size),
      change: "Jenis pelatihan",
      tone: "purple" as const,
      icon: BookTemplate,
    },
  ], [programs, sortedPrograms.length, paginatedPrograms.length, totalPrograms]);

  const clearFilters = () => {
    setSearchQuery('');
    setActiveTab("Semua");
    setCurrentPage(1);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await trainingService.deleteProgram(id);
      fetchData();
      showToast('Program berhasil dihapus', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err?.response?.data?.message || err?.message || 'Gagal menghapus program', 'error');
    }
  };

  const openEnrollModal = (programId: number, programName: string) => {
    setSelectedProgramId(programId);
    setSelectedProgramName(programName);
    setEnrollModalOpen(true);
    setSelectedEmployeeId(null);
    setEmployeeSearch('');
  };

  const closeEnrollModal = () => {
    setEnrollModalOpen(false);
    setSelectedProgramId(null);
    setSelectedProgramName('');
    setSelectedEmployeeId(null);
    setEmployeeSearch('');
  };

  const loadEmployees = async () => {
    try {
      const data = await employeeService.getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  };

  const handleEnroll = async () => {
    if (!selectedProgramId || !selectedEmployeeId) return;
    setEnrolling(true);
    try {
      await trainingService.enrollEmployees(selectedProgramId, [selectedEmployeeId]);
      closeEnrollModal();
      fetchData();
      showToast('Karyawan berhasil didaftarkan', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || err?.message || 'Gagal mendaftarkan karyawan', 'error');
    } finally {
      setEnrolling(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter((emp: any) => {
      const name = emp.user?.name || emp.name || '';
      const code = emp.employee_code || '';
      return name.toLowerCase().includes(q) || code.toLowerCase().includes(q);
    });
  }, [employees, employeeSearch]);

  return (
    <div className="crud-page training-page">
      <PageHeader
        title="Program Pelatihan"
        subtitle="Kelola program pelatihan karyawan, sertifikasi, dan pengembangan keterampilan."
        badge={{ icon: GraduationCap, label: "L & D" }}
        actions={
          <>
            <button className="btn-outline" onClick={fetchData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>
            <button className="btn-primary" onClick={() => navigate('/training/programs/create')}>
              <Plus size={16} />
              Tambah Program
            </button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="training-summary-wrapper">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="training-summary-card">
              <div className="training-summary-header">
                <div>
                  <p className="training-summary-label">{card.label}</p>
                  <p className="training-summary-subtitle">{card.subtitle}</p>
                </div>
                <div className={`training-summary-icon-wrapper training-icon-${card.tone}`}>
                  <Icon size={28} />
                </div>
              </div>
              <div className={`training-summary-value training-value-${card.tone}`}>{card.value}</div>
              <p className="training-summary-trend">{card.change}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Title Card */}
      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Program</h2>
            <p className="analytics-subtitle">Kelola dan lihat semua program pelatihan</p>
          </div>
        </div>
      </Card>

      {/* Control Section */}
      <Card className="control-section-card">
        <div className="control-section-inner">
          {/* Tabs */}
          <div className="elyra-tabs">
            {(["Semua", "Active", "Draft", "Completed", "Cancelled"] as const).map((tab) => (
              <button
                key={tab}
                className={`elyra-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search & Filter */}
          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder="Cari program..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="search-input-pill"
              />
            </div>
            <button
              className={`filter-btn-rounded ${showFilters ? "active" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="filter-dropdown">
            <div className="filter-row">
              {(searchQuery || activeTab !== "Semua") && (
                <button className="btn-clear-filter" onClick={clearFilters}>
                  Hapus Filter
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Table Section */}
      <div className="table-section">
        <div className="wuw-table-area">
          {loading && <LoadingState message="Memuat program..." />}

          {!loading && paginatedPrograms.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Pencarian Kosong"
                message="Kami tidak menemukan program yang sesuai dengan kriteria Anda."
                actionLabel="Bersihkan Filter"
                onAction={clearFilters}
              />
            </div>
          )}

          {!loading && paginatedPrograms.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '400px' }}>Nama Program</th>
                      <th>Kategori</th>
                      <th>Mode</th>
                      <th>Provider</th>
                      <th>Tanggal Mulai</th>
                      <th className="th-center">Status</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPrograms.map((program) => (
                      <tr key={program.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {((program as any).title || 'P').charAt(0).toUpperCase()}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{program.title || program.nama}</span>
                              <span className="cell-stacked__sub">{program.description || 'No description'}</span>
                            </div>
                          </div>
                        </td>
                        <td><span style={{ color: '#475569', fontWeight: 600 }}>{program.category || "-"}</span></td>
                        <td><span className="badge-soft badge-soft--blue">{program.mode || "-"}</span></td>
                        <td><span style={{ color: '#64748b', fontWeight: 500 }}>{program.provider || "-"}</span></td>
                        <td>
                          <div className="cell-stacked">
                            <span className="cell-stacked__main" style={{ fontSize: '0.85rem' }}>{program.start_date ? formatDateTime(program.start_date) : "-"}</span>
                            <span className="cell-stacked__sub">Mulai</span>
                          </div>
                        </td>
                        <td className="td-center">
                          <span className={`badge-soft badge-soft--${
                            program.status === "active" ? "green" : 
                            program.status === "draft" ? "yellow" : 
                            program.status === "completed" ? "blue" : "red"
                          }`}>
                            {program.status || "draft"}
                          </span>
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            <button
                              className="action-btn"
                              style={{ color: '#6366f1', background: '#eef2ff' }}
                              onClick={() => openEnrollModal(typeof program.id === 'string' ? parseInt(program.id, 10) : program.id, program.title || program.nama || '')}
                              title="Daftarkan Karyawan"
                            >
                              <UserPlus size={16} />
                            </button>
                            <button
                              className="action-btn action-btn-edit"
                              onClick={() => navigate(`/training/programs/edit/${program.id}`)}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="action-btn action-btn-delete"
                              onClick={(e) => handleDelete(typeof program.id === 'string' ? parseInt(program.id, 10) : program.id, e)}
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              className="action-btn"
                              style={{ color: '#8b5cf6', background: '#f5f3ff' }}
                              onClick={() => setHistoryModal({ module: 'training', id: typeof program.id === 'string' ? parseInt(program.id, 10) : program.id })}
                              title="Riwayat Approval"
                            >
                              <History size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="table-pagination">
                <div className="pagination-info">
                  {sortedPrograms.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, sortedPrograms.length)} dari ${sortedPrograms.length} data`}
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Enroll Modal */}
      <Modal
        isOpen={enrollModalOpen}
        onClose={closeEnrollModal}
        title={`Daftarkan Karyawan — ${selectedProgramName}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Cari karyawan..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              onFocus={async () => { if (employees.length === 0) await loadEmployees(); }}
              className="form-control"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredEmployees.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0' }}>Tidak ada karyawan ditemukan</p>
            ) : (
              filteredEmployees.map((emp: any) => {
                const empId = emp.id;
                const empName = emp.user?.name || emp.name || 'Employee';
                const empCode = emp.employee_code || '-';
                return (
                  <button
                    key={empId}
                    type="button"
                    onClick={() => setSelectedEmployeeId(empId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: selectedEmployeeId === empId ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      background: selectedEmployeeId === empId ? '#eef2ff' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: selectedEmployeeId === empId ? '#6366f1' : '#f1f5f9',
                      color: selectedEmployeeId === empId ? '#fff' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                    }}>
                      {empName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{empName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{empCode}</div>
                    </div>
                    {selectedEmployeeId === empId && (
                      <CheckCircle size={18} color="#6366f1" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontWeight: 600 }}
              onClick={handleEnroll}
              disabled={!selectedEmployeeId || enrolling}
            >
              {enrolling ? (
                <><Loader2 size={16} className="animate-spin" style={{ marginRight: '6px' }} />Mendaftar...</>
              ) : (
                <><UserPlus size={16} style={{ marginRight: '6px' }} />Daftarkan</>
              )}
            </button>
            <button
              type="button"
              className="btn-outline"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontWeight: 600 }}
              onClick={closeEnrollModal}
              disabled={enrolling}
            >
              <X size={16} style={{ marginRight: '6px' }} />Batal
            </button>
          </div>
        </div>
      </Modal>

      {historyModal && (
        <ApprovalHistoryModal
          isOpen={!!historyModal}
          onClose={() => setHistoryModal(null)}
          module={historyModal.module}
          moduleId={historyModal.id}
        />
      )}
    </div>
  );
};

export default TrainingProgramsPage;
