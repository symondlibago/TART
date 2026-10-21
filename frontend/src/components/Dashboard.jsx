import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, CalendarClock, Users, CheckCircle2, Loader2, ArrowRight, MapPin
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { getEventStatistics } from '../utils/auth';
import { statusColor, statusBadge } from '../lib/eventStatus';

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <Card className="border-none shadow-lg rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-2">{value}</p>
          </div>
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${accent}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(value) {
  if (!value) return '';
  const [hours, minutes] = String(value).split(':');
  const h = Number(hours);
  if (Number.isNaN(h)) return value;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${minutes} ${suffix}`;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getEventStatistics();
        const data = await response.json();
        if (data.success) setStats(data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-700 h-8 w-8" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <p className="text-gray-500">Could not load dashboard data.</p>
      </div>
    );
  }

  const statusData = Object.entries(stats.by_status).map(([name, value]) => ({ name, value }));
  const hasAnyEvents = stats.total_events > 0;

  return (
    <div className="p-8 bg-gray-50 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of all your events</p>
        </div>
        <Link to="/events">
          <Button className="bg-indigo-700 hover:bg-indigo-800 h-12 rounded-xl px-6">
            View all events <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={CalendarDays}
          label="Total Events"
          value={stats.total_events.toLocaleString()}
          accent="bg-indigo-50 text-indigo-700"
        />
        <StatCard
          icon={CalendarClock}
          label="Upcoming"
          value={stats.upcoming_events.toLocaleString()}
          accent="bg-amber-50 text-amber-700"
        />
        <StatCard
          icon={CheckCircle2}
          label="This Month"
          value={stats.events_this_month.toLocaleString()}
          accent="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          icon={Users}
          label="Total Pax"
          value={stats.total_pax.toLocaleString()}
          accent="bg-blue-50 text-blue-700"
        />
      </div>

      {!hasAnyEvents ? (
        <Card className="border-none shadow-xl rounded-2xl">
          <CardContent className="p-20 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <CalendarDays className="h-7 w-7 text-gray-400" />
            </div>
            <p className="font-bold text-gray-900">No events yet</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Add your first event and the dashboard will fill up.
            </p>
            <Link to="/events">
              <Button className="bg-indigo-700 hover:bg-indigo-800 rounded-xl px-6">
                Go to Events
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly chart */}
          <Card className="border-none shadow-xl rounded-2xl lg:col-span-2">
            <CardContent className="p-6">
              <h2 className="font-extrabold text-gray-900 mb-1">Events per Month</h2>
              <p className="text-xs text-gray-500 mb-6">Last 6 months</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.monthly} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#eef2ff' }}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="events" fill="#4338ca" radius={[8, 8, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status breakdown */}
          <Card className="border-none shadow-xl rounded-2xl">
            <CardContent className="p-6">
              <h2 className="font-extrabold text-gray-900 mb-1">By Status</h2>
              <p className="text-xs text-gray-500 mb-6">All events</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={statusData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#374151' }}
                    axisLine={false}
                    tickLine={false}
                    width={78}
                  />
                  <Tooltip
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={statusColor(entry.name)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="space-y-2 mt-4 pt-4 border-t">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: statusColor(s.name) }}
                      />
                      {s.name}
                    </span>
                    <span className="font-bold text-gray-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming events */}
      {stats.next_events?.length > 0 && (
        <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="px-6 py-5 border-b flex items-center justify-between">
              <h2 className="font-extrabold text-gray-900">Next Up</h2>
              <Link to="/events" className="text-sm font-semibold text-indigo-700 hover:underline">
                See all
              </Link>
            </div>
            <div className="divide-y">
              {stats.next_events.map((ev) => (
                <div key={ev.id} className="px-6 py-4 flex flex-wrap gap-4 items-center hover:bg-indigo-50/30">
                  <div className="w-28 flex-shrink-0">
                    <p className="font-bold text-gray-900 text-sm">{formatDate(ev.event_date)}</p>
                    <p className="text-xs text-gray-500">{formatTime(ev.event_time)}</p>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-bold text-gray-900">{ev.event_name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="h-3 w-3" /> {ev.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {Number(ev.pax).toLocaleString()}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                        statusBadge(ev.status)
                      }`}
                    >
                      {ev.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
