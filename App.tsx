
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
import OperationalLotGrid from "./components/OperationalLotGrid"; // New Import

// Utils
import { processRawData, calculateDashboardData } from "./utils/dataProcessor";
import { currencyFormatter } from "./utils/formatters";
import { Shipment, SortConfig } from "./types";

type MainView = "performance" | "benchmark" | "estimative" | "warehouse_sim";

export default function App() {
  // --- Benchmark State & Logic ---
  const benchmark = useFreightData();
  const { activeTab, inct, justifications, containerQuantity, provision } = benchmark.state;

  // --- KPI Dashboard State & Logic ---
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

  // --- KPI Handlers ---
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
      const res = valA < valB ? -1 : 1;
      return sortConfig.direction === "asc" ? res : -res;
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

  const goalPct = parseFloat(kpis.goalAchievementPct);
  const goalColor = goalPct >= 100 ? 'bg-emerald-500' : goalPct >= 85 ? 'bg-amber-500' : 'bg-red-500';
  const goalTextColor = goalPct >= 100 ? 'text-emerald-600' : goalPct >= 85 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="min-h-screen bg-[#f4f6fb] font-sans antialiased print:bg-white">
      {/* Top Banner Navigation */}
      <div className="bg-slate-900 text-white px-6 py-4 shadow-lg sticky top-0 z-50 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-2 rounded-lg">
            <span className="material-icons text-white">dashboard</span>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Command Center</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Logistics & Supply Chain</p>
          </div>
        </div>

        <div className="flex bg-slate-800 rounded-xl p-1">
          <button 
            onClick={() => setMainView("performance")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mainView === 'performance' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="material-icons text-sm">analytics</span>
            Performance Insights
          </button>
          <button 
            onClick={() => setMainView("benchmark")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mainView === 'benchmark' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="material-icons text-sm">calculate</span>
            Benchmark & Estimator
          </button>
          <button 
            onClick={() => setMainView("estimative")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mainView === 'estimative' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="material-icons text-sm">payments</span>
            Transport Estimative
          </button>
          <button 
            onClick={() => setMainView("warehouse_sim")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mainView === 'warehouse_sim' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="material-icons text-sm">warehouse</span>
            Bonded Warehouse
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => window.print()} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors">
            <span className="material-icons">print</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
        
        {mainView === "performance" ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Operational Analytics</h2>
                    <p className="text-slate-500 text-sm">Analyze carrier performance, costs, and lead times.</p>
                  </div>
                  {shipments.length > 0 && (
                    <div className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl flex items-center gap-3 shadow-lg ring-1 ring-slate-800">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <div className="flex flex-col">
                        <p className="text-[10px] font-black uppercase text-slate-500 leading-none mb-1 tracking-widest">Global Data Vol</p>
                        <p className="text-xl font-black leading-none tracking-tighter">{kpis.totalShipments} <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">CNTR</span></p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="print:hidden">
                   <FileUpload onFileUpload={handleFileUpload} onError={setError} setIsLoading={setIsLoading} />
                </div>
             </div>

             {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3 text-red-700 text-sm">
                  <span className="material-icons">error</span>
                  {error}
                </div>
             )}

             {shipments.length === 0 ? (
               <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-24 text-center">
                  <span className="material-icons text-6xl text-slate-300 mb-4">cloud_upload</span>
                  <h3 className="text-xl font-bold text-slate-600">No data loaded yet</h3>
                  <p className="text-slate-400 max-w-xs mx-auto mt-2">Upload your logistics Excel file to unlock deep performance insights and AI analysis.</p>
               </div>
             ) : (
               <>
                 {/* Daily Goal Header Summary */}
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
                          <span className={`text-xs font-black uppercase ${goalTextColor}`}>
                            {goalPct >= 100 ? 'Excelence' : goalPct >= 85 ? 'Target Range' : 'Attention Required'}
                          </span>
                       </div>
                       <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${goalColor} transition-all duration-1000 ease-out shadow-sm`} style={{ width: `${Math.min(100, goalPct)}%` }}></div>
                       </div>
                    </div>
                    <div className="w-full md:w-auto flex items-center gap-4 px-6 border-l border-slate-100">
                       <div className="text-center bg-slate-50 px-5 py-2.5 rounded-[1.25rem] border border-slate-100 mr-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grand Total</p>
                          <p className="text-2xl font-black text-slate-900">{kpis.deliveredCount}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekday Total</p>
                          <p className="text-xl font-black text-slate-800">{kpis.totalWeekdayVolume}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekday Avg</p>
                          <p className="text-xl font-black text-slate-800">{kpis.avgWeekdayVolume}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekend Bonus</p>
                          <p className="text-xl font-black text-emerald-600">+{kpis.weekendBonusVolume}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Days</p>
                          <p className="text-xl font-black text-slate-800">{kpis.totalWeekdaysOperated}</p>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    <KpiCard icon="task_alt" title="Goal Met" value={kpis.daysGoalAchieved.toString()} unit="Days" color="text-emerald-600" calculationLogic={`Weekdays where clearance reached ≥ ${kpis.dailyGoalValue} containers.`} highlight={goalPct >= 100} />
                    <KpiCard icon="running_with_errors" title="Goal Missed" value={kpis.daysGoalNotAchieved.toString()} unit="Days" color="text-red-500" calculationLogic={`Weekdays below the daily target of ${kpis.dailyGoalValue} containers.`} highlight={goalPct < 85} />
                    <KpiCard icon="event_available" title="On-Time" value={kpis.onTimePercentage} unit="%" color="text-emerald-600" calculationLogic="Percentage of shipments where Actual Delivery was <= Estimated Delivery." />
                    <KpiCard icon="payments" title="Demurrage" value={currencyFormatter.format(kpis.totalDemurrage).replace('.00', '')} color="text-red-600" calculationLogic="Total costs from late empty container returns (PCM data)." />
                    <KpiCard icon="speed" title="Port -> BYD" value={kpis.avgPortToDelivery} unit="Days" color="text-blue-600" calculationLogic="Avg days elapsed between ATA (Port) and Actual Delivery at BYD warehouse." />
                    <KpiCard icon="fact_check" title="Clearance" value={kpis.avgAtaToChannel} unit="Days" color="text-amber-600" calculationLogic="Avg days for Customs submission (ATA to CHANNEL DATE - Col R x V)." />
                    <KpiCard icon="description" title="NF Processing" value={kpis.avgChannelToNf} unit="Days" color="text-indigo-600" calculationLogic="Avg days to issue documentation after clearance (CHANNEL DATE to DATE NF - Col V x Y)." />
                    <KpiCard icon="warning" title="At Risk" value={kpis.detentionRiskShipments.toString()} unit="CNTR" color="text-red-500" calculationLogic="Count of containers currently past their return deadline." />
                 </div>

                 <DashboardFilters 
                    carriers={carriersList} analysts={analystsList} cargos={cargosList} containerTypes={containerTypesList} incoterms={incotermsList} years={yearsList}
                    selectedCarriers={filters.carriers} selectedAnalysts={filters.analysts} selectedCargos={filters.cargos} selectedContainerTypes={filters.containerTypes} selectedIncoterms={filters.incoterms}
                    selectedYear={filters.year} selectedPeriod={filters.period} selectedMonth={filters.month}
                    onCarrierChange={(val) => setFilters(f => ({...f, carriers: val}))}
                    onAnalystChange={(val) => setFilters(f => ({...f, analysts: val}))}
                    onCargoChange={(val) => setFilters(f => ({...f, cargos: val}))}
                    onContainerTypeChange={(val) => setFilters(f => ({...f, containerTypes: val}))}
                    onIncotermChange={(val) => setFilters(f => ({...f, incoterms: val}))}
                    onYearChange={(val) => setFilters(f => ({...f, year: val}))}
                    onPeriodChange={(val) => setFilters(f => ({...f, period: val}))}
                    onMonthChange={(val) => setFilters(f => ({...f, month: val}))}
                    onReset={resetFilters}
                 />

                 <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-8">
                        <ChartsGrid data={charts} onLeadTimeClick={(d) => setModalData({ isOpen: true, weekLabel: d.label, shipments: filteredShipments.filter(s => s.deliveryByd && s.deliveryByd.toLocaleDateString() === d.label) })} />
                        <OperationalLotGrid shipments={filteredShipments} onLotClick={handleLotClick} />
                        <DailyLotBreakdown shipments={filteredShipments} />
                    </div>
                    <div className="space-y-8">
                      <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-4 opacity-10">
                            <span className="material-icons text-7xl">tour</span>
                         </div>
                         <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Supervisor Executive Summary</h5>
                         <p className="text-sm font-medium leading-relaxed italic">
                            “During the selected period, the operation achieved the daily goal on <span className="text-emerald-400 font-bold">{kpis.daysGoalAchieved}</span> out of <span className="text-slate-300 font-bold">{kpis.totalWeekdaysOperated}</span> weekdays, reaching <span className={`${goalTextColor} font-bold`}>{kpis.goalAchievementPct}%</span> of the target. 
                            Weekend operations added <span className="text-emerald-400 font-bold">{kpis.weekendBonusVolume}</span> bonus containers, improving overall throughput.”
                         </p>
                      </div>
                      <SupplierAnalysis shipments={filteredShipments} />
                      <ScenarioChart shipments={filteredShipments} />
                    </div>
                 </div>

                 <ShipmentTable 
                    shipments={paginatedShipments} sortConfig={sortConfig} onSort={setSortConfig} searchTerm={searchTerm} onSearch={setSearchTerm}
                    currentPage={currentPage} totalItems={sortedShipments.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage}
                 />
               </>
             )}
          </div>
        ) : mainView === "benchmark" ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-2 flex flex-col justify-between gap-6 md:flex-row md:items-center print:mb-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Benchmark & Estimation</h2>
                <p className="text-slate-500 text-sm">Simulate costs for future projects using historical INCT benchmarks and quantity controls.</p>
              </div>

              <div className="flex items-center gap-4 print:hidden">
                <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 p-2 shadow-sm">
                  <label className="text-[10px] font-bold uppercase text-slate-400 px-2">Global Qty Est.</label>
                  <div className="flex items-center gap-1">
                    <button onClick={() => benchmark.handleQuantityChange(containerQuantity - 1)} className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600">
                      <span className="material-icons text-sm">remove</span>
                    </button>
                    <input type="number" value={containerQuantity} onChange={(e) => benchmark.handleQuantityChange(parseInt(e.target.value) || 1)} className="w-14 text-center font-black text-red-600 focus:outline-none" />
                    <button onClick={() => benchmark.handleQuantityChange(containerQuantity + 1)} className="h-9 w-9 flex items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md">
                      <span className="material-icons text-sm">add</span>
                    </button>
                  </div>
                </div>
                <button onClick={benchmark.resetToInitial} className="h-12 px-6 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white transition-all shadow-sm">Reset Estimates</button>
              </div>
            </header>

            <nav className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit print:hidden">
              {[
                { id: "freight", label: "General Freight", icon: "local_shipping" },
                { id: "return", label: "Return Empty Cntr", icon: "keyboard_return" },
                { id: "warehouse", label: "Bonded Warehouse", icon: "warehouse" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => benchmark.setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black transition-all ${
                    activeTab === tab.id ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <span className="material-icons text-sm">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            <InctConfigPanel inct={inct} onInctChange={benchmark.handleINCTChange} />

            {activeTab === "warehouse" && (
              <WarehouseScenarioSummary routes={benchmark.activeRoutes} carriers={benchmark.activeCarriers} quantity={containerQuantity} />
            )}

            <RoutesTable 
              routes={benchmark.activeRoutes} carriers={benchmark.activeCarriers} routeMetrics={benchmark.routeMetrics} inct={inct}
              onPriceChange={benchmark.handlePriceChange} showDistance={activeTab !== "warehouse"} 
            />

            <CarrierCards 
              carriers={benchmark.activeCarriers} carrierSummary={benchmark.carrierSummary} routeMetrics={benchmark.routeMetrics}
              routes={benchmark.activeRoutes} inct={inct} justifications={justifications as any} onJustificationChange={benchmark.handleJustificationChange}
            />
          </div>
        ) : mainView === "estimative" ? (
          <TransportEstimative 
            routes={benchmark.state.routes}
            routeMetrics={benchmark.allFreightMetrics}
            warehouseRoutes={benchmark.state.warehouseRoutes}
            provision={provision}
            historicalShipments={filteredShipments} 
            onUpdate={benchmark.handleProvisionUpdate}
            onRouteQtyUpdate={benchmark.handleRouteProvisionQty}
          />
        ) : (
          <WarehouseSimulation historicalShipments={filteredShipments} />
        )}
      </div>

      <ChartDetailsModal isOpen={modalData.isOpen} weekLabel={modalData.weekLabel} shipments={modalData.shipments} onClose={() => setModalData(d => ({...d, isOpen: false}))} />
    </div>
  );
}
