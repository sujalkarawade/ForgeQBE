import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import api from '../services/api';
import toast from 'react-hot-toast';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [sessionId, setSessionId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [schema, setSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState([]);
  const [savedQueries, setSavedQueries] = useState([]);
  const [savedQueriesLoading, setSavedQueriesLoading] = useState(false);

  const connect = useCallback(async (dbConfig) => {
    const id = uuidv4();
    await api.post('/database/connect', { sessionId: id, ...dbConfig });
    setSessionId(id);
    setIsConnected(true);
    setConnectionInfo(dbConfig);

    // Load schema immediately after connecting
    setSchemaLoading(true);
    try {
      const res = await api.get(`/schema/${id}`);
      setSchema(res.data.schema);
    } catch (err) {
      toast.error('Connected but failed to load schema.');
    } finally {
      setSchemaLoading(false);
    }

    return id;
  }, []);

  const disconnect = useCallback(async () => {
    if (sessionId) {
      await api.delete(`/database/disconnect/${sessionId}`).catch(() => {});
    }
    setSessionId(null);
    setIsConnected(false);
    setConnectionInfo(null);
    setSchema(null);
    setQueryHistory([]);
    setSavedQueries([]);
  }, [sessionId]);

  const refreshSchema = useCallback(async () => {
    if (!sessionId) return;
    setSchemaLoading(true);
    try {
      const res = await api.get(`/schema/${sessionId}`);
      setSchema(res.data.schema);
    } finally {
      setSchemaLoading(false);
    }
  }, [sessionId]);

  const addToHistory = useCallback((entry) => {
    setQueryHistory(prev => [{ id: uuidv4(), timestamp: new Date().toISOString(), ...entry }, ...prev].slice(0, 50));
  }, []);

  // ─── Saved Queries ──────────────────────────────────────────

  const fetchSavedQueries = useCallback(async () => {
    if (!sessionId) return;
    setSavedQueriesLoading(true);
    try {
      const res = await api.get(`/query/saved/${sessionId}`);
      setSavedQueries(res.data);
    } catch (err) {
      console.error('Failed to fetch saved queries:', err.message);
    } finally {
      setSavedQueriesLoading(false);
    }
  }, [sessionId]);

  const saveQuery = useCallback(async (name, sql, explanation) => {
    if (!sessionId) {
      toast.error('No active session.');
      return null;
    }
    try {
      const res = await api.post('/query/save', {
        sessionId,
        name,
        sql,
        explanation: explanation || null,
      });
      setSavedQueries(prev => [res.data, ...prev]);
      toast.success(`Query "${name}" saved!`);
      return res.data;
    } catch (err) {
      toast.error(`Failed to save query: ${err.message}`);
      return null;
    }
  }, [sessionId]);

  const renameQuery = useCallback(async (id, newName) => {
    try {
      await api.put(`/query/saved/${id}`, { name: newName });
      setSavedQueries(prev => prev.map(q => q.id === id ? { ...q, name: newName } : q));
      toast.success('Query renamed.');
    } catch (err) {
      toast.error(`Failed to rename: ${err.message}`);
    }
  }, []);

  const deleteQuery = useCallback(async (id) => {
    try {
      await api.delete(`/query/saved/${id}`);
      setSavedQueries(prev => prev.filter(q => q.id !== id));
      toast.success('Query deleted.');
    } catch (err) {
      toast.error(`Failed to delete: ${err.message}`);
    }
  }, []);

  return (
    <SessionContext.Provider value={{
      sessionId,
      isConnected,
      connectionInfo,
      schema,
      schemaLoading,
      queryHistory,
      savedQueries,
      savedQueriesLoading,
      connect,
      disconnect,
      refreshSchema,
      addToHistory,
      fetchSavedQueries,
      saveQuery,
      renameQuery,
      deleteQuery,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}