import React, { useState, useMemo, useEffect } from 'react';
import { PlusCircle, Trash2, TrendingUp, Calendar, Download, Upload, RefreshCw } from 'lucide-react';

// ===================================
// CONFIGURATION - ADD YOUR CREDENTIALS HERE
// ===================================
const GOOGLE_CLIENT_ID = '162858599919-triccem1av2uo2j49f7litv2e6snjlbl.apps.googleusercontent.com';
const SPREADSHEET_ID = '1-ElTxM6mAojRK-rP_v1YqNtjX_r0C3rMXD7tx6_uOHs';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

const CSMForecastPlanner = () => {
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    csmName: '',
    currentARR: '',
    renewalDate: '',
    bestCase: { renewalPercent: '', upsell: '' },
    mostLikely: { renewalPercent: '', upsell: '' },
    worstCase: { renewalPercent: '', upsell: '' }
  });
  const [selectedCSM, setSelectedCSM] = useState('all');
  
  // Google Sheets integration state
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [googleError, setGoogleError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Load Google API
  useEffect(() => {
    const loadGoogleAPI = () => {
      // Check if gapi is already loaded
      if (window.gapi) {
        window.gapi.load('client:auth2', initializeGoogleAPI);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        if (window.gapi) {
          window.gapi.load('client:auth2', initializeGoogleAPI);
        } else {
          setGoogleError('Google API failed to load. This may be a browser restriction.');
          setIsGoogleReady(false);
        }
      };
      
      script.onerror = () => {
        setGoogleError('Failed to load Google API script. Check your internet connection or browser settings.');
        setIsGoogleReady(false);
      };
      
      document.body.appendChild(script);
    };

    // Add a timeout to catch loading issues
    const timeout = setTimeout(() => {
      if (!isGoogleReady && !googleError) {
        setGoogleError('Google API loading timeout. This feature may not work in this environment. You can still add customers manually.');
        setIsGoogleReady(false);
      }
    }, 10000); // 10 second timeout

    loadGoogleAPI();
    
    return () => clearTimeout(timeout);
  }, []);

  const initializeGoogleAPI = async () => {
    try {
      await window.gapi.client.init({
        clientId: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
      });

      const authInstance = window.gapi.auth2.getAuthInstance();
      setIsSignedIn(authInstance.isSignedIn.get());
      
      authInstance.isSignedIn.listen(setIsSignedIn);
      setIsGoogleReady(true);
      setGoogleError(null);
    } catch (error) {
      console.error('Error initializing Google API:', error);
      setGoogleError('Failed to initialize Google API. Check your Client ID.');
    }
  };

  const handleSignIn = async () => {
    try {
      await window.gapi.auth2.getAuthInstance().signIn();
    } catch (error) {
      console.error('Error signing in:', error);
      setGoogleError('Sign in failed. Please try again.');
    }
  };

  const handleSignOut = () => {
    window.gapi.auth2.getAuthInstance().signOut();
    setAutoSync(false);
  };

  // Import data from Google Sheets
  const importFromSheets = async () => {
    if (!isSignedIn) {
      setGoogleError('Please sign in to Google first.');
      return;
    }

    setIsLoading(true);
    setGoogleError(null);

    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A2:J', // Assuming headers in row 1, data starts row 2
      });

      const rows = response.result.values;
      
      if (!rows || rows.length === 0) {
        setGoogleError('No data found in the sheet.');
        setIsLoading(false);
        return;
      }

      const importedCustomers = rows
        .filter(row => row[0] && row[2]) // Must have name and ARR
        .map((row, index) => ({
          id: Date.now() + index,
          name: row[0] || '',
          csmName: row[1] || 'Unassigned',
          currentARR: parseFloat(row[2]) || 0,
          renewalDate: row[3] || '',
          bestCase: {
            renewalPercent: parseFloat(row[4]) || 100,
            upsell: parseFloat(row[5]) || 0,
          },
          mostLikely: {
            renewalPercent: parseFloat(row[6]) || 100,
            upsell: parseFloat(row[7]) || 0,
          },
          worstCase: {
            renewalPercent: parseFloat(row[8]) || 100,
            upsell: parseFloat(row[9]) || 0,
          },
        }));

      setCustomers(importedCustomers);
      setLastSyncTime(new Date());
      setGoogleError(null);
    } catch (error) {
      console.error('Error importing from sheets:', error);
      setGoogleError(`Import failed: ${error.result?.error?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Export data to Google Sheets
  const exportToSheets = async () => {
    if (!isSignedIn) {
      setGoogleError('Please sign in to Google first.');
      return;
    }

    setIsLoading(true);
    setGoogleError(null);

    try {
      const values = [
        [
          'Customer Name',
          'CSM Name',
          'Current ARR',
          'Renewal Date',
          'Best Case Renewal %',
          'Best Case Upsell',
          'Most Likely Renewal %',
          'Most Likely Upsell',
          'Worst Case Renewal %',
          'Worst Case Upsell',
        ],
        ...customers.map(c => [
          c.name,
          c.csmName,
          c.currentARR,
          c.renewalDate,
          c.bestCase.renewalPercent,
          c.bestCase.upsell,
          c.mostLikely.renewalPercent,
          c.mostLikely.upsell,
          c.worstCase.renewalPercent,
          c.worstCase.upsell,
        ]),
      ];

      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A1:J',
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      setLastSyncTime(new Date());
      setGoogleError(null);
    } catch (error) {
      console.error('Error exporting to sheets:', error);
      setGoogleError(`Export failed: ${error.result?.error?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-sync effect
  useEffect(() => {
    if (autoSync && isSignedIn) {
      const interval = setInterval(() => {
        importFromSheets();
      }, 60000); // Sync every 60 seconds

      return () => clearInterval(interval);
    }
  }, [autoSync, isSignedIn]);

  const addCustomer = () => {
    if (newCustomer.name && newCustomer.currentARR && newCustomer.renewalDate) {
      const customer = {
        id: Date.now(),
        ...newCustomer,
        currentARR: parseFloat(newCustomer.currentARR),
        renewalDate: newCustomer.renewalDate,
        csmName: newCustomer.csmName || 'Unassigned',
        bestCase: {
          renewalPercent: parseFloat(newCustomer.bestCase.renewalPercent) || 100,
          upsell: parseFloat(newCustomer.bestCase.upsell) || 0
        },
        mostLikely: {
          renewalPercent: parseFloat(newCustomer.mostLikely.renewalPercent) || 100,
          upsell: parseFloat(newCustomer.mostLikely.upsell) || 0
        },
        worstCase: {
          renewalPercent: parseFloat(newCustomer.worstCase.renewalPercent) || 100,
          upsell: parseFloat(newCustomer.worstCase.upsell) || 0
        }
      };
      
      setCustomers([...customers, customer]);
      setNewCustomer({
        name: '',
        csmName: '',
        currentARR: '',
        renewalDate: '',
        bestCase: { renewalPercent: '', upsell: '' },
        mostLikely: { renewalPercent: '', upsell: '' },
        worstCase: { renewalPercent: '', upsell: '' }
      });

      // Auto-export if enabled
      if (autoSync && isSignedIn) {
        setTimeout(() => exportToSheets(), 1000);
      }
    }
  };

  const removeCustomer = (id) => {
    setCustomers(customers.filter(c => c.id !== id));
    
    // Auto-export if enabled
    if (autoSync && isSignedIn) {
      setTimeout(() => exportToSheets(), 1000);
    }
  };

  const calculateMetrics = useMemo(() => {
    if (customers.length === 0) return null;

    const filteredCustomers = selectedCSM === 'all' 
      ? customers 
      : customers.filter(c => c.csmName === selectedCSM);

    if (filteredCustomers.length === 0) return null;

    const scenarios = ['bestCase', 'mostLikely', 'worstCase'];
    const results = {};

    scenarios.forEach(scenario => {
      const monthlyData = {};
      const quarterlyData = {};
      
      let totalStartingARR = 0;
      
      filteredCustomers.forEach(customer => {
        totalStartingARR += customer.currentARR;
        
        const renewalDate = new Date(customer.renewalDate);
        const monthKey = `${renewalDate.getFullYear()}-${String(renewalDate.getMonth() + 1).padStart(2, '0')}`;
        const quarter = Math.floor(renewalDate.getMonth() / 3) + 1;
        const quarterKey = `${renewalDate.getFullYear()}-Q${quarter}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { startingARR: 0, renewedARR: 0, upsell: 0 };
        }
        if (!quarterlyData[quarterKey]) {
          quarterlyData[quarterKey] = { startingARR: 0, renewedARR: 0, upsell: 0 };
        }

        const renewalPercent = customer[scenario].renewalPercent / 100;
        const upsell = customer[scenario].upsell;
        const renewedAmount = customer.currentARR * renewalPercent;

        monthlyData[monthKey].startingARR += customer.currentARR;
        monthlyData[monthKey].renewedARR += renewedAmount;
        monthlyData[monthKey].upsell += upsell;

        quarterlyData[quarterKey].startingARR += customer.currentARR;
        quarterlyData[quarterKey].renewedARR += renewedAmount;
        quarterlyData[quarterKey].upsell += upsell;
      });

      Object.keys(monthlyData).forEach(key => {
        const data = monthlyData[key];
        data.grr = (data.renewedARR / data.startingARR) * 100;
        data.nrr = ((data.renewedARR + data.upsell) / data.startingARR) * 100;
      });

      Object.keys(quarterlyData).forEach(key => {
        const data = quarterlyData[key];
        data.grr = (data.renewedARR / data.startingARR) * 100;
        data.nrr = ((data.renewedARR + data.upsell) / data.startingARR) * 100;
      });

      const totalRenewed = filteredCustomers.reduce((sum, c) => {
        const renewalPercent = c[scenario].renewalPercent / 100;
        return sum + (c.currentARR * renewalPercent);
      }, 0);
      
      const totalUpsell = filteredCustomers.reduce((sum, c) => sum + c[scenario].upsell, 0);
      
      results[scenario] = {
        monthly: Object.keys(monthlyData).sort().map(key => ({
          period: key,
          ...monthlyData[key]
        })),
        quarterly: Object.keys(quarterlyData).sort().map(key => ({
          period: key,
          ...quarterlyData[key]
        })),
        overall: {
          startingARR: totalStartingARR,
          renewedARR: totalRenewed,
          upsell: totalUpsell,
          grr: (totalRenewed / totalStartingARR) * 100,
          nrr: ((totalRenewed + totalUpsell) / totalStartingARR) * 100
        }
      };
    });

    return results;
  }, [customers, selectedCSM]);

  const uniqueCSMs = useMemo(() => {
    const csms = [...new Set(customers.map(c => c.csmName))];
    return csms.sort();
  }, [customers]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const scenarioColors = {
    bestCase: 'bg-green-50 border-green-200',
    mostLikely: 'bg-blue-50 border-blue-200',
    worstCase: 'bg-orange-50 border-orange-200'
  };

  const scenarioLabels = {
    bestCase: 'Best Case',
    mostLikely: 'Most Likely',
    worstCase: 'Worst Case'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">CSM Forecast Scenario Planner</h1>
            <p className="text-slate-600">Model your renewals and upsells across multiple scenarios</p>
          </div>

          {/* Google Sheets Integration Panel */}
          <div className="bg-white rounded-lg shadow-lg p-4 min-w-[300px]">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Google Sheets Sync
            </h3>
            
            {!isGoogleReady && !googleError && (
              <div className="text-sm text-slate-600 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading Google API...
              </div>
            )}

            {googleError && (
              <div className="text-sm text-slate-600 mb-3">
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 mb-2">
                  {googleError}
                </div>
                <p className="text-xs text-slate-500">
                  You can still use the app manually by adding customers with the form below.
                </p>
              </div>
            )}

            {isGoogleReady && !isSignedIn && (
              <button
                onClick={handleSignIn}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Connect to Google Sheets
              </button>
            )}

            {isSignedIn && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={importFromSheets}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Import
                  </button>
                  <button
                    onClick={exportToSheets}
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Export
                  </button>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-slate-700">Auto-sync (every 60s)</span>
                </label>

                {lastSyncTime && (
                  <div className="text-xs text-slate-500">
                    Last synced: {lastSyncTime.toLocaleTimeString()}
                  </div>
                )}

                <button
                  onClick={handleSignOut}
                  className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  Disconnect
                </button>
              </div>
            )}

            {googleError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {googleError}
              </div>
            )}

            {isLoading && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Syncing...
              </div>
            )}
          </div>
        </div>

        {/* Configuration Warning */}
        {GOOGLE_CLIENT_ID.includes('YOUR_CLIENT_ID') && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-8">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Configuration Required</h3>
            <p className="text-sm text-yellow-700 mb-2">
              To use Google Sheets integration, you need to add your credentials to the code:
            </p>
            <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
              <li>Follow the setup guide to get your Google Client ID</li>
              <li>Get your Google Sheet ID from the spreadsheet URL</li>
              <li>Update the configuration at the top of the code</li>
            </ol>
          </div>
        )}

        {/* Add Customer Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <PlusCircle className="w-6 h-6" />
            Add Customer
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder="Customer Name"
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
            />
            <input
              type="text"
              placeholder="CSM Name"
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={newCustomer.csmName}
              onChange={(e) => setNewCustomer({...newCustomer, csmName: e.target.value})}
            />
            <input
              type="number"
              placeholder="Current ARR"
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={newCustomer.currentARR}
              onChange={(e) => setNewCustomer({...newCustomer, currentARR: e.target.value})}
            />
            <input
              type="date"
              placeholder="Renewal Date"
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={newCustomer.renewalDate}
              onChange={(e) => setNewCustomer({...newCustomer, renewalDate: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Best Case */}
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <h3 className="font-semibold text-green-800 mb-3">Best Case</h3>
              <input
                type="number"
                placeholder="Renewal % (e.g., 100)"
                className="w-full px-3 py-2 border border-green-300 rounded mb-2 focus:ring-2 focus:ring-green-500"
                value={newCustomer.bestCase.renewalPercent}
                onChange={(e) => setNewCustomer({
                  ...newCustomer,
                  bestCase: {...newCustomer.bestCase, renewalPercent: e.target.value}
                })}
              />
              <input
                type="number"
                placeholder="Upsell Amount"
                className="w-full px-3 py-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500"
                value={newCustomer.bestCase.upsell}
                onChange={(e) => setNewCustomer({
                  ...newCustomer,
                  bestCase: {...newCustomer.bestCase, upsell: e.target.value}
                })}
              />
            </div>

            {/* Most Likely */}
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3">Most Likely</h3>
              <input
                type="number"
                placeholder="Renewal % (e.g., 95)"
                className="w-full px-3 py-2 border border-blue-300 rounded mb-2 focus:ring-2 focus:ring-blue-500"
                value={newCustomer.mostLikely.renewalPercent}
                onChange={(e) => setNewCustomer({
                  ...newCustomer,
                  mostLikely: {...newCustomer.mostLikely, renewalPercent: e.target.value}
                })}
              />
              <input
                type="number"
                placeholder="Upsell Amount"
                className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                value={newCustomer.mostLikely.upsell}
                onChange={(e) => setNewCustomer({
                  ...newCustomer,
                  mostLikely: {...newCustomer.mostLikely, upsell: e.target.value}
                })}
              />
            </div>

            {/* Worst Case */}
            <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
              <h3 className="font-semibold text-orange-800 mb-3">Worst Case</h3>
              <input
                type="number"
                placeholder="Renewal % (e.g., 80)"
                className="w-full px-3 py-2 border border-orange-300 rounded mb-2 focus:ring-2 focus:ring-orange-500"
                value={newCustomer.worstCase.renewalPercent}
                onChange={(e) => setNewCustomer({
                  ...newCustomer,
                  worstCase: {...newCustomer.worstCase, renewalPercent: e.target.value}
                })}
              />
              <input
                type="number"
                placeholder="Upsell Amount"
                className="w-full px-3 py-2 border border-orange-300 rounded focus:ring-2 focus:ring-orange-500"
                value={newCustomer.worstCase.upsell}
                onChange={(e) => setNewCustomer({
                  ...newCustomer,
                  worstCase: {...newCustomer.worstCase, upsell: e.target.value}
                })}
              />
            </div>
          </div>

          <button
            onClick={addCustomer}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            Add Customer to Forecast
          </button>
        </div>

        {/* Customer List */}
        {customers.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-slate-800">Customer Portfolio</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Filter by CSM:</label>
                <select
                  value={selectedCSM}
                  onChange={(e) => setSelectedCSM(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">All CSMs</option>
                  {uniqueCSMs.map(csm => (
                    <option key={csm} value={csm}>{csm}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">CSM</th>
                    <th className="px-4 py-3 text-right">Current ARR</th>
                    <th className="px-4 py-3 text-center">Renewal Date</th>
                    <th className="px-4 py-3 text-center">Best Case</th>
                    <th className="px-4 py-3 text-center">Most Likely</th>
                    <th className="px-4 py-3 text-center">Worst Case</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(customer => (
                    <tr key={customer.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{customer.name}</td>
                      <td className="px-4 py-3 text-slate-600">{customer.csmName}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(customer.currentARR)}</td>
                      <td className="px-4 py-3 text-center">{customer.renewalDate}</td>
                      <td className="px-4 py-3 text-center text-xs">
                        {customer.bestCase.renewalPercent}% + {formatCurrency(customer.bestCase.upsell)}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {customer.mostLikely.renewalPercent}% + {formatCurrency(customer.mostLikely.upsell)}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {customer.worstCase.renewalPercent}% + {formatCurrency(customer.worstCase.upsell)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => removeCustomer(customer.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results */}
        {calculateMetrics && (
          <>
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-slate-800">
                {selectedCSM === 'all' ? 'Overall Forecast' : `Forecast for ${selectedCSM}`}
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {Object.keys(scenarioLabels).map(scenario => (
                <div key={scenario} className={`rounded-lg shadow-lg p-6 border-2 ${scenarioColors[scenario]}`}>
                  <h3 className="text-xl font-bold mb-4">{scenarioLabels[scenario]}</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-slate-600">Starting ARR</div>
                      <div className="text-2xl font-bold">{formatCurrency(calculateMetrics[scenario].overall.startingARR)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">Renewed ARR</div>
                      <div className="text-2xl font-bold">{formatCurrency(calculateMetrics[scenario].overall.renewedARR)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">Total Upsell</div>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(calculateMetrics[scenario].overall.upsell)}</div>
                    </div>
                    <div className="pt-3 border-t-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">GRR</span>
                        <span className="text-2xl font-bold">{formatPercent(calculateMetrics[scenario].overall.grr)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">NRR</span>
                        <span className="text-2xl font-bold">{formatPercent(calculateMetrics[scenario].overall.nrr)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quarterly Breakdown */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Quarterly Breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left">Quarter</th>
                      <th className="px-4 py-3 text-center">Scenario</th>
                      <th className="px-4 py-3 text-right">Starting ARR</th>
                      <th className="px-4 py-3 text-right">Renewed ARR</th>
                      <th className="px-4 py-3 text-right">Upsell</th>
                      <th className="px-4 py-3 text-center">GRR</th>
                      <th className="px-4 py-3 text-center">NRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculateMetrics.bestCase.quarterly.map((quarter, idx) => (
                      <React.Fragment key={quarter.period}>
                        <tr className="border-b bg-green-50">
                          {idx === 0 || calculateMetrics.bestCase.quarterly[idx-1].period !== quarter.period ? (
                            <td className="px-4 py-3 font-semibold" rowSpan="3">{quarter.period}</td>
                          ) : null}
                          <td className="px-4 py-3 text-center font-medium text-green-700">Best Case</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(quarter.startingARR)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(quarter.renewedARR)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(quarter.upsell)}</td>
                          <td className="px-4 py-3 text-center font-bold">{formatPercent(quarter.grr)}</td>
                          <td className="px-4 py-3 text-center font-bold">{formatPercent(quarter.nrr)}</td>
                        </tr>
                        <tr className="border-b bg-blue-50">
                          <td className="px-4 py-3 text-center font-medium text-blue-700">Most Likely</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(calculateMetrics.mostLikely.quarterly[idx].startingARR)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(calculateMetrics.mostLikely.quarterly[idx].renewedARR)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(calculateMetrics.mostLikely.quarterly[idx].upsell)}</td>
                          <td className="px-4 py-3 text-center font-bold">{formatPercent(calculateMetrics.mostLikely.quarterly[idx].grr)}</td>
                          <td className="px-4 py-3 text-center font-bold">{formatPercent(calculateMetrics.mostLikely.quarterly[idx].nrr)}</td>
                        </tr>
                        <tr className="border-b bg-orange-50">
                          <td className="px-4 py-3 text-center font-medium text-orange-700">Worst Case</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(calculateMetrics.worstCase.quarterly[idx].startingARR)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(calculateMetrics.worstCase.quarterly[idx].renewedARR)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(calculateMetrics.worstCase.quarterly[idx].upsell)}</td>
                          <td className="px-4 py-3 text-center font-bold">{formatPercent(calculateMetrics.worstCase.quarterly[idx].grr)}</td>
                          <td className="px-4 py-3 text-center font-bold">{formatPercent(calculateMetrics.worstCase.quarterly[idx].nrr)}</td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monthly Breakdown */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Monthly Breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left">Month</th>
                      <th className="px-4 py-3 text-center">Scenario</th>
                      <th className="px-4 py-3 text-right">Starting ARR</th>
                      <th className="px-4 py-3 text-right">Renewed ARR</th>
                      <th className="px-4 py-3 text-right">Upsell</th>
                      <th className="px-4 py-3 text-center">GRR</th>
                      <th className="px-4 py-3 text-center">NRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculateMetrics.bestCase.monthly.map((month, idx) => (
                      <React.Fragment key={month.period}>
                        <tr className="border-b bg-green-50">
                          {idx === 0 || calculateMetrics.bestCase.monthly[idx-1].period !== month.period ? (
                            <td className="px-4 py-3 font-semibold" rowSpan="3">{month.period}</td>
                          ) : null}
                          <td className="px-4 py-3 text-center font-medium text-green-700">Best Case</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(month.startingARR)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(month.renewedARR)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(month.upsell)}</td>
                          <td className="px-4 py-3 text-center font-bold">{formatPercent(month.grr)}</td>
                          <td className="px-4 py-3 text-center font-bold">{formatPercent(month.nrr)}</td>
                        </tr>
                        <tr className="border-b bg-blue-50">
                          <td className="px-4 py-3 text-center font-medium text-blue-700">Most Likely</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(calculateMetrics.mostLikely.monthly[idx].startingARR)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(calculateMetrics.mostLikely.monthly[idx].renewedARR)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(calculateMetrics.mostLikely.monthly[idx].upsell)}</td>
                          <td className="px-4 py-3 text-center font-bold">{formatPercent(calculateMetrics.mostLikely.monthly[idx].grr)}</td>
                          <td className="px-4 py-3 text-center font-bold">{formatPercent(calculateMetrics.mostLikely.monthly[idx].nrr)}</td>
                        </tr>
                        <tr className="border-b bg-orange-50">
                          <td className="px-4 py-3 text-center font-medium text-orange-700">Worst Case</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(calculateMetrics.worstCase.monthly[idx].startingARR)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(calculateMetrics.worstCase.monthly[idx].renewedARR)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(calculateMetrics.worstCase.monthly[idx].upsell)}</td>
                          <td className="px-4 py-3 text-center font-bold">{formatPercent(calculateMetrics.worstCase.monthly[idx].grr)}</td>
                          <td className="px-4 py-3 text-center font-bold">{formatPercent(calculateMetrics.worstCase.monthly[idx].nrr)}</td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {customers.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">No customers added yet</h3>
            <p className="text-slate-500">Add your first customer above or import from Google Sheets</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CSMForecastPlanner;