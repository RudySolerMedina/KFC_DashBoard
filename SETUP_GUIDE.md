# KFC Dashboard - Setup Guide for Ubuntu 20.04

Complete step-by-step instructions to clone and run this dashboard on an Ubuntu 20.04 server.

## Prerequisites

- Ubuntu 20.04 LTS server
- Internet connection
- SSH access to your server
- `sudo` privileges

## Step 1: Connect to Your Server

```bash
ssh your_user@your_server_ip
```

## Step 2: Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

## Step 3: Install Python 3.10 and Dependencies

```bash
sudo apt install -y python3.10 python3.10-venv python3-pip
sudo apt install -y git curl

# Verify Python version
python3.10 --version
```

## Step 4: Install Node.js and npm

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node --version
npm --version
```

## Step 5: Clone the Repository

```bash
cd ~
git clone https://github.com/RudySolerMedina/KFC_DashBoard.git
cd KFC_DashBoard
```

## Step 6: Set Up Python Environment

```bash
# Create virtual environment
python3.10 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install aiohttp==3.9.5 paho-mqtt==2.1.0
```

## Step 7: Install Frontend Dependencies

```bash
npm install
```

## Step 8: Build Frontend (Optional - for production)

```bash
npm run build

# Output will be in ./dist directory
```

## Step 9: Start the Backend Server

In a terminal window, run:

```bash
# Make sure you're in the project directory and venv is activated
source venv/bin/activate
python3.10 server.py
```

Expected output:
```
[INFO] Connecting to 85.198.65.213:1883...
[INFO] [MQTT] Connected to broker
```

## Step 10: Start the Frontend Development Server (Alternative Method)

In a separate terminal window:

```bash
cd KFC_DashBoard
npm run dev
```

The frontend will be available at: `http://your_server_ip:5173`

## Step 11: Access the Dashboard

Open your browser and navigate to:
- **Development**: `http://your_server_ip:5173`
- **Backend API**: `http://your_server_ip:8080/api/metrics`

## Running in Production (Using Process Manager)

### Option A: Using PM2 (Recommended)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Save PM2 startup configuration
pm2 startup
pm2 save

# Start Python backend with PM2
pm2 start "python3.10 server.py" --name "kfc-backend" --cwd /home/your_user/KFC_DashBoard

# Start frontend build server
pm2 start "npm run preview" --name "kfc-frontend" --cwd /home/your_user/KFC_DashBoard

# Verify status
pm2 status
pm2 logs
```

### Option B: Using systemd Services

Create `/etc/systemd/system/kfc-backend.service`:

```ini
[Unit]
Description=KFC Dashboard Backend
After=network.target

[Service]
User=your_user
WorkingDirectory=/home/your_user/KFC_DashBoard
Environment="PATH=/home/your_user/KFC_DashBoard/venv/bin"
ExecStart=/home/your_user/KFC_DashBoard/venv/bin/python3.10 server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Load and start the service
sudo systemctl daemon-reload
sudo systemctl enable kfc-backend
sudo systemctl start kfc-backend

# Check status
sudo systemctl status kfc-backend
```

## Firewall Configuration

If you have a firewall enabled, allow the required ports:

```bash
# For development
sudo ufw allow 5173/tcp
sudo ufw allow 8080/tcp

# Reload firewall
sudo ufw reload
```

## MQTT Broker Configuration

The dashboard connects to: `85.198.65.213:1883`

Currently using public MQTT broker. For production, consider:
1. Setting up your own MQTT broker (Mosquitto, HiveMQ)
2. Updating `BROKER_HOST` in `server.py` to your broker IP
3. Configuring authentication if needed

## Monitoring

### Check Backend Logs

```bash
# If using systemd
sudo journalctl -u kfc-backend -f

# If using PM2
pm2 logs kfc-backend
```

### Check Frontend Logs

```bash
# If using PM2
pm2 logs kfc-frontend
```

## Troubleshooting

### Port Already in Use

If port 8080 is already in use:

```bash
# Find process using port 8080
sudo lsof -i :8080

# Kill the process
sudo kill -9 <PID>
```

### MQTT Connection Issues

```bash
# Test MQTT connection
pip install paho-mqtt
python3 -c "import paho.mqtt.client; print('MQTT module OK')"

# Test broker connectivity
telnet 85.198.65.213 1883
```

### Python Version Mismatch

Ensure you're using Python 3.10:

```bash
# Which python is currently active
which python3.10
python3.10 --version
```

## Updating the Dashboard

To update to the latest version:

```bash
cd ~/KFC_DashBoard
git pull origin main

# Reinstall dependencies if package.json changed
npm install

# Restart services
pm2 restart all
# or
sudo systemctl restart kfc-backend
```

## Useful Commands

```bash
# Activate Python environment
source ~/KFC_DashBoard/venv/bin/activate

# Build frontend for production
npm run build

# Run frontend preview (production build)
npm run preview

# Check service status
pm2 status

# View real-time logs
pm2 monit

# Stop all services
pm2 stop all

# Start all services
pm2 start all
```

## Support

For issues or questions, refer to the project repository:
https://github.com/RudySolerMedina/KFC_DashBoard

## License

This project monitors KFC Restaurant electricity consumption and microclimate data.

---

**Last Updated:** March 28, 2026  
**Compatible with:** Ubuntu 20.04 LTS, Python 3.10, Node.js 20+
