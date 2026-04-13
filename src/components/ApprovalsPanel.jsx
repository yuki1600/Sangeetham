import React, { useState, useEffect } from 'react';
import { Check, X, Clock, Music2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ApprovalsPanel({ theme, onBack }) {
  const [pendingSongs, setPendingSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const res = await fetch('/api/songs/pending');
      if (res.ok) {
        const data = await res.json();
        setPendingSongs(data);
      }
    } catch (err) {
      console.error('Failed to fetch pending songs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/songs/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        setPendingSongs(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error(`Failed to ${action} song:`, err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] bg-clip-text text-transparent">
            Pending Approvals
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Review and approve songs submitted by Editors
          </p>
        </div>
        <button 
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] transition-all"
        >
          Back to Home
        </button>
      </header>

      {pendingSongs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[var(--border-primary)] rounded-3xl opacity-60">
          <Clock className="w-12 h-12 mb-4" />
          <p className="text-lg">No pending approvals at the moment</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {pendingSongs.map((song) => (
              <motion.div
                key={song.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group p-5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-3xl hover:border-[var(--brand-primary)] transition-all flex items-center gap-6"
              >
                <div className="w-12 h-12 rounded-2xl bg-[var(--brand-primary)] bg-opacity-10 flex items-center justify-center text-[var(--brand-primary)]">
                  <Music2 className="w-6 h-6" />
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{song.title}</h3>
                  <div className="flex gap-4 mt-1 text-sm text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {song.composer || 'Unknown'}</span>
                    <span>•</span>
                    <span>{song.raga} / {song.tala}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    disabled={processingId === song.id}
                    onClick={() => handleAction(song.id, 'reject')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 bg-opacity-10 text-red-500 hover:bg-opacity-20 transition-all disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                  <button
                    disabled={processingId === song.id}
                    onClick={() => handleAction(song.id, 'approve')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 bg-opacity-10 text-emerald-500 hover:bg-opacity-20 transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
