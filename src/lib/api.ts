const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
    console.warn('VITE_API_URL is not defined in environment variables');
}

export async function apiFetch(endpoint: string, options: RequestInit & { params?: Record<string, any> } = {}) {
    const token = localStorage.getItem('token');

    let url = `${API_URL}${endpoint}`;
    if (options.params) {
        const searchParams = new URLSearchParams();
        Object.entries(options.params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        });
        const queryString = searchParams.toString();
        if (queryString) {
            url += (url.includes('?') ? '&' : '?') + queryString;
        }
    }

    const headers = {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...((options.headers as any) || {}),
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
        throw new Error('Unauthorized');
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Terjadi kesalahan pada server');
    }

    return data;
}

export const api = {
    get: (endpoint: string, options: RequestInit & { params?: Record<string, any> } = {}) => apiFetch(endpoint, { method: 'GET', ...options }),
    post: (endpoint: string, body: any, options: RequestInit & { params?: Record<string, any> } = {}) => {
        const isFormData = body instanceof FormData;
        const headers = { ...((options.headers as any) || {}) };
        if (isFormData) {
            delete headers['Content-Type'];
        } else if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        return apiFetch(endpoint, {
            method: 'POST',
            body: isFormData ? body : JSON.stringify(body),
            ...options,
            headers
        });
    },
    put: (endpoint: string, body: any, options: RequestInit & { params?: Record<string, any> } = {}) => {
        const isFormData = body instanceof FormData;
        const headers = { ...((options.headers as any) || {}) };
        if (isFormData) {
            delete headers['Content-Type'];
        } else if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        return apiFetch(endpoint, {
            method: 'PUT',
            body: isFormData ? body : JSON.stringify(body),
            ...options,
            headers
        });
    },
    delete: (endpoint: string, options: RequestInit & { params?: Record<string, any> } = {}) => apiFetch(endpoint, { method: 'DELETE', ...options }),
};

export default api;
