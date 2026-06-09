import React, { useState } from 'react';
import './SqlBlock.css';

// Simple SQL syntax highlighter (no external deps)
function highlightSQL(sql) {
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
    'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT',
    'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'DISTINCT', 'COUNT', 'SUM',
    'AVG', 'MAX', 'MIN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IS',
    'NULL', 'TRUE', 'FALSE', 'ASC', 'DESC', 'WITH', 'UNION', 'ALL',
  ];

  // Escape HTML
  let result = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Strings
  result = result.replace(/'([^']*)'/g, '<span class="sql-string">\'$1\'</span>');

  // Numbers
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="sql-number">$1</span>');

  // Keywords
  keywords.forEach(kw => {
    const re = new RegExp(`\\b(${kw})\\b`, 'gi');
    result = result.replace(re, '<span class="sql-keyword">$1</span>');
  });

  // Comments
  result = result.replace(/(--[^\n]*)/g, '<span class="sql-comment">$1</span>');

  // Quoted identifiers
  result = result.replace(/"([^"]+)"/g, '<span class="sql-ident">"$1"</span>');

  return result;
}

export default function SqlBlock({ sql, compact = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`sql-block ${compact ? 'compact' : ''}`}>
      <div className="sql-block-header">
        <span className="sql-block-label">SQL</span>
        <button className="sql-copy-btn" onClick={handleCopy}>
          {copied ? '✓ Copied' : '⎘ Copy'}
        </button>
      </div>
      <pre
        className="sql-code"
        dangerouslySetInnerHTML={{ __html: highlightSQL(sql) }}
      />
    </div>
  );
}
