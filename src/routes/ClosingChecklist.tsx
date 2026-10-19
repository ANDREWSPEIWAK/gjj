import { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/supabase';
import { Table, Card, Button, Input, Select, Checkbox } from '@/components/ui';

interface ClosingChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  notes?: string;
}

export default function ClosingChecklist() {
  const { supabase, user, loading: authLoading } = useSupabase();
  const [items, setItems] = useState<ClosingChecklistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch checklist items for today's closing checklist
  useEffect(() => {
    const fetchChecklist = async () => {
      if (authLoading) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get or create today's closing checklist
        const today = new Date().toISOString().split('T')[0];
        
        // First, try to find an existing closing checklist for today
        const { data: checklistData, error: checklistError } = await supabase
          .from('checklist_tables')
          .select('id, checklist_title')
          .eq('checklist_title', 'Closing Checklist')
          .single();

        if (checklistError && checklistError.code !== 'PGRST116') { // PGRST116 means no rows returned
          throw checklistError;
        }

        let checklistId: string;
        if (checklistData) {
          checklistId = checklistData.id;
        } else {
          // Create a new closing checklist for today
          const { data: newChecklist, error: createError } = await supabase
            .from('checklist_tables')
            .insert([
              {
                checklist_title: 'Closing Checklist',
                created_by: user?.id ?? ''
              }
            ])
            .select()
            .single();

          if (createError) throw createError;
          checklistId = newChecklist.id;
        }

        // Get the checklist items for this checklist
        const { data: itemsData, error: itemsError } = await supabase
          .from('checklist_items')
          .select('id, title, completed, notes')
          .eq('checklist_id', checklistId)
          .order('id');

        if (itemsError) throw itemsError;

        // Transform the data to match our interface
        const transformedItems: ClosingChecklistItem[] = itemsData.map(item => ({
          id: item.id,
          title: item.title,
          completed: item.completed,
          notes: item.notes ?? undefined
        }));

        setItems(transformedItems);
      } catch (err: any) {
        console.error('Failed to fetch checklist:', err);
        setError(err.message || 'Failed to load checklist');
        
        // Fallback to mock data if database fails
        setItems([
          { id: '1', title: 'Clean espresso machine', completed: false, notes: 'Wipe down group heads and portafilters' },
          { id: '2', title: 'Descale water system', completed: false, notes: 'Run descaling cycle' },
          { id: '3', title: 'Sanitize grinders', completed: false, notes: 'Remove oil residue' },
          { id: '4', title: 'Empty trash bins', completed: false, notes: 'Replace liners' },
          { id: '5', title: 'Check inventory levels', completed: false, notes: 'Update stock records' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchChecklist();
  }, [supabase, user, authLoading]);

  // Handle completing a checklist item
  const handleComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({ completed: true })
        .eq('id', id);

      if (error) throw error;

      // Update local state optimistically
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === id ? { ...item, completed: true } : item
        )
      );
    } catch (err: any) {
      console.error('Failed to update checklist item:', err);
      // Show error to user or revert optimistic update
      setError(err.message || 'Failed to update task');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading checklist...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <p className="font-medium">Error loading checklist</p>
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
          <CardTitle>Closing Checklist</CardTitle>
          <CardDescription>Finalize day's operations and prepare for next shift</CardDescription>
        </CardHeader>
        <Table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="font-medium">{item.title}</td>
                <td className={`${item.completed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'`}>
                  {item.completed ? '✓ Completed' : '⬜ Incomplete'}
                </td>
                {item.notes && (
                  <span className="text-xs text-gray-500">{item.notes}</span>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipment Cleanup</CardTitle>
          <CardDescription>Clean and sanitize all equipment</CardDescription>
        </CardHeader>
        <div className="space-y-2">
          {/* In a real app, we would fetch equipment status from the database */}
          <div className="flex items-center justify-between bg-warm-offwhite rounded-lg p-3 border border-gray-200">
            <span className="font-medium">Espresso Machine</span>
            <span className="text-sm text-gray-600">Clean</span>
          </div>
          <div className="flex items-center justify-between bg-warm-offwhite rounded-lg p-3 border border-gray-200">
            <span className="font-medium">Grinders</span>
            <span className="text-sm text-gray-600">Sanitized</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
