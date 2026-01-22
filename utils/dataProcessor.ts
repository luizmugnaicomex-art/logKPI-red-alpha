
import { Shipment, KpiData, ChartData } from '../types';

const DAILY_GOAL_TARGET = 150;

const DEMURRAGE_RATES: Record<string, number> = {
    'MSC': 165.00,
    'CMA CGM': 250.00,
    'CMA': 250.00,
    'COSCO': 80.00,
    'CSSC': 80.00,
    'MAERSK': 0.00,
    'HAPAG': 0.00,
    'ONE': 0.00,
    'ZIM': 0.00
};

const WAREHOUSE_CAPACITIES: Record<string, number> = {
    'TECON': 2500,
    'INTERMARITIMA': 2500,
    'TPC': 2500,
    'CLIA EMPORIO': 300
};

const parseDate = (dateInput: any): Date | null => {
    if (!dateInput) return null;
    
    if (dateInput instanceof Date) {
        if (isNaN(dateInput.getTime()) || dateInput.getFullYear() < 2000) return null;
        return dateInput;
    }

    if (typeof dateInput === 'number') {
        if (dateInput > 36526 && dateInput < 2958465) { 
             const utc_days  = Math.floor(dateInput - 25569);
             const utc_value = utc_days * 86400;                                        
             const date_info = new Date(utc_value * 1000);
             return date_info;
        }
    }

    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
        if (ddmmyyyy) {
            const day = parseInt(ddmmyyyy[1], 10);
            const month = parseInt(ddmmyyyy[2], 10) - 1;
            const year = parseInt(ddmmyyyy[3], 10);
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime()) && date.getTime() > 0) return date;
        }

        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
            if (date.getFullYear() < 2000) return null;
            const userTimezoneOffset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() + userTimezoneOffset);
        }
    }
    return null;
};

const toUTC = (date: Date): Date => {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const dateDiffInDays = (date1: Date | null, date2: Date | null): number | null => {
    if (!date1 || !date2) return null;
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    const utc1 = toUTC(date1);
    const utc2 = toUTC(date2);
    return Math.floor((utc2.getTime() - utc1.getTime()) / _MS_PER_DAY);
};


export const processRawData = (data: any[][]): { shipments: Shipment[], carriers: string[], analysts: string[], cargos: string[], containerTypes: string[], incoterms: string[], years: number[] } => {
    const headerRow = data.find(row => Array.isArray(row) && row.some(cell => String(cell).toUpperCase().includes("SHIPPER")));
    if (!headerRow) throw new Error("Could not find a valid header row in the Excel file.");

    const headers = headerRow.map(h => 
        String(h || '')
            .toUpperCase()
            .replace(/\s+/g, ' ')
            .trim()
    );

    const findHeaderIndex = (...possibleNames: string[]): number => {
        for (const name of possibleNames) {
            let index = headers.indexOf(name);
            if (index !== -1) return index;
            index = headers.findIndex(h => h === name);
            if (index !== -1) return index;
        }
        return -1;
    };

    const indices = {
        containerNumber: findHeaderIndex('CONTAINER ID', 'CONTAINER', 'CONTAINER NUMBER', 'CONTAINER NO', 'CNTR', 'CNTR NO', 'CNTRS ORIGINAL'),
        lotNumber: findHeaderIndex('DI', 'DI NO', 'DI NUMBER', 'LOT', 'LOT NUMBER'),
        batchNumber: findHeaderIndex('BATCH', 'BATCH NUMBER', 'LOT NO'), // Column I
        cargoModel: findHeaderIndex('DESCRIPTION OF CARGO', 'CARGO DESCRIPTION', 'MODEL', 'CARGO'), // Column M
        shipper: findHeaderIndex('SHIPPER'),
        shipowner: findHeaderIndex('SHIPOWNER', 'ARMADOR', 'SHIP OWNER', 'OWNER'), 
        vesselName: findHeaderIndex('ARRIVAL VESSEL', 'VESSEL', 'VESSEL NAME', 'SHIP', 'NAVIO', 'MOTHER VESSEL'),
        cargo: findHeaderIndex('CARGO', 'COMMODITY', 'GOODS', 'DESCRIPTION', 'PRODUCT', 'MATERIAL', 'MERCHANDISE', 'DESCRIPTION OF GOODS'),
        containerType: findHeaderIndex('LOADING TYPE', 'CONTAINER TYPE', 'TYPE', 'LOAD TYPE', 'FCL/LCL', 'SERVICE TYPE', 'TIPO'),
        incoterm: findHeaderIndex('INCOTERM', 'TERM', 'INCOTERMS'),
        bondedWarehouse: findHeaderIndex('TERMINAL', 'BONDED WAREHOUSE', 'ARMAZEM', 'DEPOT', 'LOCAL', 'RECINTO', 'PICK UP LOCATION', 'LOCAL DE RETIRADA', 'DESTINATION TERMINAL'),
        ata: findHeaderIndex('ATA', 'ARRIVAL', 'DISCHARGE DATE'),
        deliveryByd: findHeaderIndex('DELIVERY DATE AT BYD', 'DELIVERY DATE', 'DATA ENTREGA'),
        estimatedDelivery: findHeaderIndex('ESTIMATED DELIVERY DATE', 'ESTIMATED DELIVERY'),
        demurrageCost: findHeaderIndex('COST DEMURRAGE TOTAL', 'DEMURRAGE', 'DEMURRAGE COST'),
        parametrization: findHeaderIndex('PARAMETRIZATION', 'CUSTOMS CHANNEL', 'CANAL'),
        dateNF: findHeaderIndex('DATE NOTA FISCAL', 'DATE NF', 'DATA NF'),
        unloadDate: findHeaderIndex('UNLOAD DATE', 'DATA DESOVA'),
        carrier: findHeaderIndex('CARRIER', 'TRANSPORTADORA'),
        analyst: findHeaderIndex('RESPONSIBLE ANALYST', 'ANALYST', 'ANALISTA'),
        cargoReadyDate: findHeaderIndex('CARGO READY (DATE)', 'CARGO READY DATE', 'CARGO READY'),
        channelDate: findHeaderIndex('CHANNEL DATE', 'DATA CANAL'),
        actualDepotReturnDate: findHeaderIndex('ACTUAL DEPOT RETURN DATE', 'ACTUAL RETURN', 'DEVOLUCAO VAZIO', 'DATA DEVOLUÇÃO'),
        deadlineReturnDate: findHeaderIndex('DEADLINE RETURN CNTR', 'DEADLINE RETURN', 'DEADLINE', 'PRAZO DEVOLUÇÃO', 'END OF FREE TIME'), 
        estimatedDepotDate: findHeaderIndex('ESTIMATED DEPOT DATE', 'ESTIMATED RETURN'),
        freeTimeDate: findHeaderIndex('FREE TIME', 'FREE DAYS'),
        totalCost: findHeaderIndex('TOTAL COST', 'TOTAL', 'TOTAL INTERNATIONAL COSTS'),
        taxCost: findHeaderIndex('TOTAL TAXES', 'TAXES', 'TAX', 'IMPOSTOS'),
        extraCost: findHeaderIndex('TOTAL EXTRA COSTS', 'EXTRA COSTS', 'EXTRA STORAGE'),
    };

    const carriers = new Set<string>();
    const analysts = new Set<string>();
    const cargos = new Set<string>();
    const containerTypes = new Set<string>();
    const incoterms = new Set<string>();
    
    const years = new Set<number>([new Date().getFullYear()]);
    
    const seenContainers = new Set<string>();
    const headerIndex = data.indexOf(headerRow);

    const shipments: Shipment[] = data.slice(headerIndex + 1).map(row => {
        if (!row || row.length === 0 || !row[indices.shipper]) return null;

        const containerNumber = indices.containerNumber !== -1 ? String(row[indices.containerNumber] || '').trim() : '';

        if (containerNumber && seenContainers.has(containerNumber)) {
            return null;
        }
        if (containerNumber) {
            seenContainers.add(containerNumber);
        }

        const ataDate = parseDate(row[indices.ata]);
        if (ataDate) years.add(ataDate.getFullYear());

        const deliveryBydDate = parseDate(row[indices.deliveryByd]);
        if (deliveryBydDate) years.add(deliveryBydDate.getFullYear());

        const estimatedDeliveryDate = parseDate(row[indices.estimatedDelivery]);
        const dateNFDate = parseDate(row[indices.dateNF]);
        const cargoReadyDate = parseDate(row[indices.cargoReadyDate]);
        const channelDate = parseDate(row[indices.channelDate]);
        const unloadDate = parseDate(row[indices.unloadDate]);
        const actualDepotReturnDate = parseDate(row[indices.actualDepotReturnDate]);

        let deadlineReturnDate = parseDate(row[indices.deadlineReturnDate]);
        const rawFreeTime = indices.freeTimeDate !== -1 ? row[indices.freeTimeDate] : undefined;
        
        if (!deadlineReturnDate && ataDate && rawFreeTime) {
             const parsedNum = parseInt(rawFreeTime, 10);
             if (!isNaN(parsedNum)) {
                 const computedDeadline = new Date(ataDate);
                 computedDeadline.setDate(computedDeadline.getDate() + parsedNum);
                 deadlineReturnDate = computedDeadline;
             }
        }
        
        let freeTimeDate = deadlineReturnDate; 

        let shipowner = indices.shipowner !== -1 ? String(row[indices.shipowner] || '').trim().toUpperCase() : '';
        if (shipowner === 'CSSC') shipowner = 'COSCO';

        let carrierRaw = String(row[indices.carrier] || 'Unknown');
        if (carrierRaw.trim().toUpperCase() === 'CSSC') carrierRaw = 'COSCO';
        const carrier = (carrierRaw === 'Unknown' || carrierRaw === '') ? 'Unknown' : carrierRaw;

        const analyst = String(row[indices.analyst] || 'Unknown');
        const cargo = indices.cargo !== -1 ? String(row[indices.cargo] || '').trim() : '';
        
        // Model Extraction Logic
        let cargoRawDesc = indices.cargoModel !== -1 ? String(row[indices.cargoModel] || 'Other').trim() : 'Other';
        let extractedModel = 'Other';
        const modelNames = ['DOLPHIN MINI', 'DOLPHIN', 'KING', 'SONG PRO', 'SEAL', 'YUAN PLUS', 'HAN', 'TAN'];
        const foundModel = modelNames.find(m => cargoRawDesc.toUpperCase().includes(m));
        if (foundModel) extractedModel = foundModel.charAt(0) + foundModel.slice(1).toLowerCase();

        const vesselName = indices.vesselName !== -1 ? String(row[indices.vesselName] || '').trim() : '';
        const containerType = indices.containerType !== -1 ? String(row[indices.containerType] || '').trim() : '';
        const incoterm = indices.incoterm !== -1 ? String(row[indices.incoterm] || '').trim().toUpperCase() : '';
        
        let bondedWarehouse = indices.bondedWarehouse !== -1 ? String(row[indices.bondedWarehouse] || 'Unknown').trim() : 'Unknown';
        if (bondedWarehouse === '') bondedWarehouse = 'Unknown';

        const bwUpper = bondedWarehouse.toUpperCase();
        if (bwUpper.includes('TECON') || bwUpper.includes('WILSON')) {
            bondedWarehouse = 'TECON';
        } else if (bwUpper.includes('INTERMARITIMA') || bwUpper.includes('INTERMAR')) {
            bondedWarehouse = 'INTERMARITIMA';
        } else if (bwUpper.includes('TPC')) {
            bondedWarehouse = 'TPC';
        } else if (bwUpper.includes('EMPORIO') || bwUpper.includes('CLIA')) {
            bondedWarehouse = 'CLIA EMPORIO';
        }

        if (carrier !== 'Unknown') carriers.add(carrier);
        if (analyst !== 'Unknown') analysts.add(analyst);
        if (cargo) cargos.add(cargo);
        if (containerType) containerTypes.add(containerType);
        if (incoterms) incoterms.add(incoterm);

        const rawParam = String(row[indices.parametrization] || 'Unknown').trim();
        const parametrization = rawParam.length > 0
            ? rawParam.charAt(0).toUpperCase() + rawParam.slice(1).toLowerCase()
            : 'Unknown';

        const totalCostRaw = indices.totalCost !== -1 ? Number(row[indices.totalCost]) : 0;
        const taxCostRaw = indices.taxCost !== -1 ? Number(row[indices.taxCost]) : 0;
        const extraCostRaw = indices.extraCost !== -1 ? Number(row[indices.extraCost]) : 0;

        let demurrageDays = 0;
        let calculatedDemurrageCost = 0;

        if (deadlineReturnDate) {
            const deadlineUTC = toUTC(deadlineReturnDate);
            const returnUTC = actualDepotReturnDate ? toUTC(actualDepotReturnDate) : null;
            const todayUTC = toUTC(new Date());
            const effectiveDate = returnUTC || todayUTC;

            if (effectiveDate > deadlineUTC) {
                const diffTime = effectiveDate.getTime() - deadlineUTC.getTime();
                demurrageDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            }

            if (demurrageDays > 0) {
                let rate = DEMURRAGE_RATES[shipowner] || 0;
                calculatedDemurrageCost = demurrageDays * rate;
            }
        }

        const finalDemurrageCost = calculatedDemurrageCost > 0 
            ? calculatedDemurrageCost 
            : (Number(row[indices.demurrageCost]) || 0);

        return {
            containerNumber,
            lotNumber: indices.lotNumber !== -1 ? String(row[indices.lotNumber] || 'N/A').trim() : 'N/A',
            batchNumber: indices.batchNumber !== -1 ? String(row[indices.batchNumber] || '0').trim() : '0',
            cargoModel: extractedModel,
            shipper: String(row[indices.shipper] || ''),
            shipowner,
            cargo,
            vesselName,
            containerType,
            incoterm,
            bondedWarehouse,
            ata: ataDate,
            deliveryByd: deliveryBydDate,
            estimatedDelivery: estimatedDeliveryDate,
            demurrageCost: finalDemurrageCost,
            parametrization,
            dateNF: dateNFDate,
            unloadDate: unloadDate,
            carrier,
            analyst,
            cargoReadyDate: cargoReadyDate,
            channelDate: channelDate,
            actualDepotReturnDate: actualDepotReturnDate,
            estimatedDepotDate: parseDate(row[indices.estimatedDepotDate]),
            freeTimeDate: freeTimeDate,
            totalCost: totalCostRaw,
            taxCost: taxCostRaw,
            extraCost: extraCostRaw,
            portToDelivery: dateDiffInDays(ataDate, deliveryBydDate),
            clientDeliveryVariance: dateDiffInDays(estimatedDeliveryDate, deliveryBydDate),
            totalClearanceTime: dateDiffInDays(ataDate, dateNFDate),
            ataToChannelTime: dateDiffInDays(ataDate, channelDate),
            channelToNfTime: dateDiffInDays(channelDate, dateNFDate),
            customsProcessTime: dateDiffInDays(cargoReadyDate, dateNFDate),
            portToCustomsTime: dateDiffInDays(ataDate, cargoReadyDate),
            transportDeliveryTime: dateDiffInDays(cargoReadyDate, deliveryBydDate),
            containerStreetTurnTime: dateDiffInDays(deliveryBydDate, actualDepotReturnDate),
            depotReturnVariance: dateDiffInDays(parseDate(row[indices.estimatedDepotDate]), actualDepotReturnDate),
            detentionRisk: demurrageDays, 
            portToCargoReady: dateDiffInDays(ataDate, cargoReadyDate),
        };
    }).filter((s): s is Shipment => s !== null);

    return { 
        shipments, 
        carriers: [...carriers].sort(), 
        analysts: [...analysts].sort(), 
        cargos: [...cargos].sort(), 
        containerTypes: [...containerTypes].sort(),
        incoterms: [...incoterms].sort(),
        years: [...years].sort((a,b) => b-a) 
    };
};

const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

export const calculateDashboardData = (shipments: Shipment[]): { kpis: KpiData, charts: ChartData } => {
    const totalShipments = shipments.length;
    const deliveredShipments = shipments.filter(s => s.deliveryByd !== null);
    
    const clientDeliveryVariances = shipments.map(s => s.clientDeliveryVariance).filter((d): d is number => d !== null);
    const onTimeTotal = shipments.filter(s => s.estimatedDelivery && s.deliveryByd).length;
    const onTimeCount = clientDeliveryVariances.filter(d => d <= 0).length;
    const onTimePercentage = onTimeTotal ? ((onTimeCount / onTimeTotal) * 100).toFixed(1) : '0.0';
    
    const totalDemurrage = shipments.reduce((sum, s) => sum + s.demurrageCost, 0);
    const demurrageShipmentsCount = shipments.filter(s => s.demurrageCost > 0).length;
    const detentionRiskShipments = shipments.filter(s => s.detentionRisk !== null && s.detentionRisk > 0);
    
    // Daily Volume Goal Logic
    const dailyData: Record<string, { date: Date; label: string; containerCount: number; lateCount: number; isWeekend: boolean; goalReached: boolean; achievementPct: number; carrierVolume: Record<string, number>; carrierLate: Record<string, number> }> = shipments.reduce((acc, s) => {
        if (s.deliveryByd) {
            const dateObj = new Date(s.deliveryByd);
            dateObj.setHours(0,0,0,0);
            const dayKey = dateObj.toISOString().split('T')[0];
            const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            if (!acc[dayKey]) {
                acc[dayKey] = { 
                    date: dateObj, 
                    label: dateObj.toLocaleDateString(), 
                    containerCount: 0, 
                    lateCount: 0,
                    isWeekend,
                    goalReached: false,
                    achievementPct: 0,
                    carrierVolume: {},
                    carrierLate: {}
                };
            }
            acc[dayKey].containerCount++;
            
            const carrier = s.carrier || 'Unknown';
            acc[dayKey].carrierVolume[carrier] = (acc[dayKey].carrierVolume[carrier] || 0) + 1;

            if (s.clientDeliveryVariance !== null && s.clientDeliveryVariance > 0) {
                acc[dayKey].lateCount++;
                acc[dayKey].carrierLate[carrier] = (acc[dayKey].carrierLate[carrier] || 0) + 1;
            }
        }
        return acc;
    }, {} as Record<string, any>);

    let totalWeekdaysOperated = 0;
    let daysGoalAchieved = 0;
    let weekendBonusVolume = 0;
    let totalWeekdayVolume = 0;

    Object.values(dailyData).forEach(day => {
        if (!day.isWeekend) {
            totalWeekdaysOperated++;
            totalWeekdayVolume += day.containerCount;
            day.achievementPct = parseFloat(((day.containerCount / DAILY_GOAL_TARGET) * 100).toFixed(1));
            if (day.containerCount >= DAILY_GOAL_TARGET) {
                daysGoalAchieved++;
                day.goalReached = true;
            }
        } else {
            weekendBonusVolume += day.containerCount;
            day.achievementPct = 0; // Bonus is plus, not against goal percentage
        }
    });

    const daysGoalNotAchieved = totalWeekdaysOperated - daysGoalAchieved;
    const goalAchievementPct = totalWeekdaysOperated > 0 ? ((daysGoalAchieved / totalWeekdaysOperated) * 100).toFixed(1) : '0.0';
    const avgWeekdayVolume = totalWeekdaysOperated > 0 ? (totalWeekdayVolume / totalWeekdaysOperated).toFixed(1) : '0.0';

    const kpis: KpiData = {
        totalShipments,
        deliveredCount: deliveredShipments.length,
        onTimePercentage,
        totalDemurrage,
        demurrageShipmentsCount,
        detentionRiskShipments: detentionRiskShipments.length,
        avgPortToDelivery: avg(shipments.map(s => s.portToDelivery).filter((d): d is number => d !== null && d >= 0)).toFixed(1),
        avgClearanceTime: avg(shipments.map(s => s.totalClearanceTime).filter((d): d is number => d !== null && d >= 0)).toFixed(1),
        avgAtaToChannel: avg(shipments.map(s => s.ataToChannelTime).filter((d): d is number => d !== null && d >= 0)).toFixed(1),
        avgChannelToNf: avg(shipments.map(s => s.channelToNfTime).filter((d): d is number => d !== null && d >= 0)).toFixed(1),
        avgTransportTime: avg(shipments.map(s => s.transportDeliveryTime).filter((d): d is number => d !== null && d >= 0)).toFixed(1),
        avgStreetTurnTime: avg(shipments.map(s => s.containerStreetTurnTime).filter((d): d is number => d !== null && d >= 0)).toFixed(1),
        avgPortToCargoReady: avg(shipments.map(s => s.portToCargoReady).filter((d): d is number => d !== null && d >= 0)).toFixed(1),
        avgClientDeliveryVariance: avg(clientDeliveryVariances).toFixed(1),
        avgDelayOnLate: avg(clientDeliveryVariances.filter(d => d > 0)).toFixed(1),
        avgDetentionDays: avg(detentionRiskShipments.map(s => s.detentionRisk).filter((d): d is number => d !== null)).toFixed(1),
        demurrageIncidence: totalShipments > 0 ? ((demurrageShipmentsCount / totalShipments) * 100).toFixed(1) : '0.0',
        detentionIncidence: totalShipments > 0 ? ((detentionRiskShipments.length / totalShipments) * 100).toFixed(1) : '0.0',
        // Goal KPIs
        dailyGoalValue: DAILY_GOAL_TARGET,
        daysGoalAchieved,
        daysGoalNotAchieved,
        goalAchievementPct,
        avgWeekdayVolume,
        totalWeekdayVolume,
        weekendBonusVolume,
        totalWeekdaysOperated
    };
    
    const leadTimeTrend = (Object.values(dailyData) as any[]).sort((a,b) => a.date.getTime() - b.date.getTime());

    // Generate daily carrier breakdown data for stacked charts
    const dailyCarrierBreakdown = leadTimeTrend.map(day => ({
        date: day.date,
        label: day.label,
        total: day.containerCount,
        ...day.carrierVolume
    }));

    const monthlyTrendMap: Record<number, { name: string; value: number; late: number; sortKey: number; date: Date; growthPct: number }> = shipments.reduce((acc, s) => {
        if (s.deliveryByd) {
            const d = new Date(s.deliveryByd);
            const monthIdx = d.getMonth();
            const year = d.getFullYear();
            const sortKey = year * 100 + monthIdx;
            const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            const refDate = new Date(year, monthIdx, 1);
            if (!acc[sortKey]) {
                acc[sortKey] = { name: label, value: 0, late: 0, sortKey, date: refDate, growthPct: 0 };
            }
            acc[sortKey].value += 1;
             if (s.clientDeliveryVariance !== null && s.clientDeliveryVariance > 0) {
                acc[sortKey].late++;
            }
        }
        return acc;
    }, {} as Record<number, any>);

    const monthlyTrend = (Object.values(monthlyTrendMap) as any[]).sort((a, b) => a.sortKey - b.sortKey);
    
    // Add Month-over-Month Growth Calculation
    monthlyTrend.forEach((item, index) => {
        if (index === 0) {
            item.growthPct = 0;
        } else {
            const prevValue = monthlyTrend[index - 1].value;
            item.growthPct = prevValue > 0 ? parseFloat((((item.value - prevValue) / prevValue) * 100).toFixed(1)) : 0;
        }
    });

    // Monthly & Yearly Operational Progress Status
    const monthlyStatusMap: Record<number, { name: string; delivered: number; pending: number; total: number; sortKey: number; date: Date }> = {};
    const yearlyStatusMap: Record<number, { name: string; delivered: number; pending: number; total: number; sortKey: number }> = {};

    shipments.forEach(s => {
        const date = s.estimatedDelivery || s.ata;
        if (date) {
            const monthIdx = date.getMonth();
            const year = date.getFullYear();
            const mSortKey = year * 100 + monthIdx;
            const mLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            const refDate = new Date(year, monthIdx, 1);
            
            if (!monthlyStatusMap[mSortKey]) {
                monthlyStatusMap[mSortKey] = { name: mLabel, delivered: 0, pending: 0, total: 0, sortKey: mSortKey, date: refDate };
            }
            if (!yearlyStatusMap[year]) {
                yearlyStatusMap[year] = { name: year.toString(), delivered: 0, pending: 0, total: 0, sortKey: year };
            }

            const isDelivered = s.deliveryByd !== null;
            monthlyStatusMap[mSortKey].total += 1;
            yearlyStatusMap[year].total += 1;
            if (isDelivered) {
                monthlyStatusMap[mSortKey].delivered += 1;
                yearlyStatusMap[year].delivered += 1;
            } else {
                monthlyStatusMap[mSortKey].pending += 1;
                yearlyStatusMap[year].pending += 1;
            }
        }
    });
    const monthlyStatus = Object.values(monthlyStatusMap).sort((a, b) => a.sortKey - b.sortKey);
    const yearlyStatus = Object.values(yearlyStatusMap).sort((a, b) => a.sortKey - b.sortKey);

    const counts = leadTimeTrend.map(d => d.containerCount);
    const totalVol = counts.reduce((a, b) => a + b, 0);
    const maxVol = counts.length > 0 ? Math.max(...counts) : 0;
    const minVol = counts.length > 0 ? Math.min(...counts) : 0;
    const avgVol = counts.length > 0 ? totalVol / counts.length : 0;
    const dailyVolumeStats = { avg: avgVol, min: minVol, max: maxVol };

    const cycleTime = [
        { name: 'Port to Customs', value: parseFloat(avg(shipments.map(s => s.portToCustomsTime).filter((d): d is number => d !== null && d >= 0)).toFixed(1)) },
        { name: 'Customs Process', value: parseFloat(avg(shipments.map(s => s.customsProcessTime).filter((d): d is number => d !== null && d >= 0)).toFixed(1)) },
        { name: 'Transport to Delivery', value: parseFloat(avg(shipments.map(s => s.transportDeliveryTime).filter((d): d is number => d !== null && d >= 0)).toFixed(1)) }
    ];

    const aggregateBy = <T>(key: keyof Shipment, valueCalc: (s: Shipment) => T | null, aggregator: (values: T[]) => number) => {
        const grouped: Record<string, T[]> = {};
        shipments.forEach(s => {
            const groupKey = String(s[key] || 'Unknown');
            const value = valueCalc(s);
            if(groupKey && value !== null){
                if(!grouped[groupKey]) grouped[groupKey] = [];
                grouped[groupKey].push(value);
            }
        });
        return Object.entries(grouped).map(([name, values]) => ({ name, value: aggregator(values) }));
    };

    const carrierPerformance = aggregateBy('carrier', s => s.transportDeliveryTime, vals => avg(vals as number[])).map(d => ({name: d.name, avgTime: d.value})).sort((a, b) => a.avgTime - b.avgTime);

    // Calculate detailed Carrier Delay Impact metrics
    const carrierDelayImpact = Object.entries(shipments.reduce((acc, s) => {
        const c = s.carrier || 'Unknown';
        if (!acc[c]) acc[c] = { total: 0, late: 0 };
        acc[c].total++;
        if (s.clientDeliveryVariance !== null && s.clientDeliveryVariance > 0) acc[c].late++;
        return acc;
    }, {} as Record<string, { total: number, late: number }>)).map(([name, stats]) => ({
        name,
        volume: stats.total,
        lateCount: stats.late,
        latePct: parseFloat(((stats.late / stats.total) * 100).toFixed(1)),
        volumePct: parseFloat(((stats.total / totalShipments) * 100).toFixed(1))
    })).sort((a, b) => b.volume - a.volume);

    const customsChannel = aggregateBy('parametrization', () => 1, vals => vals.length);
    const analystWorkload = aggregateBy('analyst', () => 1, vals => vals.length).sort((a, b) => a.name.localeCompare(b.name));
    const demurrageByShipowner = aggregateBy('shipowner', s => s.demurrageCost, vals => (vals as number[]).reduce((a,b) => a+b, 0)).map(d => ({name: d.name, cost: d.value})).sort((a, b) => b.cost - a.cost);
    const streetTurnByCarrier = aggregateBy('carrier', s => s.containerStreetTurnTime, vals => avg(vals as number[])).map(d => ({name: d.name, avgTime: d.value})).sort((a, b) => a.avgTime - b.avgTime);
    const portToCargoReadyByCarrier = aggregateBy('carrier', s => s.portToCargoReady, vals => avg(vals as number[])).map(d => ({name: d.name, avgTime: d.value})).sort((a, b) => a.avgTime - b.avgTime);
    const deliveryVarianceByCarrier = aggregateBy('carrier', s => s.clientDeliveryVariance, vals => avg(vals as number[])).map(d => ({ name: d.name, avgVariance: d.value })).sort((a, b) => b.avgVariance - a.avgVariance);
    const carrierVolume = aggregateBy('carrier', s => s.deliveryByd ? 1 : null, vals => vals.length).sort((a, b) => b.value - a.value);

    const warehouseVolume = aggregateBy('bondedWarehouse', s => 1, vals => vals.length)
        .map(d => ({
            name: d.name,
            value: d.value,
            capacity: WAREHOUSE_CAPACITIES[d.name] || 0
        }))
        .sort((a, b) => b.value - a.value);
    
    const unloadedByWarehouse = aggregateBy('bondedWarehouse', s => s.unloadDate ? 1 : null, vals => vals.length)
        .map(d => ({
            name: d.name,
            value: d.value,
            capacity: WAREHOUSE_CAPACITIES[d.name] || 0
        }))
        .sort((a, b) => b.value - a.value);

    const charts: ChartData = {
        leadTimeTrend,
        dailyCarrierBreakdown,
        monthlyTrend,
        monthlyStatus,
        yearlyStatus,
        dailyVolumeStats,
        cycleTime,
        carrierPerformance,
        carrierDelayImpact,
        customsChannel,
        demurrageIncidence: [ { name: 'No Demurrage', value: totalShipments - demurrageShipmentsCount }, { name: 'With Demurrage', value: demurrageShipmentsCount } ],
        detentionRisk: [ { name: 'On Time Return', value: totalShipments - detentionRiskShipments.length }, { name: 'Late Return', value: detentionRiskShipments.length } ],
        analystWorkload,
        demurrageByShipowner,
        streetTurnByCarrier,
        portToCargoReadyByCarrier,
        deliveryVarianceByCarrier,
        carrierVolume,
        warehouseVolume, 
        unloadedByWarehouse,
    };
    
    return { kpis, charts };
};
