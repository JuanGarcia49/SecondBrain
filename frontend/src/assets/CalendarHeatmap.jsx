import { useState, useEffect } from 'react';

export default function CalendarHeatmap({ startDate, endDate }) {
    const [days, setDays] = useState([]);
    const [maxAmount, setMaxAmount] = useState(0);

    useEffect(() => {
        async function fetchHeatmapData() {
            const response = await fetch(`http://192.168.0.55:8000/transactions/heatmap?start_date=${startDate}&end_date=${endDate}`);
            const apiData = await response.json();

            const dataMap = {};
            apiData.forEach(item => {
                dataMap[item.day] = item.total;
            });

            const start = new Date(startDate);
            const end = new Date(endDate);
            const periodDays = [];
            let currentMax = 0;

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateString = d.toISOString().split('T')[0];
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
    }, [startDate, endDate]);

    const getOpacityClass = (total) => {
        if (total === 0) return 'bg-gray-800 text-gray-600 opacity-50';
        const percentage = total / maxAmount;
        if (percentage <= 0.25) return 'bg-green-500/30 text-white';
        if (percentage <= 0.50) return 'bg-green-500/50 text-white';
        if (percentage <= 0.75) return 'bg-green-500/75 text-white';
        return 'bg-green-500/100 text-white';
    };

    const formatCOP = (amount) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
    };

    return (
        <div className="w-full bg-gray-900 p-6 rounded-lg border border-gray-700">
            <div className="grid grid-cols-7 gap-2">
                {days.map((day) => (
                    <div
                        key={day.dateString}
                        className={`relative h-20 rounded-md p-2 flex flex-col justify-between group transition-colors cursor-pointer ${getOpacityClass(day.total)}`}
                    >
                        <span className="font-semibold">{day.dayNumber}</span>

                        {day.total > 0 && (
                            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-gray-600 text-white text-xs rounded p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10 whitespace-nowrap shadow-lg">
                                {formatCOP(day.total)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}