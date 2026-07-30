/**
 * ProgressSteps – Client Component
 * Reusable named-step progress indicator.
 * Usage: <ProgressSteps steps={['Loading', 'Processing', 'Saving']} current={1} />
 */
'use client';

import { Check, Loader } from 'lucide-react';

export default function ProgressSteps({ steps = [], current = 0, label = '' }) {
  return (
    <div className="progress-steps">
      <div className="progress-steps-track">
        {steps.map((step, i) => {
          const isDone = i < current;
          const isActive = i === current;
          return (
            <div key={i} className={`progress-step-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
              <div className="progress-step-icon">
                {isDone ? <Check size={14} /> : isActive ? <Loader size={14} className="spin" /> : <span>{i + 1}</span>}
              </div>
              <span className="progress-step-label">{step}</span>
              {i < steps.length - 1 && <div className={`progress-step-connector ${isDone ? 'done' : ''}`} />}
            </div>
          );
        })}
      </div>
      {label && <p className="progress-steps-sublabel">{label}</p>}
    </div>
  );
}
