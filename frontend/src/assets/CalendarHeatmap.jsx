import { useState, useEffect } from 'react';

export default function CalendarHeatmap({ startDate, endDate, refreshKey, category, totalSpending }) {

    const [days, setDays] = useState([]);
    const [emptyDays, setEmptyDays] = useState([]);
    const [maxAmount, setMaxAmount] = useState(0);

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    useEffect(() => {
        async function fetchHeatmapData() {
            const response = await fetch(`http://192.168.0.55:8000/transactions/heatmap?start_date=${startDate}&end_date=${endDate}&category=${category}`);
            const apiData = await response.json();

            const dataMap = {};
            apiData.forEach(item => {
                dataMap[item.day] = item.total;
            });

            const start = new Date(`${startDate}T00:00:00`);
            const end = new Date(`${endDate}T00:00:00`);

            const firstDayIndex = start.getDay();
            setEmptyDays(Array.from({ length: firstDayIndex }).map((_, i) => i));

            const periodDays = [];
            let currentMax = 0;

            for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const dateString = `${yyyy}-${mm}-${dd}`;

                const total = dataMap[dateString] || 0;
                if (total > currentMax) currentMax = total;

                periodDays.push({
                    dateString: dateString,
                    dayNumber: d.getDate(),
                    total: total
                });
            }

            setDays(periodDays);
            setMaxAmount(currentMax);
        }

        if (startDate && endDate) {
            fetchHeatmapData();
        }
    }, [startDate, endDate, refreshKey, category]);

    const getOpacityClass = (total) => {
        if (total === 0) return 'bg-neutral-800 text-neutral-500 opacity-50';
        const percentage = total / maxAmount;
        if (percentage <= 0.25) return 'bg-emerald-500/30 text-white';
        if (percentage <= 0.50) return 'bg-emerald-500/50 text-white';
        if (percentage <= 0.75) return 'bg-emerald-500/75 text-white';
        return 'bg-emerald-500/100 text-white font-bold';
    };

    const formatCOP = (amount) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
    };

    return (
        <div className="w-full bg-neutral-800 p-6 rounded-xl border border-neutral-700">
            <div className="grid grid-cols-7 gap-2 mb-4">
                {weekDays.map((day, index) => (
                    <div key={index} className="text-center text-neutral-400 font-bold text-sm tracking-wider">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {emptyDays.map((_, index) => (
                    <div key={`empty-${index}`} className="h-20 bg-transparent"></div>
                ))}
                {days.map((day) => (
                    <div
                        key={day.dateString}
                        className={`relative h-20 rounded-lg p-2 flex flex-col justify-between group transition-colors cursor-pointer border border-neutral-700/50 ${getOpacityClass(day.total)}`}
                    >
                        <span className="font-semibold">{day.dayNumber}</span>

                        {day.total > 0 && (
                            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 border border-neutral-600 text-neutral-100 text-base rounded p-3 bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10 whitespace-nowrap shadow-xl flex flex-col items-center gap-1">
                                <span className="font-bold text-emerald-400">
                                    {totalSpending > 0 ? ((day.total / totalSpending) * 100).toFixed(1) : 0}%
                                </span>
                                <span className="text-sm text-neutral-300">
                                    {formatCOP(day.total)}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}