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
        {selectedPeriod !== 'All' && activePeriodStart && activePeriodEnd && (
          <CalendarHeatmap startDate={activePeriodStart} endDate={activePeriodEnd} />
        )}

        {/* Chart moved here to the main wide column */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-neutral-100 mb-6 tracking-wide">Spending Summary</h2>

          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={dynamicSummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                <XAxis dataKey="category" stroke="#a3a3a3" />
                <YAxis width={110} tickFormatter={(value) => "$" + formatAmount(value)} stroke="#a3a3a3" />
                <Tooltip
                  formatter={(value) => `$${formatAmount(value)}`}
                  contentStyle={{ backgroundColor: '#262626', borderColor: '#404040', color: '#f5f5f5' }}
                />
                <Bar dataKey="total_amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-neutral-100 mb-4 tracking-wide">Transactions</h2>

          {/* Card Layout Replacing Table */}
          <div className="flex flex-col gap-3.5 max-w-3xl mx-auto w-full">
            {currentTransactions.map((tx, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-6 border-2 border-neutral-700 bg-neutral-800 rounded-2xl"
              >
                {/* Left Side: Icon & Vendor */}
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

                {/* Right Side: Amount & Category (min-w fixes the overlap) */}
                <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                  <span className="font-bold text-neutral-100 text-lg tracking-tight">
                    ${formatAmount(tx.amount)}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${categoryColors[tx.category.toLowerCase()] || categoryColors.other}`}>
                    {tx.category}
                  </span>
                </div>
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

    </div>
  );
}

export default App;