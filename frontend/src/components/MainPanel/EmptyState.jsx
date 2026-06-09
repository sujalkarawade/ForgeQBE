import React from 'react';
import './EmptyState.css';

export default function EmptyState() {
  return (
    <div className="empty-state">
      {/* Hero mark */}
      <div className="empty-hero">
        <svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2L24 7.5V20.5L14 26L4 20.5V7.5L14 2Z" />
        </svg>
      </div>

      <h2>Connect a Database to Begin</h2>
      <p>
        ForgeQBE lets you find data by example — no SQL knowledge needed.
        Connect your PostgreSQL database and show what data you're looking for.
      </p>

      {/* Steps */}
      <div className="empty-steps">
        <div className="empty-step">
          <div className="step-num">1</div>
          <div className="step-content">
            <strong>Connect</strong>
            <span>Enter your PostgreSQL credentials in the sidebar</span>
          </div>
        </div>
        <div className="empty-step">
          <div className="step-num">2</div>
          <div className="step-content">
            <strong>Show Examples</strong>
            <span>Enter rows that represent the data you want to find</span>
          </div>
        </div>
        <div className="empty-step">
          <div className="step-num">3</div>
          <div className="step-content">
            <strong>Get SQL</strong>
            <span>AI analyzes patterns, generates SQL, and validates results</span>
          </div>
        </div>
      </div>

      {/* Demo */}
      <div className="empty-example">
        <p className="empty-example-label">Example input</p>
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
        <div className="empty-example-arrow">AI generates</div>
        <div className="empty-example-sql">
          <code>SELECT name, status, country FROM users WHERE status = 'active' AND country = 'US';</code>
        </div>
      </div>
    </div>
  );
}
