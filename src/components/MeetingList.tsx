import { useState, useEffect } from 'react';
import { supabase, Meeting } from '../lib/supabase';
import { MeetingCard } from './MeetingCard';
import { Loader2, FileText } from 'lucide-react';

interface MeetingListProps {
  refreshTrigger: number;
}

export function MeetingList({ refreshTrigger }: MeetingListProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetings();

    // Subscribe to realtime changes for meetings to reflect processing status updates
    const channel = supabase
      .channel('public:meetings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
        },
        (payload) => {
          setMeetings((prev) => {
            const newRow = payload.new as Meeting | null;
            const oldRow = payload.old as Meeting | null;
            switch (payload.eventType) {
              case 'INSERT':
                return newRow ? [newRow, ...prev] : prev;
              case 'UPDATE': {
                if (!newRow) return prev;
                return prev.map((m) => (m.id === newRow.id ? { ...m, ...newRow } : m));
              }
              case 'DELETE':
                if (!oldRow) return prev;
                return prev.filter((m) => m.id !== oldRow.id);
              default:
                return prev;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshTrigger]);

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (err) {
      console.error('Error fetching meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMeetings(meetings.filter(m => m.id !== id));
    } catch (err) {
      console.error('Error deleting meeting:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-700/50">
        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-400 mb-2">No meetings yet</h3>
        <p className="text-slate-500">Upload your first meeting recording to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <MeetingCard
          key={meeting.id}
          meeting={meeting}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
