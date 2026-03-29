# Dashboard KFC - Electropowder Real-time Monitor

Dashboard en tiempo real y análisis histórico de consumo eléctrico trifásico de KFC Nevinnomyssk. Frontend React + Backend FastAPI + MQTT + PostgreSQL.

---

## Requisitos del Sistema

- **Node.js**: 18+ (para frontend)
- **Python**: 3.10+ (para backend)
- **PostgreSQL**: 12+ (servidor remoto o local)
- **MQTT Broker**: accesible desde red
- **Sistema**: Ubuntu 20.04 LTS (recommended para producción)

---

## 1. Clonar el Proyecto

```bash
git clone <tu-repo-url>
cd Dashboard_KFC
```

---

## 2. Instalar Requisitos - Frontend

### 2.1 Instalar Node.js y npm (si no lo tienes)

```bash
# Para Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar
node --version  # v18.x.x
npm --version   # 9.x.x+
```

### 2.2 Instalar dependencias del frontend

```bash
cd frontend
npm install
```

---

## 3. Instalar Requisitos - Backend

### 3.1 Crear entorno virtual Python

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### 3.2 Instalar dependencias del backend

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 4. Configurar Variables de Entorno

### 4.1 Backend - Crear archivo `.env` en carpeta `backend/`

```bash
cd backend
touch .env
```

**EDITA ESTE ARCHIVO** con tus valores:

```ini
# MQTT Configuration
MQTT_BROKER=85.198.65.213
MQTT_PORT=1883
MQTT_CLIENT_ID=kfc_dashboard_backend

# Backend API
API_HOST=127.0.0.1
API_PORT=8080

# PostgreSQL Configuration (servidor remoto)
DB_HOST=192.168.1.100
DB_PORT=5432
DB_DATABASE=dbo
DB_USER=postgres
DB_PASSWORD=tu_password_aqui
DB_SCHEMA=smart_restaurants
DB_TABLE=novonimisk_data

# Flush & Reconnect
FLUSH_INTERVAL_SECONDS=60
DB_RECONNECT_INTERVAL_SECONDS=10

# CORS
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

**🔴 IMPORTANTE - Cambia estos valores:**
- **`MQTT_BROKER`**: IP del broker MQTT
- **`MQTT_PORT`**: Puerto del broker MQTT (default 1883)
- **`DB_HOST`**: IP del servidor PostgreSQL remoto
- **`DB_USER`**: Usuario de PostgreSQL
- **`DB_PASSWORD`**: Contraseña de PostgreSQL
- **`DB_DATABASE`**: Nombre de la base de datos

### 4.2 Frontend - Crear archivo `.env.local` en carpeta `frontend/`

```bash
cd ../frontend
touch .env.local
```

**EDITA ESTE ARCHIVO**:

```ini
VITE_API_BASE_URL=http://127.0.0.1:8080
VITE_WS_BASE_URL=ws://127.0.0.1:8080
```

**Para producción** (replace con IP/dominio real):

```ini
VITE_API_BASE_URL=http://192.168.1.200:8080
VITE_WS_BASE_URL=ws://192.168.1.200:8080
```

---

## 5. Levantar el Backend

### 5.1 En Desarrollo (con reload automático)

```bash
cd backend
source venv/bin/activate
python -m uvicorn main:app --host 127.0.0.1 --port 8080 --reload
```

Expected output:
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8080 (Press CTRL+C to quit)
```

### 5.2 En Producción (sin reload)

```bash
cd backend
source venv/bin/activate
gunicorn -w 1 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8080
```

---

## 6. Levantar el Frontend

### 6.1 En Desarrollo (Vite dev server)

```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v8.0.3  building client environment...
  ➜  Local:   http://localhost:5173/
```

Accede a `http://localhost:5173/`

### 6.2 En Producción (build estático)

```bash
cd frontend
npm run build
# Crea carpeta dist/ con archivos estáticos

# Luego servir con Nginx (ver sección 7)
```

---

## 7. Servir Frontend en Producción con Nginx

### 7.1 Instalar Nginx

```bash
sudo apt-get install nginx
```

### 7.2 Configurar Nginx

Crea `/etc/nginx/sites-available/kfc-dashboard`:

```nginx
server {
    listen 80;
    server_name tu_dominio_o_ip;

    # Frontend estático
    location / {
        root /ruta/a/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy al backend
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 7.3 Habilitar sitio

```bash
sudo ln -s /etc/nginx/sites-available/kfc-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable nginx
```

---

## 8. Ver Estado de Backend y Frontend

### 8.1 ¿Backend escuchando en puerto 8080?

```bash
netstat -tuln | grep 8080
# o
ss -tuln | grep 8080
```

### 8.2 ¿Backend responde a solicitudes?

```bash
curl http://127.0.0.1:8080/api/metrics
```

Si ves JSON con `"metrics"` y `"values"`, ✅ funciona.

### 8.3 ¿Conectividad MQTT y DB?

Verifica la respuesta anterior debe incluir:
```json
{
  "database_connected": true,  // Indica si DB está conectada
  "metrics": [...],             // 23 métricas
  "values": {...}               // Valores en tiempo real
}
```

### 8.4 Logs en tiempo real

```bash
# Backend (si corre directo)
# Ve la salida en la terminal

# Backend (si corre con systemd)
sudo journalctl -u kfc-backend -f

# Nginx
sudo tail -f /var/log/nginx/error.log
```

---

## 9. Reiniciar Backend o Frontend

### 9.1 Reiniciar Backend (Desarrollo)

En la terminal donde corre el backend:
```bash
# Presiona CTRL+C
# Luego vuelve a ejecutar:
python -m uvicorn main:app --host 127.0.0.1 --port 8080 --reload
```

### 9.2 Reiniciar Backend (Producción - systemd)

Primero, crea servicio `/etc/systemd/system/kfc-backend.service`:

```ini
[Unit]
Description=KFC Dashboard Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/ruta/a/backend
Environment="PATH=/ruta/a/backend/venv/bin"
ExecStart=/ruta/a/backend/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8080
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Luego:

```bash
sudo systemctl daemon-reload
sudo systemctl enable kfc-backend
sudo systemctl start kfc-backend
sudo systemctl restart kfc-backend    # <- Reiniciar
sudo systemctl stop kfc-backend
```

### 9.3 Reiniciar Frontend (Producción)

```bash
cd frontend
npm run build
sudo systemctl reload nginx
```

### 9.4 Reiniciar Nginx

```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

---

## 10. Troubleshooting

| Problema | Causa | Solución |
|---|---|---|
| Backend "MQTT connection failed" | MQTT broker inaccesible | Verifica `MQTT_BROKER` en `.env`. Prueba: `telnet 85.198.65.213 1883` |
| Backend "PostgreSQL unavailable" | DB remota no conecta | Verifica `DB_HOST`, `DB_USER`, `DB_PASSWORD` en `.env`. Realtime sigue funcionando (sin historia). |
| Frontend no carga | API URL incorrecta | Verifica `VITE_API_BASE_URL` en `.env.local` |
| WebSocket desconecta | Firewall bloqueando WS | Abre puerto, verifica MQTT primero |
| Port 8080 en uso | Otro proceso ocupa el puerto | `sudo lsof -i :8080` para ver qué lo usa |

---

## 11. Despliegue Rápido (Checklist)

- [ ] Clona repo: `git clone ...`
- [ ] Frontend: `cd frontend && npm install`
- [ ] Backend: `cd ../backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
- [ ] Backend `.env`: Configura IP MQTT, IP DB, usuario, contraseña
- [ ] Frontend `.env.local`: Configura API_BASE_URL y WS_BASE_URL
- [ ] Backend dev: `python -m uvicorn main:app --host 127.0.0.1 --port 8080 --reload`
- [ ] Frontend dev: `npm run dev` (otra terminal)
- [ ] Abre `http://localhost:5173`
- [ ] Verifica logs: busca "MQTT connected", "Loaded X latest values"

---

## 12. Cambios de Configuración - Referencia Rápida

| Elementos a cambiar | Archivo | Ejemplo |
|---|---|---|
| **IP MQTT** | `backend/.env` | `MQTT_BROKER=192.168.1.50` |
| **Puerto MQTT** | `backend/.env` | `MQTT_PORT=1883` |
| **IP PostgreSQL** | `backend/.env` | `DB_HOST=192.168.1.100` |
| **Usuario DB** | `backend/.env` | `DB_USER=postgres` |
| **Contraseña DB** | `backend/.env` | `DB_PASSWORD=mipass123` |
| **Nombre DB** | `backend/.env` | `DB_DATABASE=dbo` |
| **IP Backend (frontend)** | `frontend/.env.local` | `VITE_API_BASE_URL=http://192.168.1.200:8080` |
| **IP WebSocket (frontend)** | `frontend/.env.local` | `VITE_WS_BASE_URL=ws://192.168.1.200:8080` |

---

## 13. Stack Tecnológico

- **Frontend**: React 18 + Vite 8 + CSS3
- **Backend**: FastAPI + Uvicorn
- **Realtime**: MQTT (Paho) + WebSocket
- **Database**: PostgreSQL (remoto)
- **Servidor**: Nginx + Ubuntu 20.04 LTS
- **API**: REST + WebSocket

---

## 14. Estructura del Proyecto

```
Dashboard_KFC/
├── backend/
│   ├── main.py              # Backend FastAPI
│   ├── .env                 # Variables (NO SUBAS A GIT)
│   ├── requirements.txt      # Dependencias Python
│   └── venv/                # Virtual environment
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Componente principal
│   │   ├── components/      # Historia, Realtime, Analytics
│   │   └── styles/          # CSS
│   ├── dist/                # Build producción
│   ├── .env.local           # Variables Vite (NO SUBAS)
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

---

**Versión**: 1.0.0  
**Última actualización**: 2026-03-29
