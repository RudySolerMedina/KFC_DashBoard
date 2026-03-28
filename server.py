import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Any

from aiohttp import WSMsgType, web
import paho.mqtt.client as mqtt

BROKER_HOST = "85.198.65.213"
BROKER_PORT = 1883
MQTT_CLIENT_ID = "kfc_dashboard_backend"

# 14 electrical metrics only
TOPIC_DEFINITIONS = [
    {"id": "urms_l1", "label": "Напряжение L1", "topic": "Nevinnomisk/devices/energomera303_00000201/controls/Urms L1", "unit": "В", "group": "voltages"},
    {"id": "urms_l2", "label": "Напряжение L2", "topic": "Nevinnomisk/devices/energomera303_00000201/controls/Urms L2", "unit": "В", "group": "voltages"},
    {"id": "urms_l3", "label": "Напряжение L3", "topic": "Nevinnomisk/devices/energomera303_00000201/controls/Urms L3", "unit": "В", "group": "voltages"},
    {"id": "irms_l1", "label": "Ток L1", "topic": "Nevinnomisk/devices/energomera303_00000201/controls/Irms L1", "unit": "А", "group": "currents"},
    {"id": "irms_l2", "label": "Ток L2", "topic": "Nevinnomisk/devices/energomera303_00000201/controls/Irms L2", "unit": "А", "group": "currents"},
    {"id": "irms_l3", "label": "Ток L3", "topic": "Nevinnomisk/devices/energomera303_00000201/controls/Irms L3", "unit": "А", "group": "currents"},
    {"id": "p_l1", "label": "Мощность L1", "topic": "Nevinnomisk/devices/energomera303_00000201/controls/P L1", "unit": "Вт", "group": "power"},
    {"id": "p_l2", "label": "Мощность L2", "topic": "Nevinnomisk/devices/energomera303_00000201/controls/P L2", "unit": "Вт", "group": "power"},
    {"id": "p_l3", "label": "Мощность L3", "topic": "Nevinnomisk/devices/energomera303_00000201/controls/Total P", "unit": "Вт", "group": "power"},
    {"id": "pf_l1", "label": "КМ L1", "topic": "Nevinnomisk/devices/energomera303_00000201/controls/PF L1", "unit": "", "group": "power_factor"},
    {"id": "pf_l2", "label": "КМ L2", "topic": "Nevinnomisk/devices/energomera303_00000201/controls/PF L2", "unit": "", "group": "power_factor"},
    {"id": "pf_l3", "label": "КМ L3", "topic": "Nevinnomisk/devices/energomera303_00000201/controls/PF L3", "unit": "", "group": "power_factor"},
    {"id": "total_p", "label": "Общая мощность", "topic": "Nevinnomisk/devices/energomera303_00000201/controls/Total P", "unit": "Вт", "group": "total"},
    {"id": "total_energy", "label": "Энергия (итого)", "topic": "Nevinnomisk/devices/energomera303_00000201/controls/Total A energy", "unit": "кВтч", "group": "total"},
]


class DashboardState:
    def __init__(self) -> None:
        self.latest: dict[str, dict[str, Any]] = {}
        self.clients: set[web.WebSocketResponse] = set()
        self.loop: asyncio.AbstractEventLoop | None = None
        self.mqtt_client: mqtt.Client | None = None

    async def push_update(self, topic: str, value: Any, ts: float) -> None:
        self.latest[topic] = {"value": value, "ts": ts}
        payload = {"type": "metric", "topic": topic, "value": value, "ts": ts}
        
        stale_clients = []
        for ws in self.clients:
            try:
                await ws.send_json(payload)
            except Exception:
                stale_clients.append(ws)
        
        for ws in stale_clients:
            self.clients.discard(ws)


STATE = DashboardState()


def on_mqtt_connect(client, userdata, flags, rc):
    if rc == 0:
        logging.info("[MQTT] Connected to broker")
        for metric in TOPIC_DEFINITIONS:
            client.subscribe(metric["topic"])
    else:
        logging.error(f"[MQTT] Connection failed: {rc}")


def on_mqtt_message(client, userdata, msg):
    topic = msg.topic
    try:
        value = float(msg.payload.decode("utf-8"))
        timestamp = time.time()
        asyncio.run_coroutine_threadsafe(
            STATE.push_update(topic, value, timestamp),
            STATE.loop,
        )
    except (ValueError, UnicodeDecodeError):
        logging.warning(f"[MQTT] Invalid payload for {topic}")


async def index_handler(request: web.Request) -> web.Response:
    return web.json_response({"status": "Backend API running", "metrics": len(TOPIC_DEFINITIONS)})


async def metrics_handler(request: web.Request) -> web.Response:
    return web.json_response({
        "broker": BROKER_HOST,
        "metrics": TOPIC_DEFINITIONS,
        "values": STATE.latest,
    })


async def websocket_handler(request: web.Request) -> web.WebSocketResponse:
    ws = web.WebSocketResponse(heartbeat=20)
    await ws.prepare(request)
    
    STATE.clients.add(ws)
    logging.info(f"[WS] Client connected (total: {len(STATE.clients)})")
    
    bootstrap = {
        "type": "bootstrap",
        "broker": BROKER_HOST,
        "metrics": TOPIC_DEFINITIONS,
        "values": STATE.latest,
    }
    await ws.send_json(bootstrap)
    
    try:
        async for msg in ws:
            if msg.type in (WSMsgType.ERROR, WSMsgType.CLOSED):
                break
    finally:
        STATE.clients.discard(ws)
        logging.info(f"[WS] Client disconnected (total: {len(STATE.clients)})")
    
    return ws


async def start_mqtt(app: web.Application) -> None:
    STATE.loop = asyncio.get_running_loop()
    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, MQTT_CLIENT_ID)
    mqtt_client.on_connect = on_mqtt_connect
    mqtt_client.on_message = on_mqtt_message
    
    try:
        mqtt_client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
        mqtt_client.loop_start()
        STATE.mqtt_client = mqtt_client
        logging.info(f"[MQTT] Connecting to {BROKER_HOST}:{BROKER_PORT}...")
    except Exception as error:
        logging.error(f"[MQTT] Connection error: {error}")


async def stop_mqtt(app: web.Application) -> None:
    if STATE.mqtt_client:
        STATE.mqtt_client.loop_stop()
        STATE.mqtt_client.disconnect()
        logging.info("[MQTT] Disconnected")


def create_app() -> web.Application:
    app = web.Application()
    app.on_startup.append(start_mqtt)
    app.on_cleanup.append(stop_mqtt)
    
    app.router.add_get("/", index_handler)
    app.router.add_get("/api/metrics", metrics_handler)
    app.router.add_get("/ws", websocket_handler)
    
    return app


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
    web.run_app(create_app(), host="127.0.0.1", port=8080)
