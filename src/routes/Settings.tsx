import { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/supabase';
import { Table, Card, Button } from '@/components/ui';

interface SettingsItem {
  id: string;
  title: string;
  value: string;
  type?: 'select' | 'textarea' | 'checkbox';
}

export default function Settings() {
  const { supabase, user, loading: authLoading } = useSupabase();
  const [settings, setSettings] = useState<SettingsItem[]>([]);
  const [roles, setRoles] = useState<Array<{id: string; name: string; permissions: string[]}>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings and user roles
  useEffect(() => {
    const fetchSettingsData = async () => {
      if (authLoading) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get settings from database
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('id, setting_name, current_value, setting_type, description')
          .order('setting_name');

        if (settingsError) throw settingsError;

        // Transform the data to match our interface
        const transformedSettings: SettingsItem[] = settingsData.map(setting => ({
          id: setting.id,
          title: setting.setting_name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          value: setting.current_value,
          type: setting.setting_type === 'boolean' ? 'checkbox' : undefined
        }));
        
        setSettings(transformedSettings);

        // Get user roles/profiles for user management section
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, role, email, created_at')
          .order('username');

        if (!profilesError && profilesData) {
          // Transform the data to match our interface for display
          const transformedRoles = profilesData.map(profile => ({
            id: profile.id,
            name: profile.username,
            permissions: [
              profile.role === 'admin' ? 'Full Access' : 
              profile.role === 'head_barista' ? 'Management Access' : 
              'Basic Access'
            ].filter(Boolean)
          }));
          
          setRoles(transformedRoles);
        } else {
          // Fallback to mock roles data
          setRoles([
            { id: '1', name: 'admin', permissions: ['Full Access', 'User Management', 'System Configuration'] },
            { id: '2', name: 'head_barista', permissions: ['Management Access', 'Audit Approval', 'Schedule Management'] },
            { id: '3', name: 'barista', permissions: ['Basic Access', 'Task Completion'] },
          ]);
        }
      } catch (err: any) {
        console.error('Failed to fetch settings data:', err);
        setError(err.message || 'Failed to load settings');
        
        // Fallback to mock data
        setSettings([
          { id: '1', title: 'Enable Analytics Reporting', value: 'true', type: 'checkbox' },
          { id: '2', title: 'Send Daily Summaries via Email', value: 'true', type: 'checkbox' },
          { id: '3', title: 'Allow Remote Access to Dashboard', value: 'false', type: 'checkbox' },
          { id: '4', title: 'Enable Two-Factor Authentication', value: 'true', type: 'checkbox' },
        ]);
        
        setRoles([
          { id: '1', name: 'admin', permissions: ['Full Access', 'User Management', 'System Configuration'] },
          { id: '2', name: 'head_barista', permissions: ['Management Access', 'Audit Approval', 'Schedule Management'] },
          { id: '3', name: 'barista', permissions: ['Basic Access', 'Task Completion'] },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSettingsData();
  }, [supabase, user, authLoading]);

  // Handle toggling a setting
  const handleToggle = async (id: string) => {
    try {
      // Find the setting to update
      const setting = settings.find(s => s.id === id);
      if (!setting) return;

      // Update in database
      const { error } = await supabase
        .from('settings')
        .update({ 
          current_value: setting.value === 'true' ? 'false' : 'true',
          updated_by: user?.id ?? '',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Update local state optimistically
      setSettings(prevSettings => 
        prevSettings.map(s => 
          s.id === id ? { ...s, value: s.value === 'true' ? 'false' : 'true' } : s
        )
      );
    } catch (err: any) {
      console.error('Failed to update setting:', err);
      // Show error to user or revert optimistic update
      setError(err.message || 'Failed to update setting');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <p className="font-medium">Error loading settings</p>
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
          <CardTitle>System Settings</CardTitle>
          <CardDescription>Configuration and preferences</CardDescription>
        </CardHeader>
        <Table>
          <thead>
            <tr>
              <th>Setting</th>
              <th>Value</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <tr key={setting.id}>
                <td className="font-medium">{setting.title}</td>
                <td className="text-sm">{setting.value}</td>
                {setting.type && (
                  <select 
                    className="form-select" 
                    value={setting.value} 
                    onChange={(e) => {
                      // In a real app, this would update Supabase settings
                      // We're not updating the state here because we handle updates through the toggle
                      // But we could add a text input handler here for non-boolean settings
                    }}
                  >
                    <option value="">-- Select --</option>
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Role assignments and permissions</CardDescription>
        </CardHeader>
        <div className="space-y-2">
          {roles.length > 0 ? (
            roles.map((role) => (
              <div key={role.id} className="bg-warm-offwhite p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between">
                  <strong>{role.name}</strong>
                  <span className="text-xs text-gray-500">{role.permissions.length} permissions</span>
                </div>
                {role.permissions.map((permission, index) => (
                  <span key={index} className="block text-xs text-gray-600">• {permission}</span>
                ))}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No users found.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
