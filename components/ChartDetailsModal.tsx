
import React from 'react';
import { Shipment } from '../types';

interface ChartDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    weekLabel: string;
    shipments: Shipment[];
}

const ChartDetailsModal: React.FC<ChartDetailsModalProps> = ({ isOpen, onClose, weekLabel, shipments }) => {
    if (!isOpen) return null;

    // Calculation Logic
    const count = shipments.length;
    const lateShipments = shipments.filter(s => s.clientDeliveryVariance !== null && s.clientDeliveryVariance > 0).length;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                    <h3 className="text-xl leading-6 font-black text-slate-800" id="modal-title">
                                        Shipment Audit: {weekLabel}
                                    </h3>
                                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                                        <span className="material-icons">close</span>
                                    </button>
                                </div>
                                
                                {/* Calculation Explanation */}
                                <div className="mt-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-200 shadow-inner">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em]">Live Operational Snapshot</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-700">
                                        <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Total Volume</p>
                                            <p className="text-3xl font-black text-slate-800">{count} <span className="text-sm font-bold text-slate-400">CNTR</span></p>
                                        </div>
                                        <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Late Deliveries</p>
                                            <p className="text-3xl font-black text-red-600">{lateShipments}</p>
                                            <p className="text-[9px] text-red-400 mt-1 font-bold uppercase tracking-wider">Variance > 0 Days</p>
                                        </div>
                                        <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">On-Time Performance</p>
                                            <p className="text-3xl font-black text-emerald-600">
                                                {count > 0 ? (((count - lateShipments) / count) * 100).toFixed(1) : 0}%
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Table */}
                                <div className="mt-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                            <span className="material-icons text-red-600 text-sm">inventory</span>
                                            Detailed Shipment Log
                                        </h4>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full">Displaying {shipments.length} containers</span>
                                    </div>
                                    <div className="overflow-x-auto max-h-[400px] border border-slate-100 rounded-3xl shadow-sm">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-900 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Container ID</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">BL / DI NO</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Carrier</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Model</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">ATA</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Actual Delivery</th>
                                                    <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-50">
                                                {shipments.map((s, idx) => {
                                                    const isLate = (s.clientDeliveryVariance || 0) > 0;
                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                                            <td className="px-6 py-4 text-sm font-black text-slate-900">{s.containerNumber}</td>
                                                            <td className="px-6 py-4">
                                                                <span className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-bold text-slate-600">
                                                                    {s.lotNumber || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight">{s.carrier}</td>
                                                            <td className="px-6 py-4 text-xs font-black text-slate-900">{s.cargoModel}</td>
                                                            <td className="px-6 py-4 text-xs text-slate-500 font-medium">{s.ata ? s.ata.toLocaleDateString() : '-'}</td>
                                                            <td className="px-6 py-4 text-xs text-slate-800 font-bold">{s.deliveryByd ? s.deliveryByd.toLocaleDateString() : '-'}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${isLate ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                    <span className="material-icons text-[12px]">{isLate ? 'priority_high' : 'check'}</span>
                                                                    {isLate ? `${s.clientDeliveryVariance}D Late` : 'On-Time'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {shipments.length === 0 && (
                                                    <tr>
                                                        <td colSpan={7} className="px-6 py-20 text-center text-sm text-slate-300 font-black uppercase tracking-[0.3em] italic">
                                                            No matching shipments
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 px-6 py-4 sm:flex sm:flex-row-reverse rounded-b-lg">
                        <button 
                            type="button" 
                            className="w-full inline-flex justify-center rounded-2xl border border-slate-300 shadow-sm px-8 py-2.5 bg-white text-sm font-black text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto transition-all uppercase tracking-widest"
                            onClick={onClose}
                        >
                            Close Audit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChartDetailsModal;
