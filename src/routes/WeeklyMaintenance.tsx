import { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/supabase';
import { Table, Card, Button } from '@/components/ui';

interface WeeklyMaintenanceItem {
  id: string;
  task: string;
  completed: boolean;
  scheduledFor?: string;
  priority?: string;
}

export default function WeeklyMaintenance() {
  const { supabase, user, loading: authLoading } = useSupabase();
  const [items, setItems] = useState<WeeklyMaintenanceItem[]>([]);
  const [upcoming, setUpcoming] = useState<Array<{id: string; task: string; priority: string}>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch weekly maintenance tasks and upcoming tasks
  useEffect(() => {
    const fetchMaintenanceData = async () => {
      if (authLoading) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get weekly maintenance tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('maintenance_tasks')
          .select('id, task_description, scheduled_for, completed, performed_by, profiles!performed_by(username)')
          .order('scheduled_for');

        if (tasksError) throw tasksError;

        // Transform the data to match our interface
        const transformedItems: WeeklyMaintenanceItem[] = tasksData.map(task => ({
          id: task.id,
          task: task.task_description,
          completed: task.completed,
          scheduledFor: task.scheduled_for ?? undefined,
          priority: 'Medium' // Default priority, could be stored in task or derived
        }));
        
        setItems(transformedItems);

        // Get upcoming tasks (maintenance tasks scheduled for the future)
        const today = new Date().toISOString().split('T')[0];
        const { data: upcomingData, error: upcomingError } = await supabase
          .from('maintenance_tasks')
          .select('id, task_description, priority, profiles!performed_by(username)')
          .gte('scheduled_for', today)
          .eq('completed', false)
          .order('scheduled_for')
          .limit(5);

        if (!upcomingError && upcomingData) {
          // Transform the data to match our interface for display
          const transformedUpcoming = upcomingData.map(task => ({
            id: task.id,
            task: task.task_description,
            priority: task.priority ?? 'Medium'
          }));
          
          setUpcoming(transformedUpcoming);
        } else {
          // Fallback to mock upcoming data
          setUpcoming([
            { id: '1', task: 'Calibrate espresso tampers', priority: 'High' },
            { id: '2', task: 'Deep clean milk steamers', priority: 'Medium' },
            { id: '3', task: 'Check water pressure levels', priority: 'Low' },
          ]);
        }
      } catch (err: any) {
        console.error('Failed to fetch maintenance data:', err);
        setError(err.message || 'Failed to load maintenance data');
        
        // Fallback to mock data
        setItems([
          { id: '1', task: 'Inspect espresso machine pressure gauges', completed: false, scheduledFor: '2026-10-20' },
          { id: '2', task: 'Clean water filtration system', completed: false, scheduledFor: '2026-10-21' },
          { id: '3', task: 'Calibrate grinder settings', completed: false, scheduledFor: '2026-10-22' },
          { id: '4', task: 'Deep clean refrigeration unit', completed: false, scheduledFor: '2026-10-25' },
          { id: '5', task: 'Replace air filters', completed: false, scheduledFor: '2026-10-26' },
        ]);
        
        setUpcoming([
          { id: '1', task: 'Calibrate espresso tampers', priority: 'High' },
          { id: '2', task: 'Deep clean milk steamers', priority: 'Medium' },
          { id: '3', task: 'Check water pressure levels', priority: 'Low' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenanceData();
  }, [supabase, user, authLoading]);

  // Handle completing a maintenance task
  const handleComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('maintenance_tasks')
        .update({ 
          completed: true,
          performed_by: user?.id ?? '',
          completed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Update local state optimistically
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === id ? { ...item, completed: true } : item
        )
      );
    } catch (err: any) {
      console.error('Failed to update maintenance task:', err);
      // Show error to user or revert optimistic update
      setError(err.message || 'Failed to update task');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading maintenance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <p className="font-medium">Error loading maintenance data</p>
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
          <CardTitle>Weekly Maintenance</CardTitle>
          <CardDescription>Scheduled maintenance tasks for the week</CardDescription>
        </CardHeader>
        <Table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Scheduled For</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="font-medium">{item.task}</td>
                <td className="text-xs text-gray-500">{item.scheduledFor ?? ''}</td>
                <td className={item.completed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                  {item.completed ? '✓ Scheduled' : '⬜ Pending'}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Tasks</CardTitle>
          <CardDescription>Tasks due this week</CardDescription>
        </CardHeader>
        <div className="space-y-2">
          {upcoming.length > 0 ? (
            upcoming.map((up) => (
              <div key={up.id} className="bg-warm-offwhite p-3 rounded-lg border border-gray-200">
                <strong>{up.task}</strong>
                <span className="text-xs text-gray-500 ml-2">{up.priority}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No upcoming tasks.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
