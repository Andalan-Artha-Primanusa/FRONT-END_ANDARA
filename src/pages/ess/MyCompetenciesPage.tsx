import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Award, Search, Users, CheckCircle, Clock } from 'lucide-react';
import { Card, CardHeader, PageHeader } from '@/shared/ui';
import { LoadingState, ErrorState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { trainingService } from '@/features/training/api/training.service';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/payroll/PayrollShared.css';
import '@/pages/employee/EmployeesPage.css';

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};

const getAssessorName = (competency: any) => {
  const assessor = toRecord(competency?.assessor);
  const assessedBy = toRecord(competency?.assessed_by);
  const assessedByUser = toRecord(competency?.assessedBy);
  const user = toRecord(assessor.user);

  const name = firstText(
    competency?.assessor_name,
    assessor.name,
    user.name,
    assessor.email,
    competency?.assessed_by_name,
    assessedBy.name,
    assessedBy.email,
    assessedByUser.name,
    assessedByUser.email,
  );

  if (name) return name;
  if (competency?.assessed_at) return 'HR / Manager';
  return 'Belum dinilai';
};

const MyCompetenciesPage: React.FC = () => {
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'Semua' | 'Sudah Dinilai' | 'Belum Dinilai'>('Semua');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await trainingService.getMyCompetencies();
      let data: any[] = [];
      if (Array.isArray(response)) {
        data = response;
      } else if (response?.data && Array.isArray(response.data)) {
        data = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      }
      setCompetencies(data);
    } catch (error) {
      console.error('Error fetching my competencies:', error);
      setErrorMessage('Gagal memuat kompetensi');
      setCompetencies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab]);

  const proficiencyLabels: Record<number, string> = {
    1: 'Beginner',
    2: 'Elementary',
    3: 'Intermediate',
    4: 'Advanced',
    5: 'Expert',
  };

  const proficiencyColors: Record<number, string> = {
    1: '#f59e0b',
    2: '#10b981',
    3: 'var(--color-primary)',
    4: '#8b5cf6',
    5: '#ec4899',
  };

  const filteredCompetencies = useMemo(() => {
    return competencies.filter((comp) => {
      const name = comp.competency?.name || '';
      const category = comp.competency?.category || '';
      const searchStr = searchText.toLowerCase();
      const textMatch = name.toLowerCase().includes(searchStr) || category.toLowerCase().includes(searchStr);

      let statusMatch = true;
      if (activeTab === 'Sudah Dinilai') statusMatch = !!comp.assessed_at;
      else if (activeTab === 'Belum Dinilai') statusMatch = !comp.assessed_at;

      return textMatch && statusMatch;
    });
  }, [competencies, searchText, activeTab]);

  const sortedCompetencies = useMemo(() => {
    return [...filteredCompetencies].sort((a, b) => {
      const nameA = (a.competency?.name || '').toLowerCase();
      const nameB = (b.competency?.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [filteredCompetencies]);

  const paginatedCompetencies = sortedCompetencies;

  const [totalPages, setTotalPages] = useState(1);

  const assessedCount = useMemo(() => competencies.filter((c) => c.assessed_at).length, [competencies]);
  const unassessedCount = useMemo(() => competencies.filter((c) => !c.assessed_at).length, [competencies]);
  const uniqueCategories = useMemo(() => new Set(competencies.map((c) => c.competency?.category).filter(Boolean)).size, [competencies]);

  const summaryCards = [
    {
      label: 'Total Kompetensi',
      subtitle: 'Kompetensi yang ditugaskan',
      value: String(competencies.length),
      change: 'Ditugaskan oleh HR/Manager',
      tone: 'blue' as const,
      icon: Award,
    },
    {
      label: 'Sudah Dinilai',
      subtitle: 'Sudah ada penilaian',
      value: String(assessedCount),
      change: 'Level proficiency ditetapkan',
      tone: 'green' as const,
      icon: CheckCircle,
    },
    {
      label: 'Belum Dinilai',
      subtitle: 'Menunggu penilaian',
      value: String(unassessedCount),
      change: 'Hubungi HR/Manager Anda',
      tone: 'orange' as const,
      icon: Clock,
    },
    {
      label: 'Kategori',
      subtitle: 'Jenis kompetensi',
      value: String(uniqueCategories),
      change: 'Kategori berbeda',
      tone: 'purple' as const,
      icon: Users,
    },
  ];

  const clearFilters = () => {
    setSearchText('');
    setActiveTab('Semua');
    setCurrentPage(1);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Kompetensi Saya"
        subtitle="Lihat inventaris keterampilan dan tingkat kompetensi Anda."
        badge={{ icon: Award, label: "Layanan Mandiri" }}
        actions={
          <button className="btn-outline" onClick={fetchData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Segarkan
          </button>
        }
      />

      <div className="employee-summary-wrapper">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="employee-summary-card">
              <div className="employee-summary-header">
                <div>
                  <p className="employee-summary-label">{card.label}</p>
                  <p className="employee-summary-subtitle">{card.subtitle}</p>
                </div>
                <div className={`employee-summary-icon-wrapper employee-icon-${card.tone}`}>
                  <Icon size={28} />
                </div>
              </div>
              <div className={`employee-summary-value employee-value-${card.tone}`}>{card.value}</div>
              <p className="employee-summary-trend">{card.change}</p>
            </div>
          );
        })}
      </div>

      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <Award size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Kompetensi Saya</h2>
            <p className="analytics-subtitle">Daftar kompetensi yang ditugaskan kepada Anda</p>
          </div>
        </div>
      </Card>

      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          <div className="elyra-tabs">
            {(['Semua', 'Sudah Dinilai', 'Belum Dinilai'] as const).map((tab) => (
              <button key={tab} className={`elyra-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </div>

          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder="Cari kompetensi..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
            {(searchText || activeTab !== 'Semua') && (
              <button className="btn-clear-filter" onClick={clearFilters}>
                Hapus Filter
              </button>
            )}
          </div>
        </div>
      </Card>

          {loading && <LoadingState message="Memuat kompetensi..." />}
          {!loading && errorMessage && <ErrorState message="Koneksi Terputus" error={errorMessage} onRetry={fetchData} />}

          {!loading && !errorMessage && filteredCompetencies.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Belum Ada Kompetensi"
                message="Anda belum memiliki kompetensi yang ditugaskan. Hubungi HR/Manager untuk penugasan."
                actionLabel="Segarkan"
                onAction={fetchData}
              />
            </div>
          )}

          {!loading && !errorMessage && filteredCompetencies.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '300px' }}>Kompetensi</th>
                      <th>Kode</th>
                      <th>Kategori</th>
                      <th>Tingkat</th>
                      <th>Dinilai Oleh</th>
                      <th>Tanggal Penilaian</th>
                      <th className="th-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCompetencies.map((comp) => {
                      const level = comp.proficiency_level || 0;
                      const color = proficiencyColors[level] || '#64748b';
                      const bg = `${color}15`;
                      const assessed = !!comp.assessed_at;
                      return (
                        <tr key={comp.id}>
                          <td>
                            <div className="cell-name">
                              <div className="cell-avatar" style={{ background: bg, color }}>
                                <Award size={18} />
                              </div>
                              <div className="cell-stacked">
                                <span className="cell-name-text">{comp.competency?.name || '-'}</span>
                                <span className="cell-stacked__sub">ID: {comp.competency?.id}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge-soft badge-soft--blue">{comp.competency?.code || '-'}</span>
                          </td>
                          <td>
                            <span style={{ color: '#475569', fontWeight: 600 }}>{comp.competency?.category || '-'}</span>
                          </td>
                          <td>
                            {assessed ? (
                              <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, background: bg, color }}>
                                {level} - {proficiencyLabels[level] || 'N/A'}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>
                          <td>
                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{getAssessorName(comp)}</span>
                          </td>
                          <td>
                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{assessed ? formatDate(comp.assessed_at) : '-'}</span>
                          </td>
                          <td className="td-center">
                            {assessed ? (
                              <span className="badge-soft badge-soft--green">
                                <CheckCircle size={12} style={{ marginRight: '4px' }} />
                                Dinilai
                              </span>
                            ) : (
                              <span className="badge-soft badge-soft--orange">
                                <Clock size={12} style={{ marginRight: '4px' }} />
                                Menunggu
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination">
                <div className="pagination-info">
                  {sortedCompetencies.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, sortedCompetencies.length)} dari ${sortedCompetencies.length} data`}
                </div>
                <div className="pagination-controls">
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button key={page} className={`pagination-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>
                      {page}
                    </button>
                  ))}
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>›</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyCompetenciesPage;
