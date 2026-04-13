import { apiUrl } from '../utils/api';

export const songService = {
    /** List all songs. Viewers only see 'published'. */
    async listSongs(role = 'viewer') {
        const res = await fetch(apiUrl('/api/songs'));
        if (!res.ok) throw new Error('Failed to fetch songs');
        return res.json();
    },

    async getSong(id) {
        const res = await fetch(apiUrl(`/api/songs/${id}`));
        if (!res.ok) throw new Error('Failed to fetch song');
        return res.json();
    },

    /** Upload audio file to Local Storage and return metadata (handled by backend) */
    async uploadAudio(songId, type, file) {
        const formData = new FormData();
        formData.append('audio', file);
        const res = await fetch(apiUrl(`/api/songs/${songId}/swap-audio?type=${type}`), {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error('Failed to upload audio');
        return res.json();
    },

    /** Save or Update song metadata */
    async upsertSong(id, data) {
        if (!id) {
            throw new Error('New song creation via upsert not implemented in local mode yet. Use /upload.');
        }

        const res = await fetch(apiUrl(`/api/songs/${id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!res.ok) throw new Error('Failed to update song');
        return res.json();
    },

    async deleteSong(id) {
        const res = await fetch(apiUrl(`/api/songs/${id}`), {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete song');
        return res.json();
    },

    /** Version History */
    async listVersions(songId) {
        const res = await fetch(apiUrl(`/api/songs/${songId}/versions`));
        if (!res.ok) throw new Error('Failed to fetch versions');
        return res.json();
    },

    async getVersion(songId, vid) {
        const res = await fetch(apiUrl(`/api/songs/${songId}/versions/${vid}`));
        if (!res.ok) throw new Error('Failed to fetch version');
        return res.json();
    },

    async restoreVersion(songId, vid) {
        const res = await fetch(apiUrl(`/api/songs/${songId}/restore/${vid}`), {
            method: 'POST'
        });
        if (!res.ok) throw new Error('Failed to restore version');
        return res.json();
    }
};
