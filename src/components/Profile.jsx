import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, MapPin, Briefcase, FileText, LogOut, ChevronLeft, Save, Loader2, Camera } from 'lucide-react';

export default function Profile({ theme, onBack }) {
    const { user, logout, updateProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        name: user?.name || '',
        title: user?.title || '',
        bio: user?.bio || '',
        location: user?.location || ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                title: user.title || '',
                bio: user.bio || '',
                location: user.location || ''
            });
        }
    }, [user]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateProfile(formData);
            setIsEditing(false);
        } catch (err) {
            alert('Failed to update profile: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return null;

    const isDark = theme !== 'light';

    return (
        <div className="py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Back Button */}
            <div className="flex items-center justify-between mb-8">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--bg-card-hover)] transition-all group"
                >
                    <ChevronLeft className="w-4 h-4 text-emerald-500 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Back</span>
                </button>
                
                {!isEditing && (
                    <button 
                        onClick={logout}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500 hover:text-white transition-all text-rose-500"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Logout</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Avatar & Quick Info */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="glass-card p-8 flex flex-col items-center text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                        
                        <div className="relative mb-6">
                            <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-emerald-500/20 shadow-2xl transition-transform group-hover:scale-105 duration-500">
                                <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white border-4 border-[var(--bg-card)] shadow-lg">
                                <User className="w-5 h-5" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-black text-[var(--text-primary)] mb-1">{user.name}</h2>
                        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-6">
                            {user.role}
                        </div>

                        <div className="w-full space-y-3 pt-6 border-t border-[var(--glass-border)]">
                            <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                <Mail className="w-4 h-4 text-emerald-500/60" />
                                <span className="text-sm truncate">{user.email}</span>
                            </div>
                            {user.location && (
                                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                    <MapPin className="w-4 h-4 text-emerald-500/60" />
                                    <span className="text-sm">{user.location}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-4">Account Stats</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <div className="text-2xl font-black text-[var(--text-primary)]">0</div>
                                <div className="text-[9px] uppercase tracking-widest text-[var(--text-secondary)]">Songs Edited</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <div className="text-2xl font-black text-[var(--text-primary)]">0</div>
                                <div className="text-[9px] uppercase tracking-widest text-[var(--text-secondary)]">Practiced</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Profile Details / Form */}
                <div className="lg:col-span-8">
                    <div className="glass-card p-8 h-full">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--glass-border)]">
                            <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)]">Profile Details</h2>
                            {!isEditing ? (
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    Edit Profile
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-all text-[var(--text-secondary)]"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                        Save Changes
                                    </button>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                        <User className="w-3 h-3" /> Full Name
                                    </label>
                                    <input 
                                        type="text"
                                        disabled={!isEditing}
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--glass-border)] text-[var(--text-primary)] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all disabled:opacity-50"
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                        <Briefcase className="w-3 h-3" /> Professional Title
                                    </label>
                                    <input 
                                        type="text"
                                        disabled={!isEditing}
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--glass-border)] text-[var(--text-primary)] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all disabled:opacity-50"
                                        placeholder="e.g. Carnatic Student"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                    <MapPin className="w-3 h-3" /> Location
                                </label>
                                <input 
                                    type="text"
                                    disabled={!isEditing}
                                    value={formData.location}
                                    onChange={e => setFormData({...formData, location: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--glass-border)] text-[var(--text-primary)] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all disabled:opacity-50"
                                    placeholder="City, Country"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                    <FileText className="w-3 h-3" /> Biography
                                </label>
                                <textarea 
                                    disabled={!isEditing}
                                    rows={5}
                                    value={formData.bio}
                                    onChange={e => setFormData({...formData, bio: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--glass-border)] text-[var(--text-primary)] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all disabled:opacity-50 resize-none"
                                    placeholder="Tell us about your musical journey..."
                                />
                            </div>
                        </form>

                        {!isEditing && !user.bio && !user.title && !user.location && (
                            <div className="mt-8 p-6 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 text-center">
                                <p className="text-xs text-emerald-500/80 mb-4">Your profile is looking a bit empty! Add details to help others know you better.</p>
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:underline"
                                >
                                    Complete Profile →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
