'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Check, X, Trash2, Sparkles, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  author: string;
  location: string | null;
  color_pref: 'yellow' | 'blue';
  is_approved: boolean;
  created_at: string;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (filter === 'all') {
      setFilteredMessages(messages);
    } else if (filter === 'pending') {
      setFilteredMessages(messages.filter(m => !m.is_approved));
    } else if (filter === 'approved') {
      setFilteredMessages(messages.filter(m => m.is_approved));
    }
  }, [filter, messages]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/messages?status=all&limit=100');
      const data = await response.json();

      if (response.ok) {
        setMessages(data.messages || []);
        setFilteredMessages(data.messages || []);
      } else {
        console.error('Failed to fetch messages:', data.error);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, approve: boolean) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/admin/messages/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: approve }),
      });

      if (response.ok) {
        // 更新本地状态
        setMessages(messages.map(m =>
          m.id === id ? { ...m, is_approved: approve } : m
        ));
      } else {
        console.error('Failed to update message');
      }
    } catch (error) {
      console.error('Error approving message:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    setActionLoading(id);
    try {
      const response = await fetch(`/api/admin/messages/${id}/approve`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessages(messages.filter(m => m.id !== id));
      } else {
        console.error('Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAll = async () => {
    const pendingMessages = filteredMessages.filter(m => !m.is_approved);
    if (pendingMessages.length === 0) return;

    if (!confirm(`Approve all ${pendingMessages.length} pending messages?`)) return;

    setActionLoading('all');
    try {
      // 批量批准
      await Promise.all(
        pendingMessages.map(m =>
          fetch(`/api/admin/messages/${m.id}/approve`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_approved: true }),
          })
        )
      );

      // 刷新数据
      await fetchMessages();
    } catch (error) {
      console.error('Error approving all messages:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingCount = messages.filter(m => !m.is_approved).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-3xl text-white/90 mb-2"
          >
            Whispers Management
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-white/40 font-light"
          >
            Review and approve visitor messages
          </motion.p>
        </div>

        {pendingCount > 0 && filter === 'pending' && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleApproveAll}
            disabled={actionLoading === 'all'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all duration-300 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(56, 189, 248, 0.15) 100%)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
            }}
          >
            <Sparkles className="w-4 h-4 text-lmsy-yellow" />
            <span className="text-white/70">
              Approve All ({pendingCount})
            </span>
          </motion.button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-4 border-b"
        style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <button
          onClick={() => setFilter('pending')}
          className={cn(
            'relative px-4 py-3 text-sm font-mono transition-colors',
            filter === 'pending'
              ? 'text-lmsy-yellow'
              : 'text-white/30 hover:text-white/50'
          )}
        >
          Pending
          {filter === 'pending' && pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs"
              style={{ background: 'rgba(251, 191, 36, 0.2)' }}
            >
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={cn(
            'px-4 py-3 text-sm font-mono transition-colors',
            filter === 'approved'
              ? 'text-lmsy-blue'
              : 'text-white/30 hover:text-white/50'
          )}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-4 py-3 text-sm font-mono transition-colors',
            filter === 'all'
              ? 'text-white/70'
              : 'text-white/30 hover:text-white/50'
          )}
        >
          All
        </button>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-lmsy-yellow/30 border-t-lmsy-yellow rounded-full animate-spin" />
            <p className="mt-4 text-sm text-white/30 font-mono">Loading messages...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 font-light italic">
              {filter === 'pending' ? 'No pending messages' : 'No messages yet'}
            </p>
          </div>
        ) : (
          filteredMessages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative p-6 rounded-xl border"
              style={{
                borderColor: message.is_approved
                  ? 'rgba(255, 255, 255, 0.05)'
                  : `rgba(${message.color_pref === 'yellow' ? '251, 191, 36' : '56, 189, 248'}, 0.2)`,
                background: message.is_approved
                  ? 'rgba(255, 255, 255, 0.02)'
                  : `rgba(${message.color_pref === 'yellow' ? '251, 191, 36' : '56, 189, 248'}, 0.03)`,
              }}
            >
              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                {message.is_approved ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono"
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: 'rgb(56, 189, 248)',
                    }}
                  >
                    <Check className="w-3 h-3" />
                    Approved
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono"
                    style={{
                      background: 'rgba(251, 191, 36, 0.15)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      color: 'rgb(251, 191, 36)',
                    }}
                  >
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                )}
              </div>

              {/* Message Content */}
              <div className="pr-24">
                <p className="font-serif text-lg text-white/80 leading-relaxed mb-4">
                  "{message.content}"
                </p>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-white/30">—</span>
                    <span className="text-white/60">{message.author}</span>
                  </div>
                  {message.location && (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="text-white/40 font-mono text-xs">
                        {message.location}
                      </span>
                    </>
                  )}
                  <span className="text-white/20">·</span>
                  <span className="text-white/30 font-mono text-xs">
                    {formatDate(message.created_at)}
                  </span>
                  <span className="text-white/20">·</span>
                  <span className={`text-xs font-mono ${
                    message.color_pref === 'yellow' ? 'text-lmsy-yellow/60' : 'text-lmsy-blue/60'
                  }`}>
                    {message.color_pref === 'yellow' ? '● Yellow' : '● Blue'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                {!message.is_approved ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleApprove(message.id, true)}
                    disabled={actionLoading === message.id}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    <Check className="w-4 h-4 text-lmsy-blue" />
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleApprove(message.id, false)}
                    disabled={actionLoading === message.id}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      background: 'rgba(251, 191, 36, 0.1)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                    }}
                  >
                    <X className="w-4 h-4 text-lmsy-yellow" />
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDelete(message.id)}
                  disabled={actionLoading === message.id}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </motion.button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
