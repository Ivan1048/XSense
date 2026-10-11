import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import type { IncidentStatus } from '../types';

interface ResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  actionType: 'Resolve' | 'False Alarm' | 'Add Note';
  onSubmit: (incidentId: string, status: IncidentStatus, note: string) => void;
}

export const ResolveModal: React.FC<ResolveModalProps> = ({
  isOpen,
  onClose,
  incidentId,
  actionType,
  onSubmit,
}) => {
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNote = note.trim() || (actionType === 'Resolve' ? 'Incident resolved by operator.' : actionType === 'False Alarm' ? 'Marked false alarm after operator review.' : 'Operator note logged.');
    
    if (actionType === 'Resolve') {
      onSubmit(incidentId, 'Resolved', finalNote);
    } else if (actionType === 'False Alarm') {
      onSubmit(incidentId, 'False Alarm', finalNote);
    } else {
      // Just adding a note doesn't necessarily change status, but we can keep current
      onSubmit(incidentId, 'Investigating', finalNote);
    }
    setNote('');
    onClose();
  };

  const getTitle = () => {
    switch (actionType) {
      case 'Resolve':
        return 'Resolve Simulated Incident';
      case 'False Alarm':
        return 'Mark Alert as False Alarm';
      default:
        return 'Add Operator Log Note';
    }
  };

  const isFalseAlarm = actionType === 'False Alarm';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            {isFalseAlarm ? (
              <AlertTriangle size={20} className="text-amber" />
            ) : (
              <CheckCircle size={20} className="text-teal" />
            )}
            <div>
              <h3>{getTitle()}</h3>
              <span className="mono-sub">Case Reference: {incidentId}</span>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
            <p className="modal-explainer">
              {isFalseAlarm
                ? 'Document why this sensor event did not represent a genuine safety occurrence (e.g. ambient weather, dog barking, ball bouncing).'
                : 'Enter a closing resolution summary before archiving this simulated incident from the active queue.'}
            </p>

            <div className="form-group">
              <label htmlFor="resolution-note-input">
                {isFalseAlarm ? 'Verification Finding / Rationale:' : 'Resolution Summary & Actions Taken:'}
              </label>
              <textarea
                id="resolution-note-input"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  isFalseAlarm
                    ? 'e.g. Acoustic signal matched sudden lake water splash; no resident distress observed.'
                    : 'e.g. Patrol arrived, assisted resident who had tripped over tree root. First-aid rendered.'
                }
                className="modal-textarea"
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={isFalseAlarm ? 'btn-danger' : 'btn-primary'}
            >
              {actionType === 'Resolve'
                ? 'Confirm & Resolve Case'
                : actionType === 'False Alarm'
                ? 'Record False Alarm'
                : 'Append Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
