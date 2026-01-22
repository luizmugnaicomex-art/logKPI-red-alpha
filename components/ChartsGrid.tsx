
import React, { useState, useMemo } from 'react';
import { ChartData } from '../types';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
    ComposedChart,
    Line,
    ReferenceLine,
    Label,
    LabelList
} from 'recharts';
import { currencyFormatter } from '../utils/formatters';

interface ChartsGridProps {
    data: ChartData;
    onLeadTimeClick?: (data: any, type?: 'all' | 'late' | 'delivered' | 'pending') => void;
}

const chartColors = [
    '#16A34A', '#2563EB', '#DC2626', '#F59E0B', '#7C3AED', 
    '#DB2777', '#0891B2', '#4B5563', '#9333EA', '#EA580C', 
    '#65A30D', '#059669', '#D97706', '#EF4444', '#3B82F6', 
    '#6366F1', '#8B5CF6', '#EC4899'
];

const CARRIER_COLOR_MAP: Record<string, string> = {
    'INTERMARÍTIMA': '#16A34A',
    'INTERMARITIMA': '#16A34A',
    'TRANSPARANÁ': '#2563EB',
    'TRANSPARANA': '#2563EB',
    'UNKNOWN': '#DC2626',
    'Unknown': '#DC2626',
    'CARRIER NOT IDENTIFIED': '#DC2626'
};

const getCarrierColor = (name: string, index: number) => {
    const upperName = name.toUpperCase();
    if (CARRIER_COLOR_MAP[upperName]) return CARRIER_COLOR_MAP[upperName];
    if (upperName.includes('INTERMAR')) return '#16A34A';
    if (upperName.includes('TRANSPARAN')) return '#2563EB';
    return chartColors[index % chartColors.length];
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-xl text-xs min-w-[180px] z-50">
                <p className="label font-black text-slate-800 mb-2 border-b border-slate-100 pb-1">{`${label}`}</p>
                {payload.map((p: any, i: number) => {
                    const isWarehouseChart = p.payload.capacity !== undefined;
                    const isGoalChart = p.payload.isWeekend !== undefined;
                    const isCarrierChart = p.payload.latePct !== undefined;
                    const isStatusChart = p.payload.delivered !== undefined;
                    const utilization = isWarehouseChart && p.payload.capacity > 0 
                        ? ((p.payload.value / p.payload.capacity) * 100).toFixed(1) 
                        : null;

                    return (
                        <div key={i} className="mb-1">
                            <p className="flex justify-between items-center gap-4">
                                <span className="font-bold" style={{ color: p.color }}>{p.name}:</span>
                                <span className="font-black">
                                    {p.name.includes('%') || p.name.includes('Growth') ? `${p.value}%` : (p.formatter ? p.formatter(p.value) : p.value)}
                                </span>
                            </p>
                            {isGoalChart && p.name === "Arrivals (Delivered)" && (
                                <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                   {p.payload.goalReached ? 'Goal Achieved ✓' : 'Below Target ⚠'}
                                   {p.payload.isWeekend && ' (Weekend)'}
                                </div>
                            )}
                            {isGoalChart && p.name === "Goal Achievement" && (
                                <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                   {p.value >= 100 ? 'Performance Exceeded ✓' : 'Daily Target Pending'}
                                   {p.payload.isWeekend && ' (Weekend)'}
                                </div>
                            )}
                            {isCarrierChart && (
                                <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                   Global Share: {p.payload.volumePct}%
                                </div>
                            )}
                            {isWarehouseChart && p.name.includes('Containers') && p.payload.capacity > 0 && (
                                <p className="text-[10px] text-gray-500 italic mt-1">
                                    Capacity: {p.payload.capacity} | Util: {utilization}%
                                </p>
                            )}
                            {isStatusChart && (
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                                    Operational Status
                                </p>
                            )}
                        </div>
                    );
                })}
                {payload[0]?.payload?.total !== undefined && (
                   <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between">
                      <span className="font-black text-slate-400 uppercase text-[9px]">Total Period:</span>
                      <span className="font-black text-slate-900">{payload[0].payload.total || payload[0].payload.totalLate}</span>
                   </div>
                )}
            </div>
        );
    }
    return null;
};

const ChartContainer: React.FC<{
    title: string;
    subtitle?: string;
    headerRight?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    height?: number;
}> = ({ title, subtitle, headerRight, children, className = '', height = 300 }) => {
    const [isMinimized, setIsMinimized] = useState(false);

    return (
        <div className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 ${className} transition-all duration-200`}>
            <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.15em] flex items-center gap-2">
                        {title}
                    </h3>
                    {subtitle && (
                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-2">
                            {subtitle}
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-3">
                    {headerRight}
                    <button 
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="text-slate-300 hover:text-slate-600 focus:outline-none p-1 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        <span className="material-icons text-xl select-none">
                            {isMinimized ? 'expand_more' : 'expand_less'}
                        </span>
                    </button>
                </div>
            </div>
            
            {!isMinimized && (
                 <div style={{ width: '100%', height: height }}>
                    <ResponsiveContainer width="100%" height="100%">
                        {children}
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

const ChartsGrid: React.FC<ChartsGridProps> = ({ data, onLeadTimeClick }) => {
    const getSum = (dataset: { value: number }[]) => dataset.reduce((acc, curr) => acc + curr.value, 0);

    const carrierNames = useMemo(() => {
        const names = new Set<string>();
        data.carrierDelayImpact.forEach(c => names.add(c.name));
        return Array.from(names);
    }, [data.carrierDelayImpact]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartContainer
                title="Daily Volume vs Goal (150 CNTR)"
                headerRight={<div className="flex gap-2">
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-500"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Met</span>
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Missed</span>
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase text-indigo-500"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Weekend</span>
                </div>}
                subtitle="Tracking the 150 CNTR goal across all operational days. Click columns to view container details."
                height={350}
                className="lg:col-span-2"
            >
                <ComposedChart
                    data={data.leadTimeTrend}
                    margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', paddingTop: '20px' }} />
                    <ReferenceLine yAxisId="left" y={150} stroke="#F59E0B" strokeDasharray="5 5" strokeWidth={2}>
                        <Label value="Goal: 150" position="right" fill="#F59E0B" fontSize={10} fontWeight={900} />
                    </ReferenceLine>
                    <Bar 
                        yAxisId="left" 
                        dataKey="containerCount" 
                        name="Arrivals (Delivered)" 
                        cursor="pointer" 
                        radius={[6, 6, 0, 0]}
                        onClick={(payload: any) => onLeadTimeClick?.(payload, 'all')}
                    >
                        <LabelList dataKey="containerCount" position="top" fontSize={10} fill="#1e293b" fontWeight={900} />
                        {data.leadTimeTrend.map((entry, index) => {
                            let fill = entry.goalReached ? '#10B981' : '#94a3b8';
                            return <Cell key={`cell-${index}`} fill={fill} stroke={entry.isWeekend ? '#6366F1' : 'none'} strokeWidth={entry.isWeekend ? 2 : 0} />;
                        })}
                    </Bar>
                </ComposedChart>
            </ChartContainer>

            <ChartContainer
                title="Daily Goal Achievement (%)"
                subtitle="Percentage of the 150 CNTR target reached per day. Click columns to audit days."
                height={350}
                className="lg:col-span-2"
                headerRight={
                   <div className="flex gap-4">
                      <div className="flex items-center gap-1.5">
                         <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                         <span className="text-[10px] font-black text-slate-500">EXCELENT (&gt;100%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                         <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
                         <span className="text-[10px] font-black text-slate-500">OPTIMAL (85-99%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                         <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                         <span className="text-[10px] font-black text-slate-500">CRITICAL (&lt;85%)</span>
                      </div>
                   </div>
                }
            >
                <BarChart
                    data={data.leadTimeTrend}
                    margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} />
                    <YAxis 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                      axisLine={false}
                      unit="%"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={100} stroke="#16A34A" strokeDasharray="6 3" strokeWidth={2}>
                        <Label value="TARGET (100%)" position="left" fill="#16A34A" fontSize={10} fontWeight={900} />
                    </ReferenceLine>
                    <ReferenceLine y={85} stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={1}>
                        <Label value="MINIMUM (85%)" position="left" fill="#F59E0B" fontSize={10} fontWeight={900} />
                    </ReferenceLine>
                    <Bar 
                        dataKey="achievementPct" 
                        name="Goal Achievement" 
                        radius={[6, 6, 0, 0]}
                        cursor="pointer"
                        onClick={(payload: any) => onLeadTimeClick?.(payload, 'all')}
                    >
                        <LabelList dataKey="achievementPct" position="top" fontSize={10} fill="#1e293b" fontWeight={900} formatter={(v: number) => v > 0 ? `${v}%` : ''} />
                        {data.leadTimeTrend.map((entry, index) => {
                            let fill = '#DC2626';
                            if (entry.achievementPct >= 100) fill = '#10B981';
                            else if (entry.achievementPct >= 85) fill = '#F59E0B';
                            return <Cell key={`cell-pct-${index}`} fill={fill} stroke={entry.isWeekend ? '#6366F1' : 'none'} strokeWidth={entry.isWeekend ? 2 : 0} />;
                        })}
                    </Bar>
                </BarChart>
            </ChartContainer>

            <ChartContainer
                title="Daily Volume Breakdown by Carrier"
                subtitle="Daily CNTR throughput by transport company vs 150 target."
                height={400}
                className="lg:col-span-2"
            >
                <BarChart
                    data={data.dailyCarrierBreakdown}
                    margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                    <Legend wrapperStyle={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', paddingTop: '20px' }} />
                    <ReferenceLine y={150} stroke="#F59E0B" strokeDasharray="5 5" strokeWidth={2}>
                        <Label value="Goal: 150" position="right" fill="#F59E0B" fontSize={10} fontWeight={900} />
                    </ReferenceLine>
                    {carrierNames.map((name, index) => (
                        <Bar key={name} dataKey={name} stackId="volume" fill={getCarrierColor(name, index)} radius={[0, 0, 0, 0]} cursor="pointer" onClick={(payload: any) => onLeadTimeClick?.(payload, 'all')}>
                            <LabelList dataKey={name} position="center" content={(props: any) => {
                                const { x, y, width, height, value } = props;
                                if (value <= 0) return null;
                                return <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={900}>{value}</text>;
                            }} />
                        </Bar>
                    ))}
                    <Bar dataKey="total" stackId="volume" fill="transparent" isAnimationActive={false}>
                         <LabelList dataKey="total" position="top" style={{ fontSize: 10, fill: '#1e293b', fontWeight: 900 }} />
                    </Bar>
                </BarChart>
            </ChartContainer>

            <ChartContainer
                title="Carrier Volume Share"
                subtitle="Percentage of total operations per transport company."
                height={350}
                className="lg:col-span-2"
            >
                <ComposedChart
                    data={data.carrierDelayImpact}
                    margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} interval={0} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar yAxisId="left" dataKey="volumePct" name="Volume Share (%)" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(payload: any) => onLeadTimeClick?.(payload, 'all')}>
                        <LabelList dataKey="volumePct" position="top" fontSize={10} fill="#1e293b" fontWeight={900} formatter={(v: number) => `${v}%`} />
                        {data.carrierDelayImpact.map((entry, index) => (
                            <Cell key={`carrier-cell-${index}`} fill={getCarrierColor(entry.name, index)} />
                        ))}
                    </Bar>
                </ComposedChart>
            </ChartContainer>

            <ChartContainer
                title="Monthly Operational Progress"
                subtitle="Comparing monthly completed volume against containers still in clearance or transit."
                height={450}
                className="lg:col-span-2"
            >
                <BarChart
                    data={data.monthlyStatus}
                    layout="vertical"
                    margin={{ top: 5, right: 60, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Legend wrapperStyle={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', paddingTop: '10px' }} />
                    <Bar dataKey="delivered" name="Made (Delivered)" stackId="status" fill="#10B981" onClick={(entry: any) => onLeadTimeClick?.(entry, 'delivered')} cursor="pointer">
                         <LabelList dataKey="delivered" position="center" style={{ fontSize: 10, fill: '#fff', fontWeight: 900 }} />
                    </Bar>
                    <Bar dataKey="pending" name="Pending (Transit)" stackId="status" fill="#e2e8f0" radius={[0, 8, 8, 0]} onClick={(entry: any) => onLeadTimeClick?.(entry, 'pending')} cursor="pointer">
                         <LabelList dataKey="pending" position="right" style={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }} />
                    </Bar>
                </BarChart>
            </ChartContainer>

            <ChartContainer title="Terminal Picking & Capacity" height={400} className="lg:col-span-2">
                <ComposedChart data={data.warehouseVolume} margin={{ top: 35, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="capacity" name="Capacity" fill="#f1f5f9" barSize={40} radius={[8,8,0,0]}>
                        <LabelList dataKey="capacity" position="top" fontSize={10} fill="#94a3b8" fontWeight={900} />
                    </Bar>
                    <Bar dataKey="value" name="Picked" fill="#334155" barSize={25} radius={[8,8,0,0]}>
                        <LabelList dataKey="value" position="top" fontSize={10} fill="#1e293b" fontWeight={900} />
                    </Bar>
                </ComposedChart>
            </ChartContainer>
        </div>
    );
};

export default ChartsGrid;
