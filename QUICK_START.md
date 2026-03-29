# 🚀 KFC Dashboard - Inicio Rápido

## Lo único que necesitas hacer:

### En tu servidor Linux (Ubuntu 20.04):

```bash
# 1. Clonar proyecto
git clone <tu-repo-url>
cd Dashboard_KFC

# 2. LISTO. Solo ejecuta:
bash start.sh
```

**O en Windows (si lo necesitas):**
```cmd
start.bat
```

---

## ¿Qué hace el script?

1. ✅ Instala dependencias frontend (npm)
2. ✅ Construye frontend producción
3. ✅ Instala dependencias backend (Python)
4. ✅ Levanta backend con pm2
5. ✅ Sirve frontend con pm2 (puerto 3000)

---

## Verificar que funciona:

```bash
# Ver estado de servicios
pm2 status

# Ver logs en tiempo real
pm2 logs

# Ver frontend
Abre en navegador: http://tu_servidor_ip:3000

# Ver backend
curl http://tu_servidor_ip:8080/api/metrics
```

---

## Comandos útiles depois de iniciar:

```bash
# Reiniciar
pm2 restart all

# Parar
pm2 stop all

# Parar todo y salir
pm2 kill

# Ver logs específicos
pm2 logs kfc-backend
pm2 logs kfc-frontend
```

---

## Configurar variables (antes de ejecutar start.sh):

Edita `backend/.env`:

```ini
MQTT_BROKER=tu_broker_ip
MQTT_PORT=1883
DB_HOST=tu_db_ip
DB_USER=postgres
DB_PASSWORD=tu_password
DB_DATABASE=dbo
```

Y en el servidor, actualiza `ecosystem.config.js` si necesitas cambiar puertos (por ejemplo de 3000/8080 a 80/3000).

---

## En tu servidor con pm2 ya instalado:

```bash
cd Dashboard_KFC
pm2 start ecosystem.config.js --name "kfc-dashboard"
pm2 save
pm2 startup
```

Listo. El dashboard va a reiniciarse automáticamente si el servidor se reinicia.

---

**Eso es todo. Nada de entornos virtuales, nada complicado.**
