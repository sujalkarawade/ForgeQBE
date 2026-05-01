import React from 'react';
import './ValidationBadge.css';

export default function ValidationBadge({ validation }) {
  if (!validation) return null;

  const { isValid, matchRate, matchedExamples, totalExamples } = validation;
  const pct = Math.round(matchRate * 100);

  return (
    <div className={`validation-badge ${isValid ? 'valid' : pct > 0 ? 'partial' : 'invalid'}`}>
      <span className="vb-icon">{isValid ? '✓' : pct > 0 ? '~' : '✗'}</span>
      <span className="vb-text">
        {matchedExamples}/{totalExamples} examples matched ({pct}%)
      </span>
    </div>
  );
}
