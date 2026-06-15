import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('http://192.168.0.55:8000/transactions')
      .then(response => {
        setTransactions(response.data.transactions);
      })
      .catch(err => {
        setError(err.message);
      });

    axios.get('http://192.168.0.55:8000/summary/categories')
      .then(response => {
        setSummary(response.data.summary);
      })
      .catch(err => {
        setError(err.message);
      });
  }, []);

  return (
    <div>
      <h1>Second Brain</h1>
      {error && <p>Error: {error} ❌</p>}

      <h2>Spending Summary 📊</h2>
      <ul>
        {summary.map((item, index) => (
          <li key={index}>
            {item.category}: ${item.total_amount}
          </li>
        ))}
      </ul>

      <h2>Transactions 📝</h2>
      <table border="1">
        <thead>
          <tr>
            <th>Date</th>
            <th>Vendor</th>
            <th>Category</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, index) => (
            <tr key={index}>
              <td>{new Date(tx.transaction_date).toLocaleString()}</td>
              <td>{tx.vendor}</td>
              <td>{tx.category}</td>
              <td>{tx.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;