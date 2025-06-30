import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Navbar,
  NavbarBrand,
  NavbarCollapse,
  NavbarLink,
  Badge,
  Spinner,
  Alert
} from "flowbite-react";

const Icon = ({ type, size = 16, className = "", style = {} }) => {
  const iconStyles = {
    Shield: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' /%3E%3C/svg%3E")`,
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center'
    },
    AlertTriangle: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z' /%3E%3C/svg%3E")`,
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center'
    }
  };

  return (
    <div
      className={`inline-block ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        ...iconStyles[type],
        ...style,
      }}
    />
  );
};

const API_CONFIG = {
  baseURL: 'https://u5td03afol.execute-api.us-east-1.amazonaws.com/api/v1',
  apiKey: '0da73dc4278bcfbd1a1f889b646eee07'
};

// CORS Error Handler
const handleCORSError = (error) => {
  if (error.message.includes('CORS') || error.message.includes('fetch')) {
    console.error('CORS Error detected. You may need to:');
    console.error('1. Enable CORS on your API server');
    console.error('2. Add appropriate CORS headers');
    console.error('3. Use a proxy server for development');
  }
  return error;
};

const apiService = {
async fetchIncidents() {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/incidents?user=62c95060-e9fc-482b-bcdb-4b3b5f8debf9`, {
      headers: {
        'X-API-Key': API_CONFIG.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const normalizeIncident = (item) => ({
      incident_id: item.incident_id,
      location: item.incident_location,    
      type: item.incident_type,                      
      priority: item.priority?.toLowerCase(),         
      timestamp: item.timestamp,
      status: item.status?.toLowerCase(),             
      description: item.original_message,             
      reporter_contact: item.source,                  
    });


    let raw = [];

    if (Array.isArray(data)) {
      raw = data;
    } else if (data.incidents && Array.isArray(data.incidents)) {
      raw = data.incidents;
    } else if (data.data && Array.isArray(data.data)) {
      raw = data.data;
    } else {
      console.warn('Unexpected API response format:', data);
      return [];
    }


    return raw.map(normalizeIncident);
    
  } catch (error) {
    console.error('Error fetching incidents:', error);
    throw error;
  }
},


  async updateIncidentStatus(incidentId, status) {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/incidents/${incidentId}/status`, {
        method: 'PUT',
        headers: {
          'X-API-Key': API_CONFIG.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: status
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating incident status:', error);
      throw error;
    }
  },

  async deleteIncident(incidentId) {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/incidents/${incidentId}`, {
        method: 'DELETE',
        headers: {
          'X-API-Key': API_CONFIG.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting incident:', error);
      throw error;
    }
  }
};

const priorityConfig = {
  high: { color: '#ef4444', label: 'High' },
  medium: { color: '#eab308', label: 'Medium' },
  low: { color: '#22c55e', label: 'Low' }
};

const determinePriority = (incident) => {
  if (incident.priority) {
    const p = incident.priority.toLowerCase();
    if (['high', 'medium', 'low'].includes(p)) return p;
  }

  
  const type = incident.type?.toLowerCase() || '';
  const severity = incident.severity?.toLowerCase() || '';

  const highPriorityTypes = ['fire', 'explosion', 'flood', 'earthquake'];
  const mediumPriorityTypes = ['accident', 'medical', 'theft'];

  if (highPriorityTypes.some(t => type.includes(t)) || severity === 'critical') {
    return 'high';
  } else if (mediumPriorityTypes.some(t => type.includes(t)) || severity === 'moderate') {
    return 'medium';
  }

  return 'low';
};


const parseCoordinates = (incident) => {
  if (incident.coordinates && Array.isArray(incident.coordinates)) {
    return incident.coordinates;
  }
  
  if (incident.latitude && incident.longitude) {
    return [parseFloat(incident.latitude), parseFloat(incident.longitude)];
  }
  
  // Default coordinates for major Indian cities based on location
  const cityCoordinates = {
    'bangalore': [12.9716, 77.5946],
    'delhi': [28.6139, 77.2090],
    'mumbai': [19.0760, 72.8777],
    'chennai': [13.0827, 80.2707],
    'kolkata': [22.5726, 88.3639],
    'hyderabad': [17.3850, 78.4867],
    'pune': [18.5204, 73.8567],
    'ahmedabad': [23.0225, 72.5714]
  };
  
  const location = incident.incident_location?.toLowerCase() || '';
  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (location.includes(city)) {
      return coords;
    }
  }
  
  // Default to center of India if no coordinates found
  return [20.5937, 78.9629];
};

const IncidentCard = ({ incident, onStatusUpdate, onDelete }) => {
  const priority = determinePriority(incident);
  const config = priorityConfig[priority] || priorityConfig['low'];

  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleStatusUpdate = async (newStatus) => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(incident.incident_id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
      return date.toLocaleDateString();
    } catch {
      return timestamp;
    }
  };
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-lg border border-gray-200">
      {/* Top row with priority badges */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
            CRITICAL
          </span>
          <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
            {incident.status?.toUpperCase() || 'ACTIVE'}
          </span>
        </div>
      </div>
      
      {/* Main message */}
      <div className="mb-4">
        <p className="text-lg font-medium text-gray-900">
          {incident.type || 'No message available'}
        </p>
      </div>
      
      {/* Location */}
      <div className="flex items-center gap-2 mb-2 text-gray-600">
        <span className="text-sm">📍</span>
        <span className="text-sm">{incident.location}</span>
      </div>
      
      {/* Time with accuracy */}
      <div className="flex items-center justify-between mb-4 text-gray-600">
        <div className="flex items-center gap-2">
          <span className="text-sm">🕐</span>
          <span className="text-sm">{formatTimestamp(incident.timestamp)}</span>
        </div>
      </div>
      
      {/* Contact info */}
      <div className="flex items-center justify-between text-gray-600">
        <div className="flex items-center gap-2">
          <span className="text-sm">👤</span>
          <span className="text-sm">Reporter</span> {/* You might want to extract this from another field if available */}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">📞</span>
          <span className="text-sm">{incident.reporter_contact}</span>
        </div>
      </div>
    </div>
  );
};

const InteractiveIndiaMap = ({ incidents, onIncidentClick }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    const loadLeaflet = async () => {
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
        document.head.appendChild(link);
      }

      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
        
        return new Promise((resolve) => {
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }
    };

    const initializeMap = async () => {
      await loadLeaflet();
      
      if (mapRef.current && window.L && !mapInstanceRef.current) {
        mapInstanceRef.current = window.L.map(mapRef.current, {
          center: [20.5937, 78.9629],
          zoom: 5,
          zoomControl: true,
          scrollWheelZoom: true
        });

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        }).addTo(mapInstanceRef.current);
      }
    };

    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && window.L) {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        mapInstanceRef.current.removeLayer(marker);
      });
      markersRef.current = [];

      // Add new markers
      incidents.forEach(incident => {
        const priority = determinePriority(incident);
        const config = priorityConfig[priority] || priorityConfig['low'];
        const coordinates = parseCoordinates(incident);
        
        const customIcon = window.L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background-color: ${config.color};
              border: 3px solid white;
              box-shadow: 0 0 10px rgba(0,0,0,0.3), 0 0 20px ${config.color}50;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              color: white;
              font-weight: bold;
              animation: pulse 2s infinite;
            ">
              ${(incident.type || incident.incident_type || 'U').charAt(0).toUpperCase()}
            </div>
            <style>
              @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
              }
            </style>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const marker = window.L.marker(coordinates, { icon: customIcon })
          .addTo(mapInstanceRef.current);

        const formatTimestamp = (timestamp) => {
          if (!timestamp) return 'Unknown time';
          try {
            return new Date(timestamp).toLocaleString();
          } catch {
            return timestamp;
          }
        };

        marker.bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 10px 0; color: ${config.color}; font-weight: bold;">
              ${incident.type || incident.incident_type || 'Unknown'} - ${config.label} Priority
            </h3>
            <p style="margin: 5px 0;"><strong>Location:</strong> ${incident.incident_location || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${formatTimestamp(incident.timestamp)}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${incident.status}</p>
            <p style="margin: 5px 0;">${incident.description || 'No description available'}</p>
            ${incident.severity ? `<p style="margin: 5px 0;"><strong>Severity:</strong> ${incident.severity}</p>` : ''}
          </div>
        `);

        marker.on('click', () => {
          onIncidentClick(incident);
        });

        markersRef.current.push(marker);
      });
    }
  }, [incidents, onIncidentClick]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full" />
      
      <div className="absolute top-4 left-4 z-[1001]">
        <div className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 p-4 rounded-lg shadow-lg">
          <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400">India Emergency Zone</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">Real-time Incident Tracking</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-700 dark:text-gray-300">Live Updates</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState(['all']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch incidents from API with enhanced error handling
  const fetchIncidents = async () => {
    try {
      setError(null);
      const data = await apiService.fetchIncidents();
      
      // Add data validation
      if (!Array.isArray(data)) {
        console.warn('API returned non-array data:', data);
        setIncidents([]);
      } else {
        setIncidents(data);
      }
    } catch (err) {
      // Enhanced error handling
      const corsError = handleCORSError(err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Network error: Unable to connect to API. Check your internet connection or API server status.');
      } else if (err.message.includes('404')) {
        setError('API endpoint not found. Please verify the API URL.');
      } else if (err.message.includes('401') || err.message.includes('403')) {
        setError('Authentication failed. Please check your API key.');
      } else {
        setError(`Failed to fetch incidents: ${err.message}`);
      }
      console.error('Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

const handleStatusUpdate = async (incidentId, newStatus) => {
  try {
    await apiService.updateIncidentStatus(incidentId, newStatus);
    
    // Update local state immediately for better UX
    setIncidents(prevIncidents => 
      prevIncidents.map(incident => 
        incident.incident_id === incidentId 
          ? { ...incident, status: newStatus.toLowerCase() }
          : incident
      )
    );
    
    // Refresh incidents from API to ensure consistency
    await fetchIncidents();
  } catch (err) {
    setError('Failed to update incident status.');
    console.error('Error:', err);
  }
};

  // Handle incident deletion
  const handleDeleteIncident = async (incidentId) => {
    if (!window.confirm('Are you sure you want to delete this incident?')) {
      return;
    }

    try {
      await apiService.deleteIncident(incidentId);
      // Refresh incidents after deletion
      await fetchIncidents();
    } catch (err) {
      setError('Failed to delete incident.');
      console.error('Error:', err);
    }
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchIncidents();
  };

  // Initial load
  useEffect(() => {
    fetchIncidents();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchIncidents();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleIncidentClick = (incident) => {
    setSelectedIncident(incident);
    setShowModal(true);
  };

  const filteredIncidents = incidents.filter(incident => {
    if (activeFilters.includes('all')) return true;
    return activeFilters.includes(incident.status);
  });

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  

  return (
    <div>
      <Navbar fluid rounded>
        <NavbarBrand>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded-lg">
              <Icon type="Shield" size={24} style={{ filter: "invert(1)" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                ResQ.AI
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Emergency Response Dashboard
              </p>
            </div>
          </div>
        </NavbarBrand>        
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {refreshing && <Spinner size="sm" />}
            Refresh
          </button>
          <div className="flex items-center gap-2 bg-green-100 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-green-800">
              {error ? 'System Offline' : 'System Online'}
            </span>
          </div>
        </div>
      </Navbar>

      {error && (
        <Alert color="failure" className="m-4">
          <span className="font-medium">Error:</span> {error}
        </Alert>
      )}

      <div className="flex h-[calc(100vh-80px)]">
        <div className="flex-[3] relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Spinner size="xl" />
                <p className="mt-4 text-gray-600">Loading incidents...</p>
              </div>
            </div>
          ) : (
            <InteractiveIndiaMap 
              incidents={filteredIncidents} 
              onIncidentClick={handleIncidentClick}
            />
          )}

          <div className="absolute bottom-4 left-4 z-[1001]">
            <div className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 p-4 rounded-lg shadow-lg">
              <h4 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Priority Levels</h4>
              <div className="space-y-2">
                {Object.entries(priorityConfig).map(([priority, config]) => (
                  <div key={priority} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ 
                        backgroundColor: config.color,
                        boxShadow: `0 0 6px ${config.color}`
                      }}
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{config.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute top-4 right-4 z-[1001]">
            <div className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 p-4 rounded-lg shadow-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{incidents.length}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Incidents</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-[2] flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Live Incidents</h2>
            <div className="flex gap-2 flex-wrap">
              {['all', 'active', 'dispatched', 'resolved'].map(filter => (
                <button
                  key={filter}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    activeFilters.includes(filter)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setActiveFilters([filter])}
                >
                  {filter.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Spinner size="lg" />
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p>No incidents found</p>
                {activeFilters[0] !== 'all' && (
                  <p className="text-sm mt-2">Try changing the filter or check your API connection</p>
                )}
              </div>
            ) : (
              filteredIncidents.map(incident => (
                <div 
                  key={incident.incident_id} 
                  onClick={() => handleIncidentClick(incident)}
                  className="cursor-pointer"
                >
                  <IncidentCard 
                    incident={incident} 
                    onStatusUpdate={handleStatusUpdate}
                    onDelete={handleDeleteIncident}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

{showModal && selectedIncident && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {selectedIncident.type || selectedIncident.incident_type || 'Unknown'} Incident
        </h3>
        <button 
          onClick={() => setShowModal(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <strong>ID:</strong> {selectedIncident.incident_id}
        </div>
        <div>
          <strong>Location:</strong> {selectedIncident.location || 'Unknown'}
        </div>
        <div>
          <strong>Priority:</strong> 
          <span className={`ml-2 px-2 py-1 rounded text-sm ${
            determinePriority(selectedIncident) === 'high' ? 'bg-red-100 text-red-800' :
            determinePriority(selectedIncident) === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {priorityConfig[determinePriority(selectedIncident)].label}
          </span>
        </div>
        <div>
          <strong>Status:</strong> {selectedIncident.status}
        </div>
        <div>
          <strong>Time:</strong> {formatTimestamp(selectedIncident.timestamp)}
        </div>
        {selectedIncident.severity && (
          <div>
            <strong>Severity:</strong> {selectedIncident.severity}
          </div>
        )}
        <div>
          <strong>Description:</strong> {selectedIncident.description || 'No description available'}
        </div>
        {selectedIncident.reporter_name && (
          <div>
            <strong>Reporter:</strong> {selectedIncident.reporter_name}
          </div>
        )}
        {selectedIncident.reporter_contact && (
          <div>
            <strong>Contact:</strong> {selectedIncident.reporter_contact}
          </div>
        )}
      </div>
      
      <div className="mt-6 flex gap-2">
        <Button color="blue" onClick={() => setShowModal(false)}>
          Close
        </Button>
        <Button 
          color="red"
          onClick={async () => {
            await handleStatusUpdate(selectedIncident.incident_id, 'dispatched');
            setShowModal(false);
          }}
        >
          Dispatch Team
        </Button>
        <Button 
          color="green"
          onClick={async () => {
            await handleStatusUpdate(selectedIncident.incident_id, 'resolved');
            setShowModal(false);
          }}
        >
          Mark as Resolved
        </Button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}