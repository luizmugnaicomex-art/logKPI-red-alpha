
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
    onLeadTimeClick?: (data: any) => void;
}

const chartColors = [
    '#16A34A', '#2563EB', '#DC2626', '#F59E0B', '#7C3AED', 
    '#DB2777', '#0891B2', '#4B5563', '#9333EA', '#EA580C', 
    '#65A30D', '#059669', '#D97706', '#EF4444', '#3B82F6', 
    '#6366F1', '#8B5CF6', '#EC4899'
];

// Specific mapping for requested carriers
const CARRIER_COLOR_MAP: Record<string, string> = {
    'INTERMARÍTIMA': '#16A34A', // Green
    'INTERMARITIMA': '#16A34A',
    'TRANSPARANÁ': '#2563EB',   // Blue
    'TRANSPARANA': '#2563EB',
    'UNKNOWN': '#DC2626',       // Red
    'Unknown': '#DC2626',
    'CARRIER NOT IDENTIFIED': '#DC2626'
};

const getCarrierColor = (name: string, index: number) => {
    const upperName = name.toUpperCase();
    if (CARRIER_COLOR_MAP[upperName]) return CARRIER_COLOR_MAP[upperName];
    // Special case for variations
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
                    const utilization = isWarehouseChart && p.payload.capacity > 0 
                        ? ((p.payload.value / p.payload.capacity) * 100).toFixed(1) 
                        : null;

                    return (
                        <div key={i} className="mb-1">
                            <p className="flex justify-between items-center gap-4">
                                <span className="font-bold" style={{ color: p.color }}>{p.name}:</span>
                                <span className="font-black">{p.formatter ? p.formatter(p.value) : p.value}</span>
                            </p>
                            {isGoalChart && p.name === "Arrivals (Delivered)" && (
                                <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                   {p.payload.isWeekend ? 'Weekend (Bonus)' : p.payload.goalReached ? 'Goal Achieved ✓' : 'Below Target ⚠'}
                                </div>
                            )}
                            {isGoalChart && p.name === "Goal Achievement" && (
                                <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                   {p.payload.isWeekend ? 'Bonus Volume' : p.value >= 100 ? 'Performance Exceeded ✓' : 'Daily Target Pending'}
                                </div>
                            )}
                            {isCarrierChart && (
                                <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                   {p.payload.latePct}% Delay Rate | {p.payload.volumePct}% Global Share
                                </div>
                            )}
                            {isWarehouseChart && p.name.includes('Containers') && p.payload.capacity > 0 && (
                                <p className="text-[10px] text-gray-500 italic mt-1">
                                    Capacity: {p.payload.capacity} | Util: {utilization}%
                                </p>
                            )}
                        </div>
                    );
                })}
                {payload[0]?.payload?.total !== undefined && (
                   <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between">
                      <span className="font-black text-slate-400 uppercase text-[9px]">Total Today:</span>
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
            {/* Daily Volume Breakdown by Carrier */}
            <ChartContainer
                title="Daily Volume Breakdown by Carrier"
                subtitle="Daily CNTR throughput segmented by transport company vs 150 target."
                height={400}
                className="lg:col-span-2"
                headerRight={<div className="flex gap-2">
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Carrier Mix</span>
                </div>}
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
                        <Bar 
                            key={name}
                            dataKey={name} 
                            stackId="volume" 
                            fill={getCarrierColor(name, index)}
                            radius={index === carrierNames.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                        >
                            <LabelList 
                                dataKey={name} 
                                position="center" 
                                content={(props: any) => {
                                    const { x, y, width, height, value } = props;
                                    if (value <= 0) return null;
                                    return (
                                        <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={900}>
                                            {value}
                                        </text>
                                    );
                                }} 
                            />
                        </Bar>
                    ))}
                    {/* Invisible total bar to show sum on top */}
                    <Bar dataKey="total" stackId="volume" fill="transparent" isAnimationActive={false}>
                         <LabelList dataKey="total" position="top" style={{ fontSize: 10, fill: '#1e293b', fontWeight: 900 }} />
                    </Bar>
                </BarChart>
            </ChartContainer>

            {/* Daily Delayed Containers by Carrier */}
            <ChartContainer
                title="Daily Delay Distribution by Carrier"
                subtitle="Daily count of late shipments categorized by the responsible transport company."
                height={350}
                className="lg:col-span-2"
                headerRight={<div className="flex gap-2 text-[9px] font-black uppercase text-red-600">
                    <span className="material-icons text-xs">warning</span> 
                    Delay Breakdown
                </div>}
            >
                <BarChart
                    data={data.dailyCarrierDelayBreakdown}
                    margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#fff5f5'}} />
                    <Legend wrapperStyle={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', paddingTop: '20px' }} />
                    
                    {carrierNames.map((name, index) => (
                        <Bar 
                            key={`${name}_late`}
                            dataKey={name} 
                            name={name}
                            stackId="delay" 
                            fill={getCarrierColor(name, index)}
                            radius={index === carrierNames.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                        >
                             <LabelList 
                                dataKey={name} 
                                position="center" 
                                content={(props: any) => {
                                    const { x, y, width, height, value } = props;
                                    if (value <= 0) return null;
                                    return (
                                        <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={900}>
                                            {value}
                                        </text>
                                    );
                                }} 
                            />
                        </Bar>
                    ))}
                    <Bar dataKey="totalLate" stackId="delay" fill="transparent" isAnimationActive={false}>
                         <LabelList dataKey="totalLate" position="top" style={{ fontSize: 10, fill: '#DC2626', fontWeight: 900 }} />
                    </Bar>
                </BarChart>
            </ChartContainer>

            <ChartContainer
                title="Daily Volume vs Goal (150 CNTR)"
                headerRight={<div className="flex gap-2">
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-500"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Met</span>
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Missed</span>
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase text-indigo-500"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Weekend</span>
                </div>}
                subtitle="Weekdays track the 150 cntr goal. Weekends are calculated as bonus performance."
                height={350}
                className="lg:col-span-2"
            >
                <ComposedChart
                    data={data.leadTimeTrend}
                    margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                    onClick={(e: any) => {
                        if (onLeadTimeClick && e?.activePayload?.length) {
                            onLeadTimeClick(e.activePayload[0].payload);
                        }
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#DC2626" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', paddingTop: '20px' }} />

                    <ReferenceLine yAxisId="left" y={150} stroke="#F59E0B" strokeDasharray="5 5" strokeWidth={2}>
                        <Label value="Goal: 150" position="right" fill="#F59E0B" fontSize={10} fontWeight={900} />
                    </ReferenceLine>

                    <Bar yAxisId="left" dataKey="containerCount" name="Arrivals (Delivered)" cursor="pointer" radius={[6, 6, 0, 0]}>
                        <LabelList dataKey="containerCount" position="top" fontSize={10} fill="#1e293b" fontWeight={900} />
                        {data.leadTimeTrend.map((entry, index) => {
                            let fill = '#94a3b8'; // Default missed
                            if (entry.isWeekend) fill = '#6366F1'; // Weekend
                            else if (entry.goalReached) fill = '#10B981'; // Met
                            return <Cell key={`cell-${index}`} fill={fill} />;
                        })}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="lateCount" name="Late Shipments" stroke="#DC2626" strokeWidth={3} dot={{ r: 4, fill: '#DC2626', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }}>
                         <LabelList dataKey="lateCount" position="top" offset={10} fontSize={10} fill="#DC2626" fontWeight={900} formatter={(v: number) => v > 0 ? v : ''} />
                    </Line>
                </ComposedChart>
            </ChartContainer>

            {/* Carrier Volume Share & Delay Impact */}
            <ChartContainer
                title="Carrier Volume Share & Delay Impact"
                subtitle="Percentage of total operations and specific delay counts per transport company."
                height={350}
                className="lg:col-span-2"
                headerRight={<div className="flex gap-2 text-[9px] font-black uppercase">
                    <span className="flex items-center gap-1 text-slate-800"><span className="w-2 h-2 rounded-full bg-slate-800"></span> Vol Share (%)</span>
                    <span className="flex items-center gap-1 text-red-600"><span className="w-2 h-2 rounded-full bg-red-600"></span> Late Count</span>
                </div>}
            >
                <ComposedChart
                    data={data.carrierDelayImpact}
                    margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} interval={0} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} unit="%" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fontWeight: 700, fill: '#DC2626' }} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }} />
                    
                    <Bar yAxisId="left" dataKey="volumePct" name="Volume Share (%)" radius={[6, 6, 0, 0]}>
                        <LabelList dataKey="volumePct" position="top" fontSize={10} fill="#1e293b" fontWeight={900} formatter={(v: number) => `${v}%`} />
                        {data.carrierDelayImpact.map((entry, index) => (
                            <Cell key={`carrier-cell-${index}`} fill={getCarrierColor(entry.name, index)} />
                        ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="lateCount" name="Late Count" stroke="#DC2626" strokeWidth={3} dot={{ r: 4, fill: '#DC2626', stroke: '#fff' }}>
                         <LabelList dataKey="lateCount" position="top" offset={10} fontSize={10} fill="#DC2626" fontWeight={900} />
                    </Line>
                </ComposedChart>
            </ChartContainer>

            {/* Daily Achievement Percentage (%) Chart */}
            <ChartContainer
                title="Daily Goal Achievement (%)"
                subtitle="Percentage of the 150 CNTR target reached per day (Weekdays Only)."
                height={350}
                className="lg:col-span-2"
                headerRight={
                   <div className="flex gap-4">
                      <div className="flex items-center gap-1.5">
                         <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                         <span className="text-[10px] font-black text-slate-500">EXCELENT (>100%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                         <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
                         <span className="text-[10px] font-black text-slate-500">OPTIMAL (85-99%)</span>
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

                    <Bar dataKey="achievementPct" name="Goal Achievement" radius={[6, 6, 0, 0]}>
                        <LabelList dataKey="achievementPct" position="top" fontSize={10} fill="#1e293b" fontWeight={900} formatter={(v: number) => v > 0 ? `${v}%` : ''} />
                        {data.leadTimeTrend.map((entry, index) => {
                            let fill = '#DC2626'; // Below 85%
                            if (entry.isWeekend) fill = '#E2E8F0'; // Weekend is neutral in this chart
                            else if (entry.achievementPct >= 100) fill = '#10B981'; // Met/Exceeded
                            else if (entry.achievementPct >= 85) fill = '#F59E0B'; // Amber range
                            return <Cell key={`cell-pct-${index}`} fill={fill} />;
                        })}
                    </Bar>
                </BarChart>
            </ChartContainer>

            <ChartContainer
                title="Monthly Performance & Volume"
                headerRight={<div className="bg-slate-900 text-white px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase">DELIVERED: {getSum(data.monthlyTrend)}</div>}
                height={350}
                className="lg:col-span-2"
            >
                <ComposedChart data={data.monthlyTrend} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fontWeight: 700, fill: '#DC2626' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }} />
                    <Bar yAxisId="left" dataKey="value" name="Volume" fill="#2563EB" radius={[6,6,0,0]} />
                    <Line yAxisId="right" type="monotone" dataKey="late" name="Late" stroke="#DC2626" strokeWidth={3} dot={{ r: 4, fill: '#DC2626', stroke: '#fff' }} />
                </ComposedChart>
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

            <ChartContainer title="Carrier Performance (Lead Time)" height={350} className="lg:col-span-2">
                <BarChart data={data.carrierPerformance} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="avgTime" name="Avg Days" radius={[8,8,0,0]}>
                        <LabelList dataKey="avgTime" position="top" fontSize={10} fill="#1e293b" fontWeight={900} formatter={(val: number) => Number(val).toFixed(1)} />
                        {data.carrierPerformance.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : '#DC2626'} />
                        ))}
                    </Bar>
                </BarChart>
            </ChartContainer>
        </div>
    );
};

export default ChartsGrid;
