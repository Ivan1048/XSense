import React from 'react';
import {
  X,
  ShieldCheck,
  EyeOff,
  Lightbulb,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface ResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResidentModal: React.FC<ResidentModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="resident-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <ShieldCheck size={24} className="text-teal" />
            <div>
              <h3>AuraSense Resident Privacy & Safety Guide</h3>
              <span className="mono-sub">Township Community Safety Concept</span>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body-scroll">
          <div className="resident-intro-box">
            <h4>Welcome to Your Smart Township Park</h4>
            <p>
              AuraSense is an experimental privacy-preserving safety network designed to keep park visitors safe without deploying intrusive CCTV video cameras.
            </p>
          </div>

          <div className="resident-faq-list">
            <div className="faq-item">
              <div className="faq-q">
                <EyeOff size={18} className="text-teal" />
                <strong>Are there video cameras watching me or recording conversations?</strong>
              </div>
              <p className="faq-a">
                <strong>No. Absolutely not.</strong> AuraSense poles contain zero optical video cameras. There is no facial recognition, no continuous audio recording, and no voice transcription. Sound and motion are analyzed strictly by on-device microchips and immediately discarded.
              </p>
            </div>

            <div className="faq-item">
              <div className="faq-q">
                <Lightbulb size={18} className="text-amber" />
                <strong>Why did the park path lights suddenly brighten up?</strong>
              </div>
              <p className="faq-a">
                When a nearby pole senses a potential distress sound or someone falling, it gently illuminates a steady path of lights leading directly toward the nearest park exit or safe assembly point. This helps guide visitors safely to help.
              </p>
            </div>

            <div className="faq-item">
              <div className="faq-q">
                <ShieldCheck size={18} className="text-sky" />
                <strong>Who responds when an alert happens?</strong>
              </div>
              <p className="faq-a">
                An alert sends minimal metadata (such as "Pole AS-104: Fall Anomaly") to our on-duty township security team. An authorized officer reviews the alert and dispatches a ranger patrol to check on the visitor's well-being.
              </p>
            </div>
          </div>

          <div className="resident-contact-card">
            <div className="contact-card-top">
              <PhoneCall size={20} className="text-teal" />
              <div>
                <strong>Township Emergency & Security Command Post</strong>
                <span>24/7 Dedicated Community Auxiliary Patrol</span>
              </div>
            </div>
            <div className="contact-numbers">
              <div className="contact-row">
                <span>Township Central Guardhouse:</span>
                <strong className="mono-val">+60 3-7844 0000 (Simulated Demo)</strong>
              </div>
              <div className="contact-row">
                <span>National Emergency Services:</span>
                <strong className="mono-val">999 (Real Police / Ambulance)</strong>
              </div>
            </div>
            <div className="contact-disclaimer">
              <AlertTriangle size={14} className="text-amber" />
              <span>
                Demonstration concept only. In a real emergency, always call official emergency services (999).
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-primary full-width" onClick={onClose}>
            <CheckCircle2 size={16} />
            <span>I Understand & Close Guide</span>
          </button>
        </div>
      </div>
    </div>
  );
};
