import React from 'react';
import { User } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

interface OrgChartNodeProps {
  node: any;
  renderChildren?: (children: any[]) => React.ReactNode;
}

export const OrgChartNode: React.FC<OrgChartNodeProps> = ({ node, renderChildren }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Card glass style={{ 
        padding: '1rem', 
        width: '240px', 
        textAlign: 'center', 
        border: '1px solid var(--color-primary-light)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          borderRadius: '50%', 
          background: '#eff6ff', 
          color: 'var(--color-primary)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 0.75rem'
        }}>
          <User size={24} />
        </div>
        <div style={{ fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.25rem' }}>{node.full_name || node.name}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{node.designation || node.position}</div>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>{node.department}</div>
      </Card>

      {node.children && node.children.length > 0 && renderChildren && renderChildren(node.children)}
    </div>
  );
};
