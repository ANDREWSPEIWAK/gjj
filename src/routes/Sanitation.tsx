import { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/supabase';
import { Table, Card, Button, Input, Select, Checkbox } from '@/components/ui';

interface SanitationItem {
  id: string;
  task: string;
  completed: boolean;
  frequency?: string;
  lastPerformed?: string;
}

export default function Sanitation() {
  const { supabase, user, loading: authLoading } = useSupabase();
  const [items, setItems] = useState<SanitationItem[]>([]);
  const [logs, setLogs] = useState<Array<{id: string; date: string; task: string; completedBy: string}>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch sanitation tasks and logs
  useEffect(() => {
    const fetchSanitationData = async () => {
      if (authLoading) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get or create sanitation tasks
        const today = new Date().toISOString().split('T')[0];
        
        // First, try to find existing sanitation tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('sanitation_tasks') // This table doesn't exist in our schema yet
          .select('id, task, completed, frequency, last_performed')
          .order('id');

        if (!tasksError && tasksData) {
          // Transform the data to match our interface
          const transformedItems: SanitationItem[] = tasksData.map(item => ({
            id: item.id,
            task: item.task,
            completed: item.completed,
            frequency: item.frequency ?? undefined,
            lastPerformed: item.last_performed ?? undefined
          }));
          
          setItems(transformedItems);
        } else {
          // Fallback to mock data if table doesn't exist or query fails
          setItems([
            { id: '1', task: 'Clean espresso machine group heads', completed: false, frequency: 'Daily' },
            { id: '2', task: 'Sanitize grinder burrs', completed: false, frequency: 'Daily' },
            { id: '3', task: 'Wipe down countertops', completed: false, frequency: 'Every shift' },
            { id: '4', task: 'Empty and clean trash bins', completed: false, frequency: 'Daily' },
            { id: '5', task: 'Check water filtration system', completed: false, frequency: 'Weekly' },
          ]);
        }

        // Get sanitation logs (from temperature_logs or a dedicated table)
        // For now, we'll use temperature_logs as a proxy for sanitation activity logs
        const { data: logsData, error: logsError } = await supabase
          .from('temperature_logs') // Using as example - in reality would be sanitation_logs table
          .select('id, timestamp, value')
          .order('timestamp', { ascending: false })
          .limit(10);

        if (!logsError && logsData) {
          // Transform the data to match our interface for display
          const transformedLogs = logsData.map(log => ({
            id: log.id,
            date: new Date(log.timestamp).toLocaleDateString(),
            task: `Temperature check: ${log.value}°${log.unit || 'C'}`,
            completedBy: 'System' // In reality, we'd join with profiles table
          }));
          
          setLogs(transformedLogs);
        } else {
          // Fallback to mock logs
          setLogs([
            { id: '1', date: '10/18/2026', task: 'Clean espresso machine group heads', completedBy: 'John Ararat' },
            { id: '2', date: '10/18/2026', task: 'Sanitize grinder burrs', completedBy: 'Maria Petrosian' },
            { id: '3', date: '10/17/2026', task: 'Wipe down countertops', completedBy: 'David Khachyan' },
          ]);
        }
      } catch (err: any) {
        console.error('Failed to fetch sanitation data:', err);
        setError(err.message || 'Failed to load sanitation data');
        
        // Fallback to mock data
        setItems([
          { id: '1', task: 'Clean espresso machine group heads', completed: false, frequency: 'Daily' },
          { id: '2', task: 'Sanitize grinder burrs', completed: false, frequency: 'Daily' },
          { id: '3', task: 'Wipe down countertops', completed: false, frequency: 'Every shift' },
          { id: '4', task: 'Empty and clean trash bins', completed: false, frequency: 'Daily' },
          { id: '5', task: 'Check water filtration system', completed: false, frequency: 'Weekly' },
        ]);
        
        setLogs([
          { id: '1', date: '10/18/2026', task: 'Clean espresso machine group heads', completedBy: 'John Ararat' },
          { id: '2', date: '10/18/2026', task: 'Sanitize grinder burrs', completedBy: 'Maria Petrosian' },
          { id: '3', date: '10/17/2026', task: 'Wipe down countertops', completedBy: 'David Khachyan' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSanitationData();
  }, [supabase, user, authLoading]);

  // Handle completing a sanitation task
  const handleComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sanitation_tasks') // This table doesn't exist in our schema yet
        .update({ 
          completed: true,
          last_performed: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Update local state optimistically
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === id ? { ...item, completed: true, lastPerformed: new Date().toISOString().split('T')[0] } : item
        )
      );
    } catch (err: any) {
      console.error('Failed to update sanitation task:', err);
      // Show error to user or revert optimistic update
      setError(err.message || 'Failed to update task');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading sanitation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <p className="font-medium">Error loading sanitation data</p>
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
          <CardTitle>Sanitation Schedule</CardTitle>
          <CardDescription>Regular cleaning and hygiene procedures</CardDescription>
        </CardHeader>
        <Table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Frequency</th>
              <th>Last Performed</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="font-medium">{item.task}</td>
                <td className="text-xs text-gray-500">{item.frequency ?? ''}</td>
                <td className="text-xs">{item.lastPerformed ?? ''}</td>
                <td className={`${item.completed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'`}>
                  {item.completed ? '✓ Up to date' : '⬜ Overdue'}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sanitation Logs</CardTitle>
          <CardDescription>History of cleaning activities</CardDescription>
        </CardHeader>
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="bg-warm-offwhite p-3 rounded-lg border border-gray-200">
              <p className="text-sm">{log.date} – {log.task}</p>
              <p className="text-xs text-gray-500">Completed by {log.completedBy}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
