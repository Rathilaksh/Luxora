import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Edit2, Check, X, Upload, Shield, Star } from 'lucide-react';

export default function UserProfile({ user, token, onClose, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        bio: user.bio || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/me/avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Avatar updated!' });
        if (onUpdate) {
          onUpdate({ ...user, avatar: data.avatar });
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Upload failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated!' });
        setEditing(false);
        if (onUpdate) {
          onUpdate(data);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Update failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>
          <X />
        </button>

        <div className="profile-header">
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <User size={64} />
              )}
              <label className="avatar-upload-btn" title="Change avatar">
                <Upload size={16} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            {uploading && <p className="upload-status">Uploading...</p>}
          </div>

          <div className="profile-info">
            {editing ? (
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                className="profile-name-input"
              />
            ) : (
              <h2>
                {user.name}
                {user.isVerified && (
                  <Shield size={20} className="verified-badge" title="Verified" />
                )}
                {user.isSuperhost && (
                  <Star size={20} className="superhost-badge" title="Superhost" />
                )}
              </h2>
            )}
            <div className="profile-meta">
              <div className="profile-meta-item">
                <Mail size={16} />
                <span>{user.email}</span>
              </div>
              {(editing || user.phone) && (
                <div className="profile-meta-item">
                  <Phone size={16} />
                  {editing ? (
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Phone number"
                    />
                  ) : (
                    <span>{user.phone || 'Not provided'}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {!editing ? (
            <button className="edit-btn" onClick={() => setEditing(true)}>
              <Edit2 size={16} />
              Edit Profile
            </button>
          ) : (
            <div className="edit-actions">
              <button className="save-btn" onClick={handleSave} disabled={saving}>
                <Check size={16} />
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setEditing(false);
                  setForm({
                    name: user.name || '',
                    bio: user.bio || '',
                    phone: user.phone || '',
                  });
                }}
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="profile-bio">
          <h3>About</h3>
          {editing ? (
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          ) : (
            <p>{user.bio || 'No bio yet.'}</p>
          )}
        </div>

        {user.responseRate !== null && user.responseTime && (
          <div className="profile-stats">
            <div className="stat">
              <strong>{user.responseRate}%</strong>
              <span>Response rate</span>
            </div>
            <div className="stat">
              <strong>{user.responseTime}</strong>
              <span>Response time</span>
            </div>
          </div>
        )}

        {message && (
          <div className={`alert ${message.type === 'success' ? 'success' : ''}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
