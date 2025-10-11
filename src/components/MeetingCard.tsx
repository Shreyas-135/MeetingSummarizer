import { useState } from 'react';
import { Meeting } from '../lib/supabase';
import { Clock, CheckCircle2, Loader2, Trash2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

interface MeetingCardProps {
  meeting: Meeting;
  onDelete: (id: string) => void;
}

export function MeetingCard({ meeting, onDelete }: MeetingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    setDeleting(true);
    await onDelete(meeting.id);
  };

  const getStatusIcon = () => {
    switch (meeting.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <Clock className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    switch (meeting.status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing...';
      case 'failed':
        return 'Failed';
      default:
        return 'Uploading...';
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden transition-all hover:border-slate-600/50">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">{meeting.title}</h3>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(meeting.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                {getStatusText()}
              </div>
            </div>
          </div>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            title="Delete meeting"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {meeting.status === 'completed' && (
          <>
            {meeting.summary && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Summary</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{meeting.summary}</p>
              </div>
            )}

            {meeting.key_decisions && meeting.key_decisions.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Key Decisions</h4>
                <ul className="space-y-2">
                  {meeting.key_decisions.map((decision, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{decision}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {meeting.action_items && meeting.action_items.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Action Items</h4>
                <ul className="space-y-2">
                  {meeting.action_items.map((item, index) => (
                    <li key={index} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                      <p className="text-sm text-white mb-1">{item.task}</p>
                      <p className="text-xs text-slate-500">Assigned to: {item.assignee}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {meeting.transcript && (
              <div>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors mb-2"
                >
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {expanded ? 'Hide' : 'Show'} Full Transcript
                </button>

                {expanded && (
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 max-h-96 overflow-y-auto">
                    <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {meeting.transcript}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {meeting.status === 'processing' && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Processing your meeting recording...</p>
          </div>
        )}

        {meeting.status === 'failed' && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <p className="text-sm text-red-400">
              Processing failed. Please try uploading again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
