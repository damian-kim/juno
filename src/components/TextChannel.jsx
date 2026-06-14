import { useState, useRef, useEffect } from 'react';
import { Hash, Send, Pencil, Trash2, X, Check } from 'lucide-react';
import { useAppStore } from '../contexts/store';
import './TextChannel.css';

function MessageBubble({ msg, channelId, isOwn, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.text);
  const editInputRef = useRef(null);

  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.selectionStart = editText.length;
    }
  }, [editing]);

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== msg.text) {
      onEdit(channelId, msg.id, trimmed);
    }
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(msg.text);
    setEditing(false);
  };

  const handleEditKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
    if (e.key === 'Escape') handleCancelEdit();
  };

  const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`msg-bubble ${isOwn ? 'own' : ''}`}>
      <div className="msg-header">
        <span className="msg-author">{msg.author}</span>
        <span className="msg-time">{timeStr}</span>
        {msg.edited && <span className="msg-edited-tag">(edited)</span>}
      </div>

      {editing ? (
        <div className="msg-edit-row">
          <textarea
            ref={editInputRef}
            className="msg-edit-input"
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={handleEditKey}
            rows={1}
          />
          <button className="msg-action-btn save" onClick={handleSaveEdit} title="Save">
            <Check size={14} />
          </button>
          <button className="msg-action-btn cancel" onClick={handleCancelEdit} title="Cancel">
            <X size={14} />
          </button>
        </div>
      ) : (
        <p className="msg-text">{msg.text}</p>
      )}

      {!editing && isOwn && (
        <div className="msg-actions">
          <button className="msg-action-btn" onClick={() => { setEditText(msg.text); setEditing(true); }} title="Edit">
            <Pencil size={13} />
          </button>
          <button className="msg-action-btn danger" onClick={() => onDelete(channelId, msg.id)} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

export function TextChannel() {
  const { currentChannel, currentChannelName, messages, sendMessage, deleteMessage, editMessage, user } = useAppStore();
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const channelMessages = messages[currentChannel] || [];

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [channelMessages.length]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || !currentChannel) return;
    sendMessage(currentChannel, trimmed);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="text-channel">
      <div className="text-channel-header">
        <Hash size={16} aria-hidden />
        <span className="font-mono" style={{ fontSize: 14 }}>{currentChannelName}</span>
        <span className="text-muted text-xs" style={{ marginLeft: 8 }}>
          {channelMessages.length} message{channelMessages.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="msg-list" ref={listRef}>
        {channelMessages.length === 0 && (
          <div className="msg-empty">
            <Hash size={32} aria-hidden style={{ opacity: 0.3 }} />
            <p>No messages yet</p>
            <p className="text-muted text-sm">Be the first to send a message in #{currentChannelName}</p>
          </div>
        )}
        {channelMessages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            channelId={currentChannel}
            isOwn={msg.author === user.name}
            onDelete={deleteMessage}
            onEdit={editMessage}
          />
        ))}
      </div>

      <div className="msg-input-bar">
        <textarea
          ref={inputRef}
          className="msg-input"
          placeholder={`Message #${currentChannelName}`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
        />
        <button
          className="msg-send-btn"
          onClick={handleSend}
          disabled={!input.trim()}
          title="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
