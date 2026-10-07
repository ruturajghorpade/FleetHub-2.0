import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// In-flight GET requests map for concurrent deduplication
const inFlightGetRequests = new Map();

// Helper to generate a unique key for deduplication
const getDedupeKey = (url, config = {}) => {
  const paramsKey = config.params ? JSON.stringify(config.params) : '';
  return `get:${url}:${paramsKey}`;
};

// Request interceptor: attach token and prevent caching
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fleethub_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Strictly disable caching on all API calls via standard HTTP headers
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: catch 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or unauthorized
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        localStorage.removeItem('fleethub_token');
        localStorage.removeItem('fleethub_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Wrap api.get for in-flight concurrent request deduplication with AbortController awareness
const originalGet = api.get.bind(api);
api.get = function (url, config = {}) {
  // If request explicitly opts out of deduplication, bypass
  if (config.skipDedupe) {
    return originalGet(url, config);
  }

  const key = getDedupeKey(url, config);

  // If already in flight
  if (inFlightGetRequests.has(key)) {
    const entry = inFlightGetRequests.get(key);
    entry.subscriberCount++;

    if (config.signal) {
      if (config.signal.aborted) {
        entry.subscriberCount--;
        return Promise.reject(new axios.CanceledError('canceled'));
      }

      return new Promise((resolve, reject) => {
        const onAbort = () => {
          config.signal.removeEventListener('abort', onAbort);
          entry.subscriberCount--;
          if (entry.subscriberCount <= 0) {
            entry.masterController.abort();
            inFlightGetRequests.delete(key);
          }
          reject(new axios.CanceledError('canceled'));
        };

        config.signal.addEventListener('abort', onAbort);

        entry.promise.then(
          (res) => {
            config.signal.removeEventListener('abort', onAbort);
            resolve(res);
          },
          (err) => {
            config.signal.removeEventListener('abort', onAbort);
            reject(err);
          }
        );
      });
    }

    return entry.promise;
  }

  // Create new in-flight entry
  const masterController = new AbortController();
  const entry = {
    subscriberCount: 1,
    masterController,
    promise: null,
  };

  const underlyingConfig = {
    ...config,
    signal: masterController.signal,
  };

  const underlyingPromise = originalGet(url, underlyingConfig).finally(() => {
    inFlightGetRequests.delete(key);
  });

  entry.promise = underlyingPromise;
  inFlightGetRequests.set(key, entry);

  if (config.signal) {
    if (config.signal.aborted) {
      entry.subscriberCount--;
      masterController.abort();
      inFlightGetRequests.delete(key);
      return Promise.reject(new axios.CanceledError('canceled'));
    }

    return new Promise((resolve, reject) => {
      const onAbort = () => {
        config.signal.removeEventListener('abort', onAbort);
        entry.subscriberCount--;
        if (entry.subscriberCount <= 0) {
          masterController.abort();
          inFlightGetRequests.delete(key);
        }
        reject(new axios.CanceledError('canceled'));
      };

      config.signal.addEventListener('abort', onAbort);

      underlyingPromise.then(
        (res) => {
          config.signal.removeEventListener('abort', onAbort);
          resolve(res);
        },
        (err) => {
          config.signal.removeEventListener('abort', onAbort);
          reject(err);
        }
      );
    });
  }

  return underlyingPromise;
};

export default api;
