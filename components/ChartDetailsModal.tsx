

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

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-bold text-gray-900" id="modal-title">
                                    Shipment Analysis: {weekLabel}
                                </h3>
                                
                                {/* Calculation Explanation */}
                                <div className="mt-4 bg-slate-50 p-4 rounded-md border border-slate-200">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">KPI Breakdown for this period</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                                        <div className="bg-white p-3 rounded border border-slate-100 shadow-sm">
                                            <p className="text-xs text-slate-400 font-medium uppercase">Total Volume</p>
                                            <p className="text-2xl font-bold text-slate-800">{count} Containers</p>
                                        </div>
                                        <div className="bg-white p-3 rounded border border-slate-100 shadow-sm">
                                            <p className="text-xs text-slate-400 font-medium uppercase">Late Shipments</p>
                                            <p className="text-2xl font-bold text-red-600">{lateShipments}</p>
                                            <p className="text-[10px] text-red-400 mt-1 italic">* Actual Delivery > Estimated</p>
                                        </div>
                                        <div className="bg-white p-3 rounded border border-slate-100 shadow-sm">
                                            <p className="text-xs text-slate-400 font-medium uppercase">On-Time Performance</p>
                                            <p className="text-2xl font-bold text-emerald-600">
                                                {count > 0 ? (((count - lateShipments) / count) * 100).toFixed(1) : 0}%
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Table */}
                                <div className="mt-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-sm font-bold text-gray-700 uppercase">Detailed Shipment Log</h4>
                                        <span className="text-[11px] text-gray-500 italic">Showing {shipments.length} containers</span>
                                    </div>
                                    <div className="overflow-x-auto max-h-[450px] border border-gray-100 rounded-lg shadow-inner">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Container</th>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Carrier</th>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Warehouse</th>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estimated</th>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actual Delivery</th>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Late Days</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {shipments.map((s, idx) => (
                                                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                        <td className="px-4 py-2 text-sm font-semibold text-gray-900">{s.containerNumber}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-600">{s.carrier}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-600">{s.bondedWarehouse}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-500">{s.estimatedDelivery ? s.estimatedDelivery.toLocaleDateString() : '-'}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900 font-medium">{s.deliveryByd ? s.deliveryByd.toLocaleDateString() : '-'}</td>
                                                        <td className={`px-4 py-2 text-sm font-bold ${ (s.clientDeliveryVariance || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                            {s.clientDeliveryVariance !== null ? (s.clientDeliveryVariance > 0 ? `+${s.clientDeliveryVariance}` : s.clientDeliveryVariance) : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {shipments.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400 italic">
                                                            No shipment data available for this selection.
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
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button 
                            type="button" 
                            className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-6 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-all"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChartDetailsModal;