# 🔌 Dashboard KFC - Guía Completa Paso a Paso

**Monitor en tiempo real de consumo eléctrico trifásico + histórico de KFC Nevinnomyssk**

Frontend React + Backend FastAPI + MQTT + PostgreSQL

---

## 📋 PASO 1 - Verificar que estés en el directorio correcto

```bash
pwd
# Debería mostrar: /root/KFC_DashBoard
```

---

## 📋 PASO 2 - Actualizar el sistema

```bash
sudo apt update
sudo apt upgrade -y
```

---

## 📋 PASO 3 - Instalar Node.js (para frontend)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

---

## 📋 PASO 4 - Instalar Python y venv (para backend)

```bash
sudo apt install -y python3 python3-venv python3-pip
python3 --version
```

---

## 📋 PASO 5 - Instalar pm2 (gestor de procesos)

```bash
sudo npm install -g pm2
pm2 --version
```

---

## 📋 PASO 6 - Configurar Backend (.env)

Abre el archivo de configuración:

```bash
nano /root/KFC_DashBoard/backend/.env
```

**Cambia SOLO estas 4 líneas con tus valores:**

```ini
MQTT_BROKER=85.198.65.213
MQTT_PORT=1883
DB_HOST=192.168.1.100
DB_PORT=5432
DB_DATABASE=dbo
DB_USER=postgres
DB_PASSWORD=mi_contraseña_aqui
DB_SCHEMA=smart_restaurants
DB_TABLE=novonimisk_data
API_PORT=8080
```

**Para guardar:** `CTRL + X` → `Y` → `ENTER`

---

## 📋 PASO 7 - Instalar dependencias Frontend

```bash
cd /root/KFC_DashBoard/frontend
npm install
npm run build
```

---

## 📋 PASO 8 - Instalar dependencias Backend

```bash
cd /root/KFC_DashBoard/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 📋 PASO 9 - Crear carpeta de logs

```bash
mkdir -p /root/KFC_DashBoard/logs
```

---

## 📋 PASO 10 - Iniciar todo automáticamente con pm2

```bash
cd /root/KFC_DashBoard
pm2 start ecosystem.config.js
pm2 status
```

Debería mostrar 2 procesos corriendo: `kfc-backend` y `kfc-frontend`

---

## 📋 PASO 11 - Ver logs en tiempo real

```bash
pm2 logs
```

Espera a ver:
- ✅ "MQTT connected"  
- ✅ "Database connected"
- ✅ "Loaded X latest values"

Presiona `CTRL + C` para salir de los logs.

---

## 📋 PASO 12 - Acceder a tu Dashboard

Abre en el navegador:

```
http://tu_ip_del_servidor:3000
```

Ejemplo:
```
http://192.168.1.50:3000
```

---

## 📊 COMANDOS ÚTILES DESPUÉS

### Ver estado
```bash
pm2 status
```

### Reiniciar todo
```bash
pm2 restart all
```

### Ver logs
```bash
pm2 logs
```

### Detener todo
```bash
pm2 stop all
```

### Eliminar de pm2
```bash
pm2 delete all
```

### Guardar para que inicie en reboot
```bash
pm2 save
sudo pm2 startup
```

---

## 🔧 Si algo falla

### Backend no conecta a MQTT
```bash
pm2 logs kfc-backend
```
Verifica que `MQTT_BROKER` en `backend/.env` sea correcto.

### Backend no conecta a PostgreSQL  
```bash
pm2 logs kfc-backend
```
Verifica `DB_HOST`, `DB_USER`, `DB_PASSWORD` en `backend/.env`.

### Frontend no carga
```bash
pm2 logs kfc-frontend
```
Verifica que el backend esté corriendo: `pm2 status`

### Puerto 3000 en uso
```bash
lsof -i :3000
sudo kill -9 <PID>
pm2 restart kfc-frontend
```

---

## ✅ Checklist Final

- [ ] Estás en `/root/KFC_DashBoard`
- [ ] Node.js 18+ instalado (`node --version`)
- [ ] Python 3.10+ instalado (`python3 --version`)
- [ ] `backend/.env` editado con tus datos
- [ ] `npm install` en frontend completó
- [ ] Entorno virtual Python creado (`backend/venv/`)
- [ ] `pm2 start ecosystem.config.js` corrió sin errores
- [ ] `pm2 status` muestra 2 procesos running
- [ ] Puedes abrir `http://tu_ip:3000` en navegador

---

## 🚀 Resumen Ultra Rápido

Si **ya clonaste** y solo quieres iniciar:

```bash
# Todos estos comandos en orden, copia-pega línea por línea:

cd /root/KFC_DashBoard
sudo apt update && sudo apt install -y nodejs python3 python3-venv
sudo npm install -g pm2
nano backend/.env                    # Edita: MQTT_BROKER, DB_HOST, usuario, contraseña
cd frontend && npm install && npm run build && cd ..
cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && cd ..
mkdir -p logs
pm2 start ecosystem.config.js
pm2 status
```

**Listo. Accede a `http://tu_ip:3000`** ✅

## 🔧 Hardware Mínimo

- **CPU**: 1 core (Ubuntu 20.04+)
- **RAM**: 512 MB
- **Node.js**: 18+
- **Python**: 3.10+
- **PostgreSQL**: 12+ (remoto OK)

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
