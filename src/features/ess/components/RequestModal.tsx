import React, { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { AlertCircle } from 'lucide-react';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const RequestModal: React.FC<RequestModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    description: '',
    priority: 'medium',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit HR Service Request">
      <form onSubmit={handleSubmit} className="crud-form">
        <div className="form-group">
          <label>Category</label>
          <select 
            className="crud-input"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
          >
            <option value="">Select Category</option>
            <option value="Payroll Inquiry">Payroll Inquiry</option>
            <option value="Policy Clarification">Policy Clarification</option>
            <option value="Document Request">Document Request</option>
            <option value="IT Support (HR System)">IT Support (HR System)</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Subject</label>
          <input 
            type="text" 
            className="crud-input"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Brief title of your request"
            required
          />
        </div>

        <div className="form-group">
          <label>Priority</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {['low', 'medium', 'high'].map(p => (
              <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', textTransform: 'capitalize', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="priority" 
                  value={p}
                  checked={formData.priority === p}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                />
                {p}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea 
            className="crud-input"
            style={{ height: '120px' }}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Provide more details about your request..."
            required
          />
        </div>

        <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', display: 'flex', gap: '8px', marginBottom: '1rem' }}>
          <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#991b1b' }}>
            HR will review your request based on the SLA policy. You will be notified via email of any updates.
          </p>
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" type="submit">Submit Request</Button>
        </div>
      </form>
    </Modal>
  );
};
