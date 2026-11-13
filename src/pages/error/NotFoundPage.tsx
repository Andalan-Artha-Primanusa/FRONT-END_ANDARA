import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <Card style={{ padding: '3rem', textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ fontSize: '5rem', fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>404</div>
        <h1 style={{ margin: '1rem 0 0.5rem', color: '#1e293b' }}>Halaman Tidak Ditemukan</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Halaman yang Anda cari tidak tersedia atau telah dipindahkan.</p>
        <Button variant="primary" onClick={() => navigate('/dashboard', { replace: true })}>
          Kembali ke Dashboard
        </Button>
      </Card>
    </div>
  );
};

export default NotFoundPage;
