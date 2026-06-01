import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
});

// Attach token automatically
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const clientesApi = {
  buscar: (tel)         => API.get(`/api/clientes/${tel}`),
  crear:  (data)        => API.post('/api/clientes', data),
};

export const productosApi = {
  listar: (cat)         => API.get('/api/productos', { params: { categoria: cat } }),
};

export const recomendacionesApi = {
  obtener: (tel)        => API.get(`/api/recomendaciones/${tel}`),
};

export const pedidosApi = {
  crear:          (data)        => API.post('/api/pedidos', data),
  pendientes:     (sede_id)     => API.get('/api/pedidos/pendientes', { params: { sede_id } }),
  cambiarEstado:  (id, estado)  => API.patch(`/api/pedidos/${id}/estado`, { estado }),
  obtener:        (id)          => API.get(`/api/pedidos/${id}`),
};

export const ventasApi = {
  resumen: (sede, fecha) => API.get('/api/ventas', { params: { sede, fecha } }),
};

export const inventarioApi = {
  listar:  (sede_id) => API.get('/api/inventario', { params: { sede_id } }),
  guardar: (data)    => API.post('/api/inventario', data),
};

export const authApi = {
  login: (email, password) => API.post('/api/auth/login', { email, password }),
};

export default API;