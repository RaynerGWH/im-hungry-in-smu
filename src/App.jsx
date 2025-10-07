import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Loader } from 'lucide-react';

const SMUStoreTracker = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const storeList = [
    'Koufu SMU',
    'King Kong Curry SMU',
    'Supergreen SMU',
    'Subway SMU',
    '1983 A Taste of Nanyang SMU',
    'Flourish Coffee SMU'
  ];

  const fetchStoreData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stores: storeList })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch store data');
      }

      const data = await response.json();
      setStores(data.stores);
    } catch (err) {
      console.error('Error fetching stores:', err);
      setError('Failed to load store information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, []);

  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
            SMU Store Status
          </h1>
          <p className="text-gray-600 text-lg">
            Real-time updates • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <button
            onClick={fetchStoreData}
            disabled={loading}
            className="mt-4 px-6 py-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            🔄 Refresh Status
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-blue-600" size={48} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-100"
              >
                {/* Store Name */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">{store.name}</h3>
                  {store.isOpen !== null && (
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                      store.isOpen 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {store.isOpen ? (
                        <>
                          <CheckCircle size={16} />
                          Open
                        </>
                      ) : (
                        <>
                          <XCircle size={16} />
                          Closed
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Rating */}
                {store.rating && (
                  <div className="flex items-center gap-1 mb-3">
                    <span className="text-yellow-500">⭐</span>
                    <span className="font-semibold text-gray-700">{store.rating}</span>
                  </div>
                )}

                {/* Today's Hours */}
                {store.hours.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <Clock size={16} />
                      <span className="text-sm font-medium">Today's Hours</span>
                    </div>
                    <p className="text-sm text-gray-700 ml-6">
                      {store.hours.find(h => h.includes(getCurrentDay()))?.split(': ')[1] || 'Hours not available'}
                    </p>
                  </div>
                )}

                {/* Full Hours */}
                {store.hours.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                      View all hours
                    </summary>
                    <div className="mt-3 space-y-1 text-gray-600 ml-2">
                      {store.hours.map((hour, i) => (
                        <div key={i} className={hour.includes(getCurrentDay()) ? 'font-semibold text-gray-800' : ''}>
                          {hour}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Error State */}
                {store.error && (
                  <p className="text-sm text-gray-500 italic">
                    Store info unavailable
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>Data from Google Places • Updates in real-time</p>
        </div>
      </div>
    </div>
  );
};

export default SMUStoreTracker;