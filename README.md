# Dashboard KFC - Deploy Limpio (Ubuntu 20.04)

Guia final basada en errores reales vistos en produccion.

Stack:
- Frontend: React + Vite (requiere Node 22)
- Backend: FastAPI + Uvicorn (Python 3.9+)
- Runtime: PM2
- Datos: MQTT + PostgreSQL (DB en red privada via VPN)

## 1) Versiones exactas recomendadas

- Ubuntu: 20.04
- Node.js: 22.22.0
- npm: 10.x (la que instala Node 22)
- PM2: 6.0.14
- Python: 3.9.5
- pip: ultima disponible en el venv

## 2) Limpiar TODO (frontend/backend/procesos)

Ejecuta en el servidor:

```bash
pm2 delete all || true
pm2 kill || true

rm -rf /root/KFC_DashBoard

rm -rf /root/.pm2/logs/* || true

apt remove -y nodejs || true
apt autoremove -y
apt clean
```

## 3) Instalar dependencias base

```bash
apt update
apt upgrade -y
apt install -y git curl build-essential ca-certificates software-properties-common netcat-openbsd
```

## 4) Instalar Node.js 22 + PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

node -v
npm -v

npm install -g pm2@6
pm2 -v
```

## 5) Instalar Python 3.9 y crear backend venv

```bash
apt install -y python3.9 python3.9-venv python3-pip
python3.9 --version
```

## 6) Clonar proyecto limpio

```bash
cd /root
git clone https://github.com/RudySolerMedina/KFC_DashBoard.git
cd /root/KFC_DashBoard
```

## 7) Configurar backend/.env

```bash
cat > /root/KFC_DashBoard/backend/.env << 'EOF'
MQTT_BROKER=85.198.65.213
MQTT_PORT=1883
MQTT_CLIENT_ID=kfc_dashboard_backend
API_HOST=0.0.0.0
API_PORT=8080
DB_HOST=10.250.250.43
DB_PORT=5432
DB_DATABASE=dbo
DB_USER=soler
DB_PASSWORD=NzoKFXd1--sShVbc
DB_SCHEMA=smart_restaurants
DB_TABLE=novonimisk_data
FLUSH_INTERVAL_SECONDS=60
DB_RECONNECT_INTERVAL_SECONDS=10
CORS_ORIGINS=http://155.212.221.139:3000,http://localhost:3000
EOF
```

## 8) Instalar frontend y build

```bash
cd /root/KFC_DashBoard/frontend
npm install
npm run build
```

## 9) Instalar backend (venv Python 3.9)

```bash
cd /root/KFC_DashBoard/backend
python3.9 -m venv venv
source venv/bin/activate
pip install --upgrade pip

# Version que funciono en Ubuntu 20.04 con Python 3.9
pip install fastapi==0.115.12 "uvicorn[standard]==0.33.0" paho-mqtt==2.1.0 psycopg2-binary==2.9.10 python-dotenv==1.0.1
```

## 10) Levantar servicios con PM2 (forma estable)

### Frontend

```bash
pm2 start "npm run preview -- --host 0.0.0.0 --port 3000" --name kfc-frontend --cwd /root/KFC_DashBoard/frontend
```

### Backend

No usar `pm2 start .../uvicorn` directo porque PM2 puede interpretarlo como JS.

```bash
cat > /root/KFC_DashBoard/start_backend.sh << 'EOF'
#!/bin/bash
cd /root/KFC_DashBoard/backend
source venv/bin/activate
exec python main.py
EOF

chmod +x /root/KFC_DashBoard/start_backend.sh
pm2 start /root/KFC_DashBoard/start_backend.sh --name kfc-backend
```

## 11) Verificaciones

```bash
pm2 status
ss -ltnp | grep 3000 || true
ss -ltnp | grep 8080 || true
curl http://127.0.0.1:8080/api/metrics
```

URLs:
- Frontend: http://SERVER_IP:3000
- Backend: http://SERVER_IP:8080/api/metrics

## 12) Auto inicio al reiniciar servidor

```bash
pm2 save
pm2 startup
```

Ejecuta el comando que te muestre `pm2 startup` (normalmente incluye `sudo env PATH=... pm2 startup ...`).

## 13) VPN y DB privada (10.250.250.43)

Si el backend arranca pero no conecta DB:

```bash
ip addr show tun0
ip -4 route
ping -I tun0 -c 3 10.8.0.1
ping -I tun0 -c 3 10.250.250.43
nc -zvw3 10.250.250.43 5432
```

Interpretacion:
- `ping 10.8.0.1` OK y `ping 10.250.250.43` FAIL: problema de ruteo/ACL en VPN remota
- `ping` OK pero `5432 timeout`: firewall/pg_hba/listen_addresses del servidor PostgreSQL

## 14) Comandos de soporte

```bash
pm2 logs kfc-backend --lines 120
pm2 logs kfc-frontend --lines 120
pm2 restart kfc-backend
pm2 restart kfc-frontend
pm2 delete kfc-backend
pm2 delete kfc-frontend
```

---

## 🚀 Después de Iniciar

### Ver estado
```bash
pm2 status
```

### Reiniciar 
```bash
pm2 restart all
```

### Ver logs
```bash
pm2 logs
```

### Detener
```bash
pm2 stop all
```

---

## 🆘 Si algo falla

**Backend no conecta a MQTT:**
```bash
pm2 logs kfc-backend
```
→ Verifica `MQTT_BROKER` en `backend/.env`

**Backend no conecta a PostgreSQL:**
```bash
pm2 logs kfc-backend
```
→ Verifica `DB_HOST`, `DB_USER`, `DB_PASSWORD` en `backend/.env`

**Frontend no carga:**
```bash
pm2 logs kfc-frontend
```
→ Verifica que backend esté corriendo: `pm2 status`

---

## 📧 Soporte

Si los logs muestran errores, comparte la salida de:
```bash
pm2 logs kfc-backend
pm2 logs kfc-frontend
```

---

**Versión**: 1.0.0  
**Última actualización**: 2026-03-29
