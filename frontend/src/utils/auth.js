// auth.js
// Set VITE_API_URL at build time (Render reads it from the service's env vars).
// Falls back to the local backend so `pnpm dev` needs no configuration.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || 'http://localhost:8000/api';

export const getAuthToken = () => localStorage.getItem('auth_token');
export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => !!getAuthToken();

export const logout = async () => {
  const token = getAuthToken();
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  window.location.href = '/';
};

export const authenticatedRequest = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
    if (response.status === 401) logout();
    return response;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// API FOR EVENTS
export const getEvents = (params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v && v !== 'All')
  ).toString();
  return authenticatedRequest(`/events${query ? `?${query}` : ''}`);
};

export const createEvent = (data) => authenticatedRequest('/events', {
  method: 'POST',
  body: JSON.stringify(data)
});

export const updateEvent = (id, data) => authenticatedRequest(`/events/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data)
});

export const deleteEvent = (id) => authenticatedRequest(`/events/${id}`, {
  method: 'DELETE'
});

export const updateEventStatus = (id, status) => authenticatedRequest(`/events/${id}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ status })
});

export const getEventStatistics = () => authenticatedRequest('/events-statistics');

// API FOR ACCOUNT SETTINGS
export const updateProfile = (data) => authenticatedRequest('/profile', {
  method: 'PUT',
  body: JSON.stringify(data),
});

export const updatePassword = (data) => authenticatedRequest('/profile/password', {
  method: 'PUT',
  body: JSON.stringify(data),
});

/** Keep the cached user in step after a profile change. */
export const setUser = (user) => localStorage.setItem('user', JSON.stringify(user));

// API FOR THE ATTENDANCE KIOSK
// Public on purpose: employees scan the QR code without an account, so these
// must not send a token.
export const kioskGetEmployees = () =>
  fetch(`${API_BASE_URL}/kiosk/employees`, { headers: { Accept: 'application/json' } });

export const kioskTimeIn = (employeeId, photo) =>
  fetch(`${API_BASE_URL}/kiosk/time-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ employee_id: employeeId, photo }),
  });

// API FOR ATTENDANCE ADMIN
export const getAttendances = (params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v && v !== 'All')
  ).toString();
  return authenticatedRequest(`/attendances${query ? `?${query}` : ''}`);
};

export const getPhotoUsage = () => authenticatedRequest('/attendances/photo-usage');

export const purgePhotos = (from, to) => authenticatedRequest('/attendances/photos', {
  method: 'DELETE',
  body: JSON.stringify({ from, to }),
});

// API FOR EMPLOYEES
export const getEmployees = (params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v && v !== 'All')
  ).toString();
  return authenticatedRequest(`/employees${query ? `?${query}` : ''}`);
};

export const createEmployee = (data) => authenticatedRequest('/employees', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const updateEmployee = (id, data) => authenticatedRequest(`/employees/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});

export const deleteEmployee = (id) => authenticatedRequest(`/employees/${id}`, {
  method: 'DELETE',
});

