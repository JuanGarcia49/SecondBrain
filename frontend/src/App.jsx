import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import CalendarHeatmap from "./assets/CalendarHeatmap";


function App() {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPeriod, setSelectedPeriod] = useState('All');
  const [payPeriods, setPayPeriods] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'transaction_date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [heatmapRefreshKey, setHeatmapRefreshKey] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editFormData, setEditFormData] = useState({ vendor: '', amount: '', category: '', raw_sms: '' });
  const [isHeatmapOpen, setIsHeatmapOpen] = useState(false);
  const [isSpendingSummaryOpen, setIsSpendingSummaryOpen] = useState(false);

  const getPayday = (year, month) => {
    let date = new Date(year, month, 25);
    let day = date.getDay();

    const holidayMondays = []; // No a single Monday 25th holiday in 2026
    const holidayFridays = ['2026-12-25']; // Only Friday 25th holiday of the year
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-25`;

    if (day === 6) {
      date.setDate(24); // Saturday -> Friday
    } else if (day === 0) {
      date.setDate(23); // Sunday -> Friday
    } else if (day === 1 && holidayMondays.includes(dateStr)) {
      date.setDate(22); // Holiday Monday -> Friday
    } else if (day === 5 && holidayFridays.includes(dateStr)) {
      date.setDate(24); // Holiday Friday -> Thursday
    }
    return date;
  };

  const generatePeriods = () => {
    const periods = [];
    const now = new Date();
    let currentYear = now.getFullYear();
    let currentMonth = now.getMonth();

    const currentPayday = getPayday(currentYear, currentMonth);

    if (now >= currentPayday) {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }

    for (let i = 0; i < 6; i++) {
      let startYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      let startMonth = currentMonth === 0 ? 11 : currentMonth - 1;

      let startDate = getPayday(startYear, startMonth);
      let endDate = getPayday(currentYear, currentMonth);

      periods.push({
        id: `${startYear}-${startMonth}`,
        label: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
        start: startDate,
        end: endDate
      });

      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
    }
    return periods;
  };

  useEffect(() => {
    const periods = generatePeriods();
    setPayPeriods(periods);
    setSelectedPeriod(periods[0].id);

    axios.get('http://192.168.0.55:8000/transactions')
      .then(response => {
        setTransactions(response.data.transactions);
        console.log("First transaction data:", response.data.transactions[0]);
      })
      .catch(err => {
        setError(err.message);
      });
  }, []);

  const formatAmount = (value) => {
    const numStr = Number(value).toString();
    if (numStr.length > 6) {
      const millions = numStr.slice(0, -6);
      const thousands = numStr.slice(-6).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `${millions}´${thousands}`;
    }
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // 1. Filter the transactions array based on BOTH dropdowns
  const filteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.transaction_date);
    const categoryMatch = selectedCategory === 'All' || tx.category === selectedCategory;

    let periodMatch = true;
    if (selectedPeriod !== 'All') {
      const period = payPeriods.find(p => p.id === selectedPeriod);
      if (period) {
        periodMatch = txDate >= period.start && txDate < period.end;
      }
    }
    return categoryMatch && periodMatch;
  });
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    // Convert amounts to numbers for proper numeric sorting
    const valA = sortConfig.key === 'amount' ? Number(a[sortConfig.key]) : a[sortConfig.key];
    const valB = sortConfig.key === 'amount' ? Number(b[sortConfig.key]) : b[sortConfig.key];

    if (valA < valB) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (valA > valB) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }

    return 0;
  });
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = sortedTransactions.slice(indexOfFirstItem, indexOfLastItem);

  // 2. Calculate the summary data directly from the filtered transactions
  const dynamicSummary = filteredTransactions.reduce((acc, tx) => {
    const existing = acc.find(item => item.category === tx.category);
    if (existing) {
      existing.total_amount += Number(tx.amount);
    } else {
      acc.push({ category: tx.category, total_amount: Number(tx.amount) });
    }
    return acc;
  }, []);

  // CODE to calculate percentages:
  const totalSpending = dynamicSummary.reduce((sum, item) => sum + item.total_amount, 0);

  const summaryWithPercentages = dynamicSummary.map(item => ({
    ...item,
    percentage: totalSpending > 0 ? Number(((item.total_amount / totalSpending) * 100).toFixed(1)) : 0
  }));

  // Extract unique categories for the dropdown menu
  const uniqueCategories = [...new Set(transactions.map(tx => tx.category))];

  const categoryColors = {
    food: "bg-orange-900/30 text-orange-400 border-orange-800/50",
    transport: "bg-blue-900/30 text-blue-400 border-blue-800/50",
    utilities: "bg-yellow-900/30 text-yellow-400 border-yellow-800/50",
    entertainment: "bg-purple-900/30 text-purple-400 border-purple-800/50",
    health: "bg-red-900/30 text-red-400 border-red-800/50",
    shopping: "bg-pink-900/30 text-pink-400 border-pink-800/50",
    "bank commitments": "bg-slate-900/30 text-slate-400 border-slate-800/50",
    other: "bg-neutral-900/30 text-neutral-400 border-neutral-800/50"
  };

  const activePeriod = payPeriods.find(p => p.id === selectedPeriod);
  const activePeriodStart = activePeriod ? activePeriod.start.toISOString().split('T')[0] : null;
  const activePeriodEnd = activePeriod ? activePeriod.end.toISOString().split('T')[0] : null;

  const handleSave = (id) => {
    axios.put(`http://192.168.0.55:8000/transactions/${id}`, editFormData)
      .then(() => {
        setTransactions(prevTransactions =>
          prevTransactions.map(tx =>
            tx.id === id ? { ...tx, ...editFormData } : tx
          )
        );
        setEditingIndex(null);
      })
      .catch(err => {
        setError("Failed to update transaction: " + err.message);
      });
  };

  return (
    <div className={`min-h-screen bg-neutral-900 text-neutral-100 p-6 grid ${isSidebarOpen ? 'grid-cols-[250px_1fr]' : 'grid-cols-1'} gap-8 transition-all duration-300`}>

      {/* Column 1: Sidebar (Conditionally Rendered) */}
      {isSidebarOpen && (
        <div className="flex flex-col gap-6 bg-neutral-900 border-r border-neutral-800 pr-6 min-h-screen">
          <h1 className="text-2xl font-bold text-emerald-500 tracking-tight">Second Brain</h1>
          {error && <p className="text-red-400 bg-red-900/20 p-3 rounded-md text-sm border border-red-800">Error: {error} ❌</p>}

          <div className="flex flex-col gap-4 mt-4">

            {/* Period Filter */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="periodFilter" className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Pay Period</label>
              <select
                id="periodFilter"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-neutral-100 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none transition-colors"
              >
                <option value="All">All Time</option>
                {payPeriods.map((period) => (
                  <option key={period.id} value={period.id}>{period.label}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="categoryFilter" className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Category: </label>
              <select
                id="categoryFilter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-neutral-100 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none transition-colors"
              >
                <option value="All">All Categories</option>
                {uniqueCategories.map((cat, index) => (
                  <option key={index} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Calendar Heatmap and Spending Summary buttons */}
            <button onClick={() => setIsHeatmapOpen(!isHeatmapOpen)}
              className={`w-full py-2.5 px-4 text-sm font-semibold rounded-lg border transition-colors cursor-pointer ${isHeatmapOpen
                ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700 hover:text-neutral-100'
                }`}>
              Calendar Heatmap
            </button>
            <button onClick={() => setIsSpendingSummaryOpen(!isSpendingSummaryOpen)}
              className={`w-full py-2.5 px-4 text-sm font-semibold rounded-lg border transition-colors cursor-pointer ${isSpendingSummaryOpen
                ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700 hover:text-neutral-100'
                }`}>
              Spending Summary
            </button>

          </div>
        </div>
      )}

      {/* Column 2: Main Content (1fr) */}
      <div className="flex flex-col gap-8">

        {/* Header Bar with Hamburger Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            {/* Hamburger SVG Icon */}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Show title in main area only if sidebar is hidden */}
          {!isSidebarOpen && (
            <h1 className="text-2xl font-bold text-emerald-500 tracking-tight">Second Brain</h1>
          )}
        </div>




        {/* New Calendar Heatmap Section */}
        {isHeatmapOpen && (
          <div className="my-cool-chart-container">
            {selectedPeriod !== 'All' && activePeriodStart && activePeriodEnd && (
              <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-xl font-bold text-neutral-100 tracking-wide">Daily Spending Intensity</h2>
                    <span className="text-sm font-medium text-neutral-400">
                      {selectedPeriod === 'All' ? 'All Time' : activePeriod?.label}
                    </span>
                  </div>
                  <button
                    onClick={() => setHeatmapRefreshKey(prev => prev + 1)}
                    className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded-lg text-neutral-200 transition-colors cursor-pointer text-sm font-medium flex items-center gap-2"
                  >
                    <span>Refresh</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <CalendarHeatmap
                  startDate={activePeriodStart}
                  endDate={activePeriodEnd}
                  refreshKey={heatmapRefreshKey}
                  category={selectedCategory}
                  totalSpending={totalSpending}
                />
              </div>
            )}
          </div>
        )}


        {/* 1. The Main Wrapper */}
        {isSpendingSummaryOpen && (
          <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6">

            {/* 2. The Header (Your snippet goes exactly here) */}
            <div className="flex justify-between items-end mb-6">
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-bold text-neutral-100 tracking-wide">Spending Summary</h2>
                <span className="text-sm font-medium text-neutral-400">
                  {selectedPeriod === 'All' ? 'All Time' : activePeriod?.label}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Total</span>
                <span className="text-xl font-bold text-emerald-400 tracking-tight">${formatAmount(totalSpending)}</span>
              </div>
            </div>

            {/* 3. The Chart Container */}
            <div style={{ width: '100%', height: 400 }}> {/* Increased height from 300 to 400 */}
              <ResponsiveContainer>
                <BarChart
                  data={summaryWithPercentages}
                  margin={{ bottom: 120, top: 20, left: 0, right: 0 }} /* Increased bottom margin */
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                  <XAxis
                    dataKey="category"
                    stroke="#a3a3a3"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    tick={{ dy: 10, dx: -5 }}
                  />
                  <YAxis
                    width={50}
                    tickFormatter={(value) => `${value}%`}
                    stroke="#a3a3a3"
                  />

                  {/* Custom Tooltip to show both values */}
                  <Tooltip
                    cursor={{ fill: '#262626' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#262626] border border-[#404040] p-3 rounded-lg shadow-xl">
                            <p className="text-neutral-200 font-bold uppercase text-xs mb-1">{data.category}</p>
                            <p className="text-emerald-400 font-semibold text-lg">
                              {data.percentage}%
                            </p>
                            <p className="text-neutral-400 text-sm">
                              ${formatAmount(data.total_amount)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="percentage" fill="#10b981" radius={[4, 4, 0, 0]} barSize={80} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}


        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-neutral-100 mb-4 tracking-wide">Transactions</h2>

          {/* Card Layout Replacing Table */}
          <div className="flex flex-col gap-3.5 max-w-3xl mx-auto w-full">
            {currentTransactions.map((tx, index) => (
              <div
                key={index}
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                className="flex flex-col p-6 border-2 border-neutral-700 bg-neutral-800 rounded-2xl cursor-pointer hover:border-emerald-500 transition-colors"
              >
                {/* Top Row: Original Card Content */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-xl border uppercase ${categoryColors[tx.category.toLowerCase()] || categoryColors.other}`}>
                      {tx.vendor.charAt(0)}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-neutral-100">{tx.vendor}</span>
                      <span className="text-xs text-neutral-400">
                        {new Date(tx.transaction_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                    <span className="font-bold text-neutral-100 text-lg tracking-tight">
                      ${formatAmount(tx.amount)}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${categoryColors[tx.category.toLowerCase()] || categoryColors.other}`}>
                      {tx.category}
                    </span>
                  </div>
                </div>

                {/* Expanded SMS Data & Edit Form */}
                {expandedIndex === index && (
                  <div
                    className="mt-4 pt-4 border-t border-neutral-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {editingIndex === index ? (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editFormData.vendor}
                            onChange={(e) => setEditFormData({ ...editFormData, vendor: e.target.value })}
                            className="bg-neutral-900 border border-neutral-600 focus:border-emerald-500 rounded-lg p-2.5 text-sm outline-none text-neutral-100"
                            placeholder="Vendor"
                          />
                          <input
                            type="number"
                            value={editFormData.amount}
                            onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                            className="bg-neutral-900 border border-neutral-600 focus:border-emerald-500 rounded-lg p-2.5 text-sm outline-none text-neutral-100"
                            placeholder="Amount"
                          />
                          <select
                            value={editFormData.category}
                            onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                            className="bg-neutral-900 border border-neutral-600 focus:border-emerald-500 rounded-lg p-2.5 text-sm outline-none text-neutral-100 col-span-2"
                          >
                            {uniqueCategories.map((cat, i) => (
                              <option key={i} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <textarea
                            value={editFormData.raw_sms}
                            onChange={(e) => setEditFormData({ ...editFormData, raw_sms: e.target.value })}
                            className="bg-neutral-900 border border-neutral-600 focus:border-emerald-500 rounded-lg p-2.5 text-sm outline-none text-neutral-100 col-span-2 font-mono h-20 resize-none"
                            placeholder="Raw SMS"
                          />
                        </div>
                        <div className="flex justify-end gap-3 mt-2">
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded-lg text-sm transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSave(tx.id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-colors cursor-pointer font-semibold"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm font-mono text-neutral-300 bg-neutral-900 p-3 rounded-lg break-words">
                          {tx.raw_sms ? tx.raw_sms : "No raw SMS data available."}
                        </p>
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              setEditingIndex(index);
                              setEditFormData({
                                vendor: tx.vendor,
                                amount: tx.amount,
                                category: tx.category,
                                raw_sms: tx.raw_sms || ''
                              });
                            }}
                            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded-lg text-sm transition-colors cursor-pointer flex items-center gap-2"
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="mt-6 flex items-center justify-between w-full max-w-3xl mx-auto bg-neutral-800 border-2 border-neutral-700 rounded-xl p-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-neutral-200 bg-neutral-700 rounded-lg hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <span className="text-sm font-medium text-neutral-400">
              Page <span className="text-neutral-100 font-bold">{currentPage}</span> of <span className="text-neutral-100 font-bold">{totalPages}</span>
            </span>

            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentTransactions.length < itemsPerPage}
              className="px-4 py-2 text-sm font-medium text-neutral-200 bg-neutral-700 rounded-lg hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

    </div >
  );
}

export default App;