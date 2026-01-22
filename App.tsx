
import React, { useState, useMemo } from "react";
import { useFreightData } from "./hooks/useFreightData";
import { RoutesTable } from "./components/RoutesTable";
import { CarrierCards } from "./components/CarrierCards";
import { InctConfigPanel } from "./components/InctConfigPanel";
import { WarehouseScenarioSummary } from "./components/WarehouseScenarioSummary";
import { TransportEstimative } from "./components/ProvisionControl";
import { WarehouseSimulation } from "./components/WarehouseSimulation";

// KPI Dashboard Imports
import FileUpload from "./components/FileUpload";
import KpiCard from "./components/KpiCard";
import DashboardFilters from "./components/DashboardFilters";
import ChartsGrid from "./components/ChartsGrid";
import ShipmentTable from "./components/ShipmentTable";
import SupplierAnalysis from "./components/SupplierAnalysis";
import ScenarioChart from "./components/ScenarioChart";
import ChartDetailsModal from "./components/ChartDetailsModal";
import DailyLotBreakdown from "./components/DailyLotBreakdown";
import OperationalLotGrid from "./components/OperationalLotGrid";

// Utils
import { processRawData, calculateDashboardData } from "./utils/dataProcessor";
import { currencyFormatter } from "./utils/formatters";
import { Shipment, SortConfig } from "./types";

type MainView = "performance" | "benchmark" | "estimative" | "warehouse_sim";

export default function App() {
  const benchmark = useFreightData();
  const { activeTab, inct, justifications, containerQuantity, provision } = benchmark.state;

  const [mainView, setMainView] = useState<MainView>("performance");
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [carriersList, setCarriersList] = useState<string[]>([]);
  const [analystsList, setAnalystsList] = useState<string[]>([]);
  const [cargosList, setCargosList] = useState<string[]>([]);
  const [containerTypesList, setContainerTypesList] = useState<string[]>([]);
  const [incotermsList, setIncotermsList] = useState<string[]>([]);
  const [yearsList, setYearsList] = useState<number[]>([]);
  
  const [filters, setFilters] = useState({
    carriers: [] as string[],
    analysts: [] as string[],
    cargos: [] as string[],
    containerTypes: [] as string[],
    incoterms: [] as string[],
    year: "all",
    period: "all",
    month: "all",
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "ata", direction: "desc" });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [modalData, setModalData] = useState<{ isOpen: boolean; weekLabel: string; shipments: Shipment[] }>({
    isOpen: false,
    weekLabel: "",
    shipments: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (data: any[][]) => {
    try {
      const processed = processRawData(data);
      setShipments(processed.shipments);
      setCarriersList(processed.carriers);
      setAnalystsList(processed.analysts);
      setCargosList(processed.cargos);
      setContainerTypesList(processed.containerTypes);
      setIncotermsList(processed.incoterms);
      setYearsList(processed.years);
      setIsLoading(false);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      const matchCarrier = filters.carriers.length === 0 || (s.carrier && filters.carriers.includes(s.carrier));
      const matchAnalyst = filters.analysts.length === 0 || (s.analyst && filters.analysts.includes(s.analyst));
      const matchCargo = filters.cargos.length === 0 || (s.cargo && filters.cargos.includes(s.cargo));
      const matchType = filters.containerTypes.length === 0 || (s.containerType && filters.containerTypes.includes(s.containerType));
      const matchIncoterm = filters.incoterms.length === 0 || (s.incoterm && filters.incoterms.includes(s.incoterm));
      
      const date = s.deliveryByd || s.ata;
      const matchYear = filters.year === "all" || (date && date.getFullYear().toString() === filters.year);
      
      let matchPeriod = true;
      if (filters.period !== "all" && date) {
        const month = date.getMonth();
        if (filters.period === "H1") matchPeriod = month < 6;
        else if (filters.period === "H2") matchPeriod = month >= 6;
        else if (filters.period === "Q1") matchPeriod = month < 3;
        else if (filters.period === "Q2") matchPeriod = month >= 3 && month < 6;
        else if (filters.period === "Q3") matchPeriod = month >= 6 && month < 9;
        else if (filters.period === "Q4") matchPeriod = month >= 9;
      }

      const matchMonth = filters.month === "all" || (date && date.getMonth().toString() === filters.month);
      const matchSearch = !searchTerm || [s.containerNumber, s.carrier, s.vesselName, s.shipper].some(v => String(v || '').toLowerCase().includes(searchTerm.toLowerCase()));

      return matchCarrier && matchAnalyst && matchCargo && matchType && matchIncoterm && matchYear && matchPeriod && matchMonth && matchSearch;
    });
  }, [shipments, filters, searchTerm]);

  const sortedShipments = useMemo(() => {
    return [...filteredShipments].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (valA === valB) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;
      return valA < valB ? (sortConfig.direction === "asc" ? -1 : 1) : (sortConfig.direction === "asc" ? 1 : -1);
    });
  }, [filteredShipments, sortConfig]);

  const { kpis, charts } = useMemo(() => calculateDashboardData(filteredShipments), [filteredShipments]);
  const paginatedShipments = sortedShipments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => setFilters({ carriers: [], analysts: [], cargos: [], containerTypes: [], incoterms: [], year: "all", period: "all", month: "all" });

  const handleLotClick = (model: string, dateLabel: string, batchNumber: string) => {
    const matchingShipments = filteredShipments.filter(s => {
      if (!s.deliveryByd) return false;
      const sDateStr = s.deliveryByd.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      return sDateStr === dateLabel && s.batchNumber === batchNumber && s.cargoModel === model;
    });
    setModalData({
      isOpen: true,
      weekLabel: `LOT ${batchNumber} (${model}) - ${dateLabel}`,
      shipments: matchingShipments
    });
  };

  const handleDemurrageClick = () => {
    const demurrageShipments = filteredShipments.filter(s => s.demurrageCost > 0);
    setModalData({
      isOpen: true,
      weekLabel: "Shipments with Demurrage Costs",
      shipments: demurrageShipments
    });
  };

  const goalPct = parseFloat(kpis.goalAchievementPct);
  const goalTextColor = goalPct >= 100 ? 'text-emerald-600' : goalPct >= 85 ? 'text-amber-600' : 'text-red-600';
  const goalBgColor = goalPct >= 100 ? 'bg-emerald-500' : goalPct >= 85 ? 'bg-amber-500' : 'bg-red-500';

  const handleLeadTimeClick = (d: any, type: 'all' | 'late' | 'delivered' | 'pending' = 'all') => {
    const isMonthly = !!d.name && !d.label && d.sortKey > 200000;
    const isYearly = !!d.name && !d.label && d.sortKey < 3000;
    const isDaily = !!d.label;

    const shipmentsForModal = filteredShipments.filter(s => {
      let date: Date | null = type === 'pending' || type === 'delivered' ? (s.estimatedDelivery || s.ata) : (s.deliveryByd || s.ata);
      if (!date) return false;
      
      let dateMatch = false;
      if (isYearly) {
        dateMatch = date.getFullYear().toString() === d.name;
      } else if (isMonthly || d.date) {
        const refDate = d.date || new Date(Math.floor(d.sortKey / 100), d.sortKey % 100, 1);
        dateMatch = date.getMonth() === refDate.getMonth() && date.getFullYear() === refDate.getFullYear();
      } else if (isDaily) {
        dateMatch = date.toLocaleDateString() === d.label;
      }

      if (!dateMatch) return false;
      if (type === 'late') return (s.clientDeliveryVariance || 0) > 0;
      if (type === 'delivered') return s.deliveryByd !== null;
      if (type === 'pending') return s.deliveryByd === null;
      return true;
    });

    let labelPrefix = isYearly ? `Year: ${d.name}` : isMonthly ? `Month: ${d.name}` : `Date: ${d.label || d.name}`;
    if (type === 'late') labelPrefix += " (Late Only)";
    if (type === 'delivered') labelPrefix += " (Delivered)";
    if (type === 'pending') labelPrefix += " (Pending Transit)";

    setModalData({ isOpen: true, weekLabel: labelPrefix, shipments: shipmentsForModal });
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] font-sans antialiased print:bg-white">
      <div className="bg-slate-900 text-white px-6 py-4 shadow-lg sticky top-0 z-50 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-2 rounded-lg"><span className="material-icons text-white">dashboard</span></div>
          <div><h1 className="text-lg font-bold leading-none">Command Center</h1><p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Logistics & Supply Chain</p></div>
        </div>
        <div className="flex bg-slate-800 rounded-xl p-1">
          {(["performance", "benchmark", "estimative", "warehouse_sim"] as MainView[]).map(v => (
            <button key={v} onClick={() => setMainView(v)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mainView === v ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
              <span className="material-icons text-sm">{v === 'performance' ? 'analytics' : v === 'benchmark' ? 'calculate' : v === 'estimative' ? 'payments' : 'warehouse'}</span>
              {v.charAt(0).toUpperCase() + v.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3"><button onClick={() => window.print()} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors"><span className="material-icons">print</span></button></div>
      </div>

      <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
        {mainView === "performance" ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div><h2 className="text-2xl font-black text-slate-800 tracking-tight">Operational Analytics</h2><p className="text-slate-500 text-sm">Analyze carrier performance, costs, and lead times.</p></div>
                  {shipments.length > 0 && (
                    <div className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl flex items-center gap-3 shadow-lg ring-1 ring-slate-800">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <div className="flex flex-col"><p className="text-[10px] font-black uppercase text-slate-500 leading-none mb-1 tracking-widest">Global Data Vol</p><p className="text-xl font-black leading-none tracking-tighter">{kpis.totalShipments} <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">CNTR</span></p></div>
                    </div>
                  )}
                </div>
                <div className="print:hidden"><FileUpload onFileUpload={handleFileUpload} onError={setError} setIsLoading={setIsLoading} /></div>
             </div>

             {error && (<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3 text-red-700 text-sm"><span className="material-icons">error</span>{error}</div>)}

             {shipments.length === 0 ? (
               <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-24 text-center">
                  <span className="material-icons text-6xl text-slate-300 mb-4">cloud_upload</span><h3 className="text-xl font-bold text-slate-600">No data loaded yet</h3><p className="text-slate-400 max-w-xs mx-auto mt-2">Upload your logistics Excel file to unlock insights.</p>
               </div>
             ) : (
               <>
                 <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1 space-y-2">
                       <div className="flex items-center gap-2">
                          <span className="material-icons text-amber-500">tour</span>
                          <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Operational Daily Goal: {kpis.dailyGoalValue} CNTR</h3>
                       </div>
                       <div className="flex items-center justify-between">
                          <h4 className="text-3xl font-black text-slate-800">
                            {kpis.goalAchievementPct}% <span className="text-sm font-bold text-slate-400 ml-2">Achievement</span>
                          </h4>
                          <span className={`text-xs font-black uppercase ${goalTextColor}`}>{goalPct >= 100 ? 'Excelence' : 'Normal'}</span>
                       </div>
                       <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${goalBgColor}`} style={{ width: `${Math.min(100, goalPct)}%` }}></div>
                       </div>
                    </div>
                    
                    <div className="w-full md:w-auto flex items-center gap-6 px-6 border-l border-slate-100">
                       <div className="text-center bg-slate-900 text-white px-5 py-3 rounded-[1.25rem] shadow-lg border border-slate-800">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Grand Total</p>
                          <p className="text-2xl font-black leading-none">{kpis.deliveredCount}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Delivered</p>
                       </div>
                       
                       <div className="flex gap-4 divide-x divide-slate-100">
                          <div className="text-center px-4">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekday Avg</p>
                             <p className="text-xl font-black text-slate-800">{kpis.avgWeekdayVolume}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase">CNTR/Day</p>
                          </div>
                          <div className="text-center px-4">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekend</p>
                             <p className="text-xl font-black text-emerald-600">+{kpis.weekendBonusVolume}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase">Bonus Vol</p>
                          </div>
                          <div className="text-center px-4">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                             <p className="text-xl font-black text-slate-800">{kpis.totalWeekdaysOperated}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase">Op. Days</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    <KpiCard icon="task_alt" title="Goal Met" value={kpis.daysGoalAchieved.toString()} unit="Days" color="text-emerald-600" highlight={goalPct >= 100} />
                    <KpiCard icon="running_with_errors" title="Goal Missed" value={kpis.daysGoalNotAchieved.toString()} unit="Days" color="text-red-500" highlight={goalPct < 85} />
                    <KpiCard icon="event_available" title="On-Time" value={kpis.onTimePercentage} unit="%" color="text-emerald-600" />
                    <KpiCard icon="payments" title="Demurrage" value={currencyFormatter.format(kpis.totalDemurrage).replace('.00', '')} color="text-red-600" onClick={handleDemurrageClick} highlight={kpis.totalDemurrage > 0} />
                    <KpiCard icon="speed" title="Port -> BYD" value={kpis.avgPortToDelivery} unit="Days" color="text-blue-600" />
                    <KpiCard icon="fact_check" title="Clearance" value={kpis.avgAtaToChannel} unit="Days" color="text-amber-600" />
                    <KpiCard icon="description" title="NF Processing" value={kpis.avgChannelToNf} unit="Days" color="text-indigo-600" />
                    <KpiCard icon="warning" title="At Risk" value={kpis.detentionRiskShipments.toString()} unit="CNTR" color="text-red-500" />
                 </div>

                 <DashboardFilters carriers={carriersList} analysts={analystsList} cargos={cargosList} containerTypes={containerTypesList} incoterms={incotermsList} years={yearsList} selectedCarriers={filters.carriers} selectedAnalysts={filters.analysts} selectedCargos={filters.cargos} selectedContainerTypes={filters.containerTypes} selectedIncoterms={filters.incoterms} selectedYear={filters.year} selectedPeriod={filters.period} selectedMonth={filters.month} onCarrierChange={c => setFilters(f => ({...f, carriers: c}))} onAnalystChange={a => setFilters(f => ({...f, analysts: a}))} onCargoChange={c => setFilters(f => ({...f, cargos: c}))} onContainerTypeChange={t => setFilters(f => ({...f, containerTypes: t}))} onIncotermChange={i => setFilters(f => ({...f, incoterms: i}))} onYearChange={y => setFilters(f => ({...f, year: y}))} onPeriodChange={p => setFilters(f => ({...f, period: p}))} onMonthChange={m => setFilters(f => ({...f, month: m}))} onReset={resetFilters} />

                 <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-8">
                        <ChartsGrid data={charts} onLeadTimeClick={handleLeadTimeClick} />
                        <OperationalLotGrid shipments={filteredShipments} onLotClick={handleLotClick} />
                        <DailyLotBreakdown shipments={filteredShipments} />
                    </div>
                    <div className="space-y-8">
                      <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                         <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Executive Summary</h5>
                         <p className="text-sm italic">Achieved daily goal on {kpis.daysGoalAchieved} out of {kpis.totalWeekdaysOperated} days.</p>
                      </div>
                      <SupplierAnalysis shipments={filteredShipments} />
                      <ScenarioChart shipments={filteredShipments} />
                    </div>
                 </div>
                 <ShipmentTable shipments={paginatedShipments} sortConfig={sortConfig} onSort={setSortConfig} searchTerm={searchTerm} onSearch={setSearchTerm} currentPage={currentPage} totalItems={sortedShipments.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
               </>
             )}
          </div>
        ) : (
          <div className="p-10 bg-white rounded-3xl text-center"><p className="text-slate-500">Benchmark and Estimator views available in top navigation.</p></div>
        )}
      </div>
      <ChartDetailsModal isOpen={modalData.isOpen} weekLabel={modalData.weekLabel} shipments={modalData.shipments} onClose={() => setModalData(d => ({...d, isOpen: false}))} />
    </div>
  );
}
