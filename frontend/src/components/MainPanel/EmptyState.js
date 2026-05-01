import React from 'react';
import './EmptyState.css';

export default function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">⬡</div>
      <h2>Connect a Database to Get Started</h2>
      <p>
        QBE Explorer lets you find data by example — no SQL knowledge required.
        Connect your PostgreSQL database and show the AI what data you're looking for.
      </p>

      <div className="empty-steps">
        <div className="empty-step">
          <div className="step-num">1</div>
          <div className="step-content">
            <strong>Connect</strong>
            <span>Click "Connect Database" in the sidebar and enter your PostgreSQL credentials</span>
          </div>
        </div>
        <div className="empty-step">
          <div className="step-num">2</div>
          <div className="step-content">
            <strong>Show Examples</strong>
            <span>Enter rows of data that represent what you want to find</span>
          </div>
        </div>
        <div className="empty-step">
          <div className="step-num">3</div>
          <div className="step-content">
            <strong>Get SQL</strong>
            <span>AI analyzes your examples, generates SQL, and validates the results</span>
          </div>
        </div>
      </div>

      <div className="empty-example">
        <p className="empty-example-label">Example input:</p>
        <div className="empty-example-table">
          <table>
            <thead>
              <tr><th>name</th><th>status</th><th>country</th></tr>
            </thead>
            <tbody>
              <tr><td>Alice</td><td>active</td><td>US</td></tr>
              <tr><td>Bob</td><td>active</td><td>US</td></tr>
            </tbody>
          </table>
        </div>
        <p className="empty-example-arrow">↓</p>
        <div className="empty-example-sql">
          <code>SELECT name, status, country FROM users WHERE status = 'active' AND country = 'US';</code>
        </div>
      </div>
    </div>
  );
}
