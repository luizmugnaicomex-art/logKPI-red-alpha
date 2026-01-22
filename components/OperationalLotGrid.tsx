
import React, { useMemo } from 'react';
import { Shipment } from '../types';

interface OperationalLotGridProps {
    shipments: Shipment[];
    onLotClick: (model: string, dateStr: string, batchNumber: string) => void;
}

const OperationalLotGrid: React.FC<OperationalLotGridProps> = ({ shipments, onLotClick }) => {
    const { dates, models, grid } = useMemo(() => {
        const dateSet = new Set<string>();
        const modelSet = new Set<string>();
        
        // Use last operational days
        const deliveredOnly = shipments.filter(s => s.deliveryByd).sort((a, b) => a.deliveryByd!.getTime() - b.deliveryByd!.getTime());
        
        deliveredOnly.forEach(s => {
            const dateStr = s.deliveryByd!.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
            dateSet.add(dateStr);
            modelSet.add(s.cargoModel);
        });

        const sortedDates = Array.from(dateSet).slice(-12); // Last 12 days
        const sortedModels = Array.from(modelSet).sort();
        
        const gridData: Record<string, Record<string, Array<{ batch: string; count: number }>>> = {};

        sortedModels.forEach(m => {
            gridData[m] = {};
            sortedDates.forEach(d => {
                gridData[m][d] = [];
            });
        });

        shipments.forEach(s => {
            if (!s.deliveryByd) return;
            const dateStr = s.deliveryByd.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
            if (!sortedDates.includes(dateStr)) return;

            const existingBatch = gridData[s.cargoModel][dateStr].find(b => b.batch === s.batchNumber);
            if (existingBatch) {
                existingBatch.count++;
            } else {
                gridData[s.cargoModel][dateStr].push({ batch: s.batchNumber, count: 1 });
            }
        });

        return { dates: sortedDates, models: sortedModels, grid: gridData };
    }, [shipments]);

    if (dates.length === 0) return null;

    const isWeekend = (dateStr: string) => {
        const sample = shipments.find(s => s.deliveryByd?.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) === dateStr);
        if (!sample || !sample.deliveryByd) return false;
        const day = sample.deliveryByd.getDay();
        return day === 0 || day === 6;
    };

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <span className="material-icons text-emerald-500">grid_on</span>
                        Operational Lot Deployment Grid
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                        Click on a Lot to view specific container details
                    </p>
                </div>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                      <span className="text-[10px] font-black text-slate-400">WEEKDAY</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-indigo-500 rounded-sm"></div>
                      <span className="text-[10px] font-black text-slate-400">WEEKEND</span>
                   </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-20 bg-slate-50/80 backdrop-blur-md px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-100 min-w-[150px]">
                                MODEL
                            </th>
                            {dates.map(date => {
                                const weekend = isWeekend(date);
                                return (
                                    <th 
                                        key={date} 
                                        className={`px-4 py-4 text-center text-sm font-black border-r border-slate-100 min-w-[120px] ${
                                            weekend ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'
                                        }`}
                                    >
                                        {date}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {models.map(model => (
                            <tr key={model} className="border-b border-slate-50 group hover:bg-slate-50/30 transition-colors">
                                <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/80 px-6 py-8 font-black text-slate-900 border-r border-slate-100 text-sm">
                                    {model}
                                </td>
                                {dates.map(date => {
                                    const lots = grid[model][date];
                                    return (
                                        <td key={`${model}-${date}`} className="p-3 border-r border-slate-50 align-top">
                                            <div className="flex flex-col gap-2 min-h-[60px]">
                                                {lots.length > 0 ? (
                                                    lots.map((lot, idx) => (
                                                        <button 
                                                            key={idx} 
                                                            onClick={() => onLotClick(model, date, lot.batch)}
                                                            className="flex items-center justify-between bg-slate-900 text-white rounded-xl px-3 py-2 shadow-sm shadow-slate-200 animate-in zoom-in-95 duration-300 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-left w-full group/lot"
                                                        >
                                                            <span className="text-[10px] font-black tracking-tight truncate mr-2">LOT {lot.batch}</span>
                                                            <span className="bg-red-600 text-white text-[9px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 group-hover/lot:bg-white group-hover/lot:text-red-600 transition-colors">
                                                                {lot.count}
                                                            </span>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-10 transition-opacity">
                                                        <span className="material-icons text-slate-300">block</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Scroll horizontally to view full operational timeline
                 </p>
            </div>
        </div>
    );
};

export default OperationalLotGrid;
