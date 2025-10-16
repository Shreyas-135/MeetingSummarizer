import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Loader2 } from 'lucide-react';

interface MeetingUploadProps {
  onUploadComplete: () => void;
}

export function MeetingUpload({ onUploadComplete }: MeetingUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Please select an audio file');
      return;
    }

    if (!file.type.startsWith('audio/')) {
      setError('Please upload an audio file');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('meeting-audio')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: meeting, error: insertError } = await supabase
        .from('meetings')
        .insert({
          title: title || 'Untitled Meeting',
          audio_url: uploadData.path,
          status: 'uploading',
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-meeting`;
      const { data: { session } } = await supabase.auth.getSession();

      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: meeting.id,
          audioUrl: uploadData.path,
        }),
      }).catch(err => console.error('Background processing error:', err));

      setTitle('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleFileUpload} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      <h2 className="text-xl font-semibold text-white mb-4">Upload Meeting Recordings</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
            Meeting Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Q4 Planning Meeting"
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label htmlFor="audio" className="block text-sm font-medium text-slate-300 mb-2">
            Audio File
          </label>
          <div className="relative">
            <input
              ref={fileInputRef}
              id="audio"
              type="file"
              accept="audio/*"
              required
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">Formats Supported: MP3, WAV, M4A, WEBM</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload & Process
            </>
          )}
        </button>
      </div>
    </form>
  );
}
