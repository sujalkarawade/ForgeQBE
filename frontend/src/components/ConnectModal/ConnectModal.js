import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './ConnectModal.css';

const DEFAULT_FORM = {
  host: 'localhost',
  port: '5432',
  database: '',
  user: 'postgres',
  password: '',
};

export default function ConnectModal({ onClose }) {
  const { connect } = useSession();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/database/test', form);
      setTestResult({ success: true, message: 'Connection successful!', version: res.data.version });
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setConnecting(true);
    try {
      await connect(form);
      toast.success(`Connected to ${form.database}`);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">Connect to PostgreSQL</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="modal-body" onSubmit={handleConnect}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="host">Host</label>
              <input
                id="host"
                name="host"
                type="text"
                value={form.host}
                onChange={handleChange}
                placeholder="localhost"
                required
              />
            </div>
            <div className="form-group form-group-sm">
              <label htmlFor="port">Port</label>
              <input
                id="port"
                name="port"
                type="number"
                value={form.port}
                onChange={handleChange}
                placeholder="5432"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="database">Database</label>
            <input
              id="database"
              name="database"
              type="text"
              value={form.database}
              onChange={handleChange}
              placeholder="my_database"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="user">Username</label>
              <input
                id="user"
                name="user"
                type="text"
                value={form.user}
                onChange={handleChange}
                placeholder="postgres"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </div>
          </div>

          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              <span>{testResult.success ? '✓' : '✗'}</span>
              <span>{testResult.message}</span>
              {testResult.version && (
                <span className="test-version">{testResult.version.split(' ').slice(0, 2).join(' ')}</span>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTest}
              disabled={testing || connecting}
            >
              {testing ? <><span className="spinner-sm" /> Testing…</> : 'Test Connection'}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={connecting || testing}
            >
              {connecting ? <><span className="spinner-sm" /> Connecting…</> : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
