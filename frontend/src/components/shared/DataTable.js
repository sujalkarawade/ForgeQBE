import React, { useState } from 'react';
import './DataTable.css';

const PAGE_SIZE = 50;

export default function DataTable({ rows, fields }) {
  const [page, setPage] = useState(0);

  if (!rows || rows.length === 0) {
    return (
      <div className="datatable-empty">
        <span>No rows returned</span>
      </div>
    );
  }

  const columns = fields?.length > 0
    ? fields.map(f => f.name)
    : Object.keys(rows[0] || {});

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatCell = (value) => {
    if (value === null || value === undefined) return <span className="cell-null">NULL</span>;
    if (typeof value === 'boolean') return <span className="cell-bool">{String(value)}</span>;
    if (typeof value === 'object') return <span className="cell-json">{JSON.stringify(value)}</span>;
    const str = String(value);
    if (str.length > 100) return <span title={str}>{str.slice(0, 100)}…</span>;
    return str;
  };

  return (
    <div className="datatable">
      <div className="datatable-scroll">
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col}>{formatCell(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="datatable-pagination">
          <button
            className="page-btn"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            ‹ Prev
          </button>
          <span className="page-info">
            Page {page + 1} of {totalPages} ({rows.length} rows)
          </span>
          <button
            className="page-btn"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
