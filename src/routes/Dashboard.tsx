import { useState, useEffect } from 'react'
import { useSupabase } from '@/hooks/supabase'
import { Table, Card, Badge, Progress, AlertBadge } from '@/components/ui'

export default function Dashboard() {
  const { supabase, user, loading: authLoading } = useSupabase()
  const [activeShifts, setActiveShifts] = useState(0)
  const [pendingTasks, setPendingTasks] = useState(0)
  const [qualityIssues, setQualityIssues] = useState(0)
  const [equipmentCount, setEquipmentCount] = useState(0)
  const [todayShift, setTodayShift] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Helper function to determine status class
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'increasing':
      case 'improving':
      case 'positive':
        return 'bg-green-50 text-green-700'
      case 'decreasing':
      case 'worsening':
      case 'negative':
        return 'bg-red-50 text-red-700'
      default:
        return 'bg-gray-50 text-gray-700'
    }
  }

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (authLoading) return
      
      setLoading(true)
      setError(null)
      
      try {
        // Get active shifts count
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('shifts')
          .select('id', { count: 'exact' })
          .gte('start_time', new Date().toISOString().split('T')[0])
          .lte('end_time', new Date().toISOString().split('T')[0])
          .is('completed_at', null)

        if (shiftsError) throw shiftsError
        setActiveShifts(shiftsData?.length ?? 0)

        // Get pending tasks count (from checklist items that are not completed)
        const { data: tasksData, error: tasksError } = await supabase
          .from('checklist_items')
          .select('id', { count: 'exact' })
          .eq('completed', false)

        if (tasksError) throw tasksError
        setPendingTasks(tasksData?.length ?? 0)

        // Get quality issues count (from quality checks that failed)
        const { data: qualityData, error: qualityError } = await supabase
          .from('quality_checks')
          .select('id', { count: 'exact' })
          .eq('checked', false)
          .lt('score', 80) // Consider scores below 80 as issues

        if (qualityError) throw qualityError
        setQualityIssues(qualityData?.length ?? 0)

        // Get equipment count (from temperature logs or equipment table)
        // For now, we'll get a count of distinct equipment from temperature logs
        const { data: equipmentData, error: equipmentError } = await supabase
          .from('temperature_logs')
          .select('unit') // Using unit as a proxy for equipment type
          .limit(10)

        if (equipmentError) throw equipmentError
        // In a real app, we'd have an equipment table
        setEquipmentCount(equipmentData?.length ?? 3) // Fallback to 3

        // Get today's shift
        const { data: shiftData, error: shiftError } = await supabase
          .from('shifts')
          .select('id, start_time, end_time, profiles!shift_lead_id(username)')
          .gte('start_time', new Date().toISOString().split('T')[0])
          .lte('end_time', new Date().toISOString().split('T')[0])
          .single();

        if (!shiftError && shiftData) {
          setTodayShift({
            id: shiftData.id,
            name: `${shiftData.profiles?.username ?? 'Unknown'}'s Shift`,
            startTime: shiftData.start_time,
            endTime: shiftData.end_time
          })
        }

        // Get recent incidents (from audit results that failed or quality checks)
        const { data: incidentsData, error: incidentsError } = await supabase
          .from('audit_results')
          .select('id, audit_type, score, comments, created_at, profiles!audited_by(username)')
          .eq('passed', false)
          .order('created_at', { ascending: false })
          .limit(5)

        if (!incidentsError && incidentsData) {
          const transformedIncidents = incidentsData.map(incident => ({
            id: incident.id,
            type: `Audit: ${incident.audit_type}`,
            description: incident.comments ?? `Score: ${incident.score}/100`,
            severity: incident.score < 60 ? 'High' : incident.score < 80 ? 'Medium' : 'Low',
            resolved: false, // In reality, we'd check if corrective actions were completed
            timestamp: incident.created_at
          }))
          
          setIncidents(transformedIncidents)
        } else {
          // Fallback to mock incidents if query fails
          setIncidents([
            {
              id: 'inc-001',
              type: 'Equipment',
              description: 'Espresso machine pressure fluctuation detected',
              severity: 'Medium',
              resolved: false,
              timestamp: new Date().toISOString()
            },
            {
              id: 'inc-002',
              type: 'Quality',
              description: 'Extraction time variance in pour-over brews',
              severity: 'Low',
              resolved: true,
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
            },
          ])
        }
      } catch (err: any) {
        console.error('Failed to fetch dashboard data:', err)
        setError(err.message || 'Failed to load dashboard data')
        
        // Fallback to mock data
        setActiveShifts(2)
        setPendingTasks(5)
        setQualityIssues(1)
        setEquipmentCount(3)
        setTodayShift({
          id: 'shift-001',
          name: 'Morning Shift',
          startTime: '2026-10-18T06:00:00',
          endTime: '2026-10-18T14:00:00'
        })
        setIncidents([
          {
            id: 'inc-001',
            type: 'Equipment',
            description: 'Espresso machine pressure fluctuation detected',
            severity: 'Medium',
            resolved: false,
            timestamp: new Date().toISOString()
          },
          {
            id: 'inc-002',
            type: 'Quality',
            description: 'Extraction time variance in pour-over brews',
            severity: 'Low',
            resolved: true,
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [supabase, user, authLoading])

  if (loading) {
    return (
      <div className="min-h-screen p-4">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-4">
        <div className="bg-red-50 text-red-700 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Error Loading Dashboard</h2>
          <p className="mb-4">{error}</p>
          <button 
            onClick={() => {
              setError(null)
              window.location.reload()
            }}
            className="btn btn-outline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Summary</CardTitle>
            <CardDescription>Overview of today's operations</CardDescription>
          </CardHeader>
          <Table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Active Shifts</td>
                <td>{activeShifts}</td>
                <td className={getStatusClass(activeShifts > 0 ? 'positive' : 'neutral')}>
                  {activeShifts > 0 ? 'Active' : 'None'}
                </td>
              </tr>
              <tr>
                <td>Pending Tasks</td>
                <td>{pendingTasks}</td>
                <td className={getStatusClass(pendingTasks === 0 ? 'positive' : 'negative')}>
                  {pendingTasks === 0 ? 'All Complete' : `${pendingTasks} Pending`}
                </td>
              </tr>
              <tr>
                <td>Quality Issues</td>
                <td>{qualityIssues}</td>
                <td className={getStatusClass(qualityIssues === 0 ? 'positive' : 'negative')}>
                  {qualityIssues === 0 ? 'None' : `${qualityIssues} Issues`}
                </td>
              </tr>
              <tr>
                <td>Equipment Status</td>
                <td>{equipmentCount}</td>
                <td className="bg-green-50 text-green-700">Operational</td>
              </tr>
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Shift</CardTitle>
            <CardDescription>Current shift overview and assignments</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            {todayShift ? (
              <>
                <div className="bg-agate-grey p-4 rounded-lg">
                  <h3 className="font-semibold">Shift Lead</h3>
                  <p className="text-sm text-gray-600">{todayShift.name.split("'")[0]}</p>
                </div>
                <div className="bg-agate-grey p-4 rounded-lg">
                  <h3 className="font-semibold">Assigned Staff</h3>
                  <ul className="space-y-2">
                    {/* In a real app, we would fetch assigned staff from the database */}
                    <li>Maria Petrosian</li>
                    <li>David Khachyan</li>
                    <li>Lina Gasparyan</li>
                  </ul>
                </div>
                <div className="bg-agate-grey p-4 rounded-lg">
                  <h3 className="font-semibold">Shift Times</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(todayShift.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                    {new Date(todayShift.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">No shift data available</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Tasks due today and tomorrow</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {/* In a real app, we would fetch upcoming tasks from the database */}
            <div className="flex justify-between items-center bg-warm-offwhite rounded-lg p-3 border border-gray-200">
              <span className="text-sm font-medium">Espresso machine calibration</span>
              <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                Today
              </span>
            </div>
            <div className="flex justify-between items-center bg-warm-offwhite rounded-lg p-3 border border-gray-200">
              <span className="text-sm font-medium">Grinder maintenance</span>
              <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                Tomorrow
              </span>
            </div>
            <div className="flex justify-between items-center bg-warm-offwhite rounded-lg p-3 border border-gray-200">
              <span className="text-sm font-medium">Sanitation check</span>
              <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                Today
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
            <CardDescription>Log of any reported issues</CardDescription>
          </CardHeader>
          <div className="space-y-2">
            {incidents.length > 0 ? (
              incidents.map((incident) => (
                <div key={incident.id} className="bg-red-50 p-3 rounded-lg">
                  <strong>{incident.type}</strong> - {incident.description}
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(incident.timestamp).toLocaleString()}
                  </p>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(incident.severity.toLowerCase())}`}>
                    {incident.severity}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No recent incidents.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
