import { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/supabase';
import { Table, Card, Button } from '@/components/ui';

interface HeadBaristaAuditItem {
  id: string;
  auditType: string;
  score: number;
  comments?: string;
  passed: boolean;
}

export default function HeadBaristaAudit() {
  const { supabase, user, loading: authLoading } = useSupabase();
  const [audits, setAudits] = useState<HeadBaristaAuditItem[]>([]);
  const [actions, setActions] = useState<Array<{id: string; type: string; description: string; dueDate: string; assignedTo: string; completed: boolean}>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch audit results and corrective actions
  useEffect(() => {
    const fetchAuditData = async () => {
      if (authLoading) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get audit results
        const { data: auditsData, error: auditsError } = await supabase
          .from('audit_results')
          .select('id, audit_type, score, comments, passed, created_at, profiles!audited_by(username)')
          .order('created_at', { ascending: false })
          .limit(10);

        if (auditsError) throw auditsError;

        // Transform the data to match our interface
        const transformedAudits: HeadBaristaAuditItem[] = auditsData.map(audit => ({
          id: audit.id,
          auditType: audit.audit_type,
          score: audit.score,
          comments: audit.comments ?? undefined,
          passed: audit.passed
        }));
        
        setAudits(transformedAudits);

        // Get corrective actions
        const { data: actionsData, error: actionsError } = await supabase
          .from('corrective_actions')
          .select('id, action_type, description, due_date, completed, profiles!assigned_to(username)')
          .order('due_date', { ascending: true });

        if (!actionsError && actionsData) {
          // Transform the data to match our interface for display
          const transformedActions = actionsData.map(action => ({
            id: action.id,
            type: action.action_type,
            description: action.description,
            dueDate: action.due_date,
            assignedTo: action.profiles?.username ?? 'Unknown',
            completed: action.completed
          }));
          
          setActions(transformedActions);
        } else {
          // Fallback to mock actions if table doesn't exist or query fails
          setActions([
            { id: '1', type: 'Retraining', description: 'Conduct additional training on whisk technique for matcha preparation', dueDate: '2026-10-25', assignedTo: 'John Ararat', completed: false },
            { id: '2', type: 'Process Update', description: 'Update standard operating procedure for pour-over brewing', dueDate: '2026-10-30', assignedTo: 'Maria Petrosian', completed: false },
          ]);
        }
      } catch (err: any) {
        console.error('Failed to fetch audit data:', err);
        setError(err.message || 'Failed to load audit data');
        
        // Fallback to mock data
        setAudits([
          { id: '1', auditType: 'Espresso Consistency', score: 95, comments: 'Consistent extraction times throughout shift', passed: true },
          { id: '2', auditType: 'Filter Coffee Quality', score: 88, comments: 'Minor variation in pour-over shots', passed: true },
          { id: '3', auditType: 'Matcha Standardization', score: 82, comments: 'Need tighter control on whisk strength', passed: false },
          { id: '4', auditType: 'Sanitation Compliance', score: 90, comments: 'All stations cleaned and logged', passed: true },
        ]);
        
        setActions([
          { id: '1', type: 'Retraining', description: 'Conduct additional training on whisk technique for matcha preparation', dueDate: '2026-10-25', assignedTo: 'John Ararat', completed: false },
          { id: '2', type: 'Process Update', description: 'Update standard operating procedure for pour-over brewing', dueDate: '2026-10-30', assignedTo: 'Maria Petrosian', completed: false },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditData();
  }, [supabase, user, authLoading]);

  // Handle marking an audit as passed (when corrective actions are completed)
  const handleComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('audit_results')
        .update({ passed: true })
        .eq('id', id);

      if (error) throw error;

      // Update local state optimistically
      setAudits(prevAudits => 
        prevAudits.map(audit => 
          audit.id === id ? { ...audit, passed: true } : audit
        )
      );
    } catch (err: any) {
      console.error('Failed to update audit:', err);
      // Show error to user or revert optimistic update
      setError(err.message || 'Failed to update audit');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading audit data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <p className="font-medium">Error loading audit data</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              // Trigger a refetch
              window.location.reload();
            }}
            className="mt-2 btn btn-xs"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Head Barista Audit</CardTitle>
          <CardDescription>Quality control and performance review</CardDescription>
        </CardHeader>
        <Table>
          <thead>
            <tr>
              <th>Audit Type</th>
              <th>Score</th>
              <th>Comments</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {audits.map((audit) => (
              <tr key={audit.id}>
                <td className="font-medium">{audit.auditType}</td>
                <td className="text-xs">{audit.score}</td>
                {audit.comments && (
                  <span className="text-xs text-gray-500">{audit.comments}</span>
                )}
                <td className={audit.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                  {audit.passed ? '✓ Passed' : '⬜ Failed'}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Corrective Actions</CardTitle>
          <CardDescription>Actions taken after audit findings</CardDescription>
        </CardHeader>
        <div className="space-y-2">
          {actions.length > 0 ? (
            actions.map((action) => (
              <div key={action.id} className="bg-warm-offwhite p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between">
                  <strong>{action.type}</strong>
                  <span className={`${action.completed ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'`}>
                    {action.completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                <p className="text-xs text-gray-500">Due: {action.dueDate} | Assigned to: {action.assignedTo}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No corrective actions pending.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
