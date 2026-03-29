# 🔌 Dashboard KFC - Monitor Tiempo Real

**Monitor en tiempo real de consumo eléctrico trifásico + histórico de KFC Nevinnomyssk**

Frontend React + Backend FastAPI + MQTT + PostgreSQL

---

## 🚀 Instalación - Una Línea

> **Sin lío. Un comando. Todo automático.**

### 1️⃣ Clonar
```bash
git clone <tu-repo-url>
cd Dashboard_KFC
```

### 2️⃣ Configuración (SOLO SI ES PRODUCCIÓN)
Si el servidor es diferente, edita:
- `backend/.env` → Cambia `MQTT_BROKER`, `DB_HOST`, credenciales
- `frontend/.env.local` → Cambia `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`

### 3️⃣ Iniciar TODO
```bash
bash start.sh           # En Linux/Ubuntu
cmd /c start.bat        # En Windows
```

**Listo.** Frontend en `http://localhost:3000` | Backend en `http://localhost:8080`

---

## 📊 Mientras Funciona

### Ver Estado
```bash
pm2 status          # ¿Están corriendo?
pm2 logs            # ¿Hay errores?
pm2 restart all     # Reiniciar si falla algo
```

### Detener
```bash
pm2 stop all        # Parar
pm2 delete all      # Quitar de pm2
```

---

## 🔧 Hardware Mínimo

- **CPU**: 1 core (Ubuntu 20.04)
- **RAM**: 512 MB
- **Node.js**: 18+
- **Python**: 3.10+
- **PostgreSQL**: 12+ (remoto OK)

---

## 📝 Configuración (requiere editar dos archivos)

### Backend - `backend/.env`
```env
MQTT_BROKER=85.198.65.213          # Tu broker MQTT
MQTT_PORT=1883
DB_HOST=192.168.1.100              # Tu servidor PostgreSQL
DB_PORT=5432
DB_USER=postgres                   # Tu usuario
DB_PASSWORD=tu_password            # Tu contraseña
DB_SCHEMA=smart_restaurants
DB_TABLE=novonimisk_data
API_PORT=8080
```

### Frontend - `frontend/.env.local`
```env
VITE_API_BASE_URL=http://127.0.0.1:8080
VITE_WS_BASE_URL=ws://127.0.0.1:8080
```

*(Si es producción, reemplaza `127.0.0.1` con tu IP del servidor)*

---

## ✅ Verificar que Funciona

✅ Backend conectado:
```bash
curl http://localhost:8080/api/metrics
```

✅ Frontend carga en:
```
http://localhost:3000
```

✅ Datos en tiempo real:
```bash
pm2 logs
```

---

## 🎯 Atajos - Desarrollo

```bash
# Solo frontend (dev mode)
cd frontend && npm run dev

# Solo backend (dev mode)
cd backend && source venv/bin/activate && python -m uvicorn main:app --reload

# Ver estado de pm2
pm2 status
pm2 logs
pm2 restart all
```

---

## 🆘 Problemas

| Error | Solución |
|-------|----------|
| "MQTT not connected" | Edita `backend/.env` → verifica `MQTT_BROKER` IP |
| "Database not connected" | Edita `backend/.env` → verifica `DB_HOST`, usuario, contraseña |
| Frontend no carga | Edita `frontend/.env.local` → verifica URLs |
| Puerto en uso | Cambia `API_PORT` en `backend/.env` o `ecosystem.config.js` |

---

## 🔌 Stack

- **Frontend**: React 18 + Vite  
- **Backend**: FastAPI + Uvicorn  
- **Realtime**: MQTT + WebSocket  
- **Database**: PostgreSQL (remoto)  
- **Deploy**: pm2 + Ubuntu 20.04
