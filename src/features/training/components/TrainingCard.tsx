import React from 'react';
import { BookOpen, Award, ExternalLink, Calendar, Users } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import type { TrainingProgram } from '../types/training.types';

interface TrainingCardProps {
  program: TrainingProgram;
  onViewDetails?: (id: string | number) => void;
}

export const TrainingCard: React.FC<TrainingCardProps> = ({ program, onViewDetails }) => {
  return (
    <Card glass style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '160px', background: 'linear-gradient(135deg, var(--hero-bg-start) 0%, var(--hero-bg-end) 100%)', position: 'relative' }}>
         <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <BookOpen size={64} color="white" style={{ opacity: 0.2 }} />
         </div>
         <span style={{ 
           position: 'absolute', 
           top: '12px', 
           right: '12px', 
           background: 'rgba(255,255,255,0.2)', 
           backdropFilter: 'blur(4px)', 
           color: 'white', 
           padding: '4px 10px', 
           borderRadius: '20px', 
           fontSize: '0.7rem', 
           fontWeight: 700 
         }}>
           {program.category}
         </span>
      </div>
      
      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: 'var(--color-primary-dark)' }}>{(program as any).title || (program as any).nama}</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem', flex: 1 }}>
          {((program as any).description || (program as any).deskripsi)?.length > 100 ? ((program as any).description || (program as any).deskripsi).substring(0, 100) + '...' : ((program as any).description || (program as any).deskripsi)}
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#475569' }}>
              <Calendar size={14} />
              {(program as any).start_date ? `${new Date((program as any).start_date).toLocaleDateString()} - ${new Date((program as any).end_date || (program as any).start_date).toLocaleDateString()}` : ((program as any).jadwal ? new Date((program as any).jadwal).toLocaleDateString() : 'N/A')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#475569' }}>
            <Users size={14} />
              {(program as any).enrolled_count || 0} / {(program as any).capacity || '-'} Enrolled
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
             <Award size={16} color="#10b981" />
             <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>Certification</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => onViewDetails?.(program.id)}>
            Details
            <ExternalLink size={14} style={{ marginLeft: '6px' }} />
          </Button>
        </div>
      </div>
    </Card>
  );
};
