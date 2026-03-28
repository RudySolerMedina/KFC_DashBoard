from __future__ import annotations

import asyncio
import contextlib
import logging
import os
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import paho.mqtt.client as mqtt
import psycopg2
from psycopg2 import pool, sql
from psycopg2.extras import RealDictCursor, execute_values
import uvicorn

load_dotenv(Path(__file__).with_name('.env'))


@dataclass(frozen=True)
class Settings:
    mqtt_broker: str = os.getenv('MQTT_BROKER', '85.198.65.213')
    mqtt_port: int = int(os.getenv('MQTT_PORT', '1883'))
    mqtt_client_id: str = os.getenv('MQTT_CLIENT_ID', 'kfc_dashboard_backend')
    api_host: str = os.getenv('API_HOST', '127.0.0.1')
    api_port: int = int(os.getenv('API_PORT', '8080'))
    flush_interval_seconds: int = int(os.getenv('FLUSH_INTERVAL_SECONDS', '60'))
    db_host: str = os.getenv('DB_HOST', 'localhost')
    db_port: int = int(os.getenv('DB_PORT', '5432'))
    db_database: str = os.getenv('DB_DATABASE', 'dbo')
    db_user: str = os.getenv('DB_USER', 'postgres')
    db_password: str = os.getenv('DB_PASSWORD', 'root')
    db_schema: str = os.getenv('DB_SCHEMA', 'smart_restaurants')
    db_table: str = os.getenv('DB_TABLE', 'novonimisk_data')
    cors_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv(
            'CORS_ORIGINS',
            'http://localhost:5173,http://127.0.0.1:5173',
        ).split(',')
        if origin.strip()
    )


SETTINGS = Settings()

TOPIC_DEFINITIONS = [
    {'id': 'urms_l1', 'label': 'Напряжение L1', 'topic': 'Nevinnomisk/devices/energomera303_00000201/controls/Urms L1', 'unit': 'В', 'group': 'voltages'},
    {'id': 'urms_l2', 'label': 'Напряжение L2', 'topic': 'Nevinnomisk/devices/energomera303_00000201/controls/Urms L2', 'unit': 'В', 'group': 'voltages'},
    {'id': 'urms_l3', 'label': 'Напряжение L3', 'topic': 'Nevinnomisk/devices/energomera303_00000201/controls/Urms L3', 'unit': 'В', 'group': 'voltages'},
    {'id': 'irms_l1', 'label': 'Ток L1', 'topic': 'Nevinnomisk/devices/energomera303_00000201/controls/Irms L1', 'unit': 'А', 'group': 'currents'},
    {'id': 'irms_l2', 'label': 'Ток L2', 'topic': 'Nevinnomisk/devices/energomera303_00000201/controls/Irms L2', 'unit': 'А', 'group': 'currents'},
    {'id': 'irms_l3', 'label': 'Ток L3', 'topic': 'Nevinnomisk/devices/energomera303_00000201/controls/Irms L3', 'unit': 'А', 'group': 'currents'},
    {'id': 'p_l1', 'label': 'Мощность L1', 'topic': 'Nevinnomisk/devices/energomera303_00000201/controls/P L1', 'unit': 'Вт', 'group': 'power'},
    {'id': 'p_l2', 'label': 'Мощность L2', 'topic': 'Nevinnomisk/devices/energomera303_00000201/controls/P L2', 'unit': 'Вт', 'group': 'power'},
    {'id': 'p_l3', 'label': 'Мощность L3', 'topic': 'Nevinnomisk/devices/energomera303_00000201/controls/Total P', 'unit': 'Вт', 'group': 'power'},
    {'id': 'pf_l1', 'label': 'КМ L1', 'topic': 'Nevinnomisk/devices/energomera303_00000201/controls/PF L1', 'unit': '', 'group': 'power_factor'},
    {'id': 'pf_l2', 'label': 'КМ L2', 'topic': 'Nevinnomisk/devices/energomera303_00000201/controls/PF L2', 'unit': '', 'group': 'power_factor'},
    {'id': 'pf_l3', 'label': 'КМ L3', 'topic': 'Nevinnomisk/devices/energomera303_00000201/controls/PF L3', 'unit': '', 'group': 'power_factor'},
    {'id': 'total_p', 'label': 'Общая мощность', 'topic': 'Nevinnomisk/devices/energomera303_00000201/controls/Total P', 'unit': 'Вт', 'group': 'total'},
    {'id': 'total_energy', 'label': 'Энергия (итого)', 'topic': 'Nevinnomisk/devices/energomera303_00000201/controls/Total A energy', 'unit': 'кВтч', 'group': 'total'},
    {'id': 'indoor_temp', 'label': 'Температура', 'topic': 'Nevinnomisk/devices/wb-msw-v4_41/controls/Temperature', 'unit': '°C', 'group': 'microclimate'},
    {'id': 'indoor_humidity', 'label': 'Влажность', 'topic': 'Nevinnomisk/devices/wb-msw-v4_41/controls/Humidity', 'unit': '%', 'group': 'microclimate'},
    {'id': 'indoor_illuminance', 'label': 'Освещённость', 'topic': 'Nevinnomisk/devices/wb-msw-v4_41/controls/Illuminance', 'unit': 'лк', 'group': 'microclimate'},
    {'id': 'indoor_co2', 'label': 'CO2', 'topic': 'Nevinnomisk/devices/wb-msw-v4_41/controls/CO2', 'unit': 'ppm', 'group': 'microclimate'},
    {'id': 'indoor_voc', 'label': 'Качество воздуха (VOC)', 'topic': 'Nevinnomisk/devices/wb-msw-v4_41/controls/Air Quality (VOC)', 'unit': 'индекс', 'group': 'microclimate'},
    {'id': 'outdoor_temp', 'label': 'Температура на улице', 'topic': 'Nevinnomisk/devices/weather_owm/controls/Температура', 'unit': '°C', 'group': 'microclimate'},
    {'id': 'outdoor_humidity', 'label': 'Влажность на улице', 'topic': 'Nevinnomisk/devices/weather_owm/controls/Влажность', 'unit': '%', 'group': 'microclimate'},
    {'id': 'outdoor_wind', 'label': 'Скорость ветра на улице', 'topic': 'Nevinnomisk/devices/weather_owm/controls/Ветер', 'unit': 'м/с', 'group': 'microclimate'},
]

TOPIC_MAP = {metric['topic']: metric for metric in TOPIC_DEFINITIONS}


def parse_window(window: str) -> timedelta:
    mapping = {
        '1h': timedelta(hours=1),
        '6h': timedelta(hours=6),
        '24h': timedelta(hours=24),
        '7d': timedelta(days=7),
        '30d': timedelta(days=30),
    }
    try:
        return mapping[window]
    except KeyError as error:
        raise HTTPException(status_code=400, detail='Unsupported window value') from error


def parse_message(topic: str, payload: str) -> tuple[str, str, float | None, str]:
    try:
        value = float(payload)
    except (ValueError, TypeError):
        value = None

    parts = topic.strip('/').split('/')
    if len(parts) >= 4:
        device, sensor = parts[1], parts[3]
    else:
        device = parts[1] if len(parts) > 1 else 'unknown'
        sensor = topic.split('/')[-1] if len(parts) > 1 else 'unknown'

    return (device, sensor, value, topic)


def serialise_number(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def qualified_table(settings: Settings) -> sql.Composed:
    return sql.SQL('{}.{}').format(
        sql.Identifier(settings.db_schema),
        sql.Identifier(settings.db_table),
    )


class Database:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.pool: pool.ThreadedConnectionPool | None = None

    def ensure_schema(self, connection) -> None:
        table_ref = qualified_table(self.settings)
        with connection.cursor() as cursor:
            cursor.execute(
                sql.SQL('CREATE SCHEMA IF NOT EXISTS {}').format(
                    sql.Identifier(self.settings.db_schema)
                )
            )
            cursor.execute(
                sql.SQL(
                    '''
                    CREATE TABLE IF NOT EXISTS {} (
                        id SERIAL PRIMARY KEY,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        device VARCHAR(100),
                        sensor VARCHAR(200),
                        value NUMERIC(20, 6),
                        topic VARCHAR(500)
                    )
                    '''
                ).format(table_ref)
            )
            cursor.execute(
                sql.SQL('ALTER TABLE {} ADD COLUMN IF NOT EXISTS id SERIAL').format(table_ref)
            )
            cursor.execute(
                sql.SQL('ALTER TABLE {} ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP').format(table_ref)
            )
            cursor.execute(
                sql.SQL('ALTER TABLE {} ADD COLUMN IF NOT EXISTS device VARCHAR(100)').format(table_ref)
            )
            cursor.execute(
                sql.SQL('ALTER TABLE {} ADD COLUMN IF NOT EXISTS sensor VARCHAR(200)').format(table_ref)
            )
            cursor.execute(
                sql.SQL('ALTER TABLE {} ADD COLUMN IF NOT EXISTS value NUMERIC(20, 6)').format(table_ref)
            )
            cursor.execute(
                sql.SQL('ALTER TABLE {} ADD COLUMN IF NOT EXISTS topic VARCHAR(500)').format(table_ref)
            )
            cursor.execute(
                sql.SQL(
                    'CREATE INDEX IF NOT EXISTS {} ON {} (topic, timestamp DESC)'
                ).format(
                    sql.Identifier(f'{self.settings.db_table}_topic_timestamp_idx'),
                    table_ref,
                )
            )
        connection.commit()

    def connect(self) -> None:
        self.pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            host=self.settings.db_host,
            port=self.settings.db_port,
            database=self.settings.db_database,
            user=self.settings.db_user,
            password=self.settings.db_password,
        )
        with self.connection() as connection:
            self.ensure_schema(connection)
            with connection.cursor() as cursor:
                cursor.execute(
                    sql.SQL('SELECT 1 FROM {} LIMIT 1').format(qualified_table(self.settings))
                )

    def close(self) -> None:
        if self.pool:
            self.pool.closeall()
            self.pool = None

    @contextlib.contextmanager
    def connection(self):
        if not self.pool:
            raise RuntimeError('Database pool is not initialised')
        connection = self.pool.getconn()
        try:
            yield connection
        finally:
            self.pool.putconn(connection)

    def insert_rows(self, rows: list[tuple[str, str, float | None, str, datetime]]) -> int:
        if not rows:
            return 0
        with self.connection() as connection:
            with connection.cursor() as cursor:
                insert_sql = sql.SQL(
                    'INSERT INTO {} (device, sensor, value, topic, timestamp) VALUES %s'
                ).format(qualified_table(self.settings))
                execute_values(cursor, insert_sql.as_string(connection), rows, page_size=500)
            connection.commit()
        return len(rows)

    def fetch_latest_values(self) -> dict[str, dict[str, float | None]]:
        with self.connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    sql.SQL(
                        '''
                        SELECT DISTINCT ON (topic) topic, value, timestamp
                        FROM {}
                        ORDER BY topic, timestamp DESC
                        '''
                    ).format(qualified_table(self.settings))
                )
                rows = cursor.fetchall()
        latest = {}
        for row in rows:
            latest[row['topic']] = {
                'value': serialise_number(row['value']),
                'ts': row['timestamp'].timestamp() if row['timestamp'] else None,
            }
        return latest

    def fetch_history(
        self,
        topic: str,
        start_at: datetime,
        end_at: datetime,
        limit: int,
    ) -> list[dict[str, Any]]:
        with self.connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    sql.SQL(
                        '''
                        SELECT timestamp, value
                        FROM {}
                        WHERE topic = %s
                          AND timestamp BETWEEN %s AND %s
                        ORDER BY timestamp DESC
                        LIMIT %s
                        '''
                    ).format(qualified_table(self.settings)),
                    (topic, start_at, end_at, limit),
                )
                rows = cursor.fetchall()
        rows.reverse()
        return [
            {
                'timestamp': row['timestamp'].isoformat() if row['timestamp'] else None,
                'value': serialise_number(row['value']),
            }
            for row in rows
        ]


class DashboardState:
    def __init__(self, settings: Settings, database: Database) -> None:
        self.settings = settings
        self.database = database
        self.latest: dict[str, dict[str, float | None]] = {}
        self.pending_flush: dict[str, tuple[str, str, float | None, str]] = {}
        self.clients: set[WebSocket] = set()
        self.loop: asyncio.AbstractEventLoop | None = None
        self.mqtt_client: mqtt.Client | None = None
        self.flush_task: asyncio.Task | None = None

    async def load_initial_state(self) -> None:
        try:
            self.latest = await asyncio.to_thread(self.database.fetch_latest_values)
            logging.info('Loaded %s latest values from PostgreSQL', len(self.latest))
        except Exception as error:
            logging.warning('Could not prefill latest values from PostgreSQL: %s', error)

    async def publish_metric(self, topic: str, value: float, ts: float) -> None:
        self.latest[topic] = {'value': value, 'ts': ts}
        payload = {'type': 'metric', 'topic': topic, 'value': value, 'ts': ts}
        stale_clients: list[WebSocket] = []
        for ws in self.clients:
            try:
                await ws.send_json(payload)
            except Exception:
                stale_clients.append(ws)
        for ws in stale_clients:
            self.clients.discard(ws)

    async def queue_for_flush(self, topic: str, payload: str) -> None:
        row = parse_message(topic, payload)
        if row[2] is None:
            return
        self.pending_flush[topic] = row

    async def flush_pending(self) -> None:
        if not self.pending_flush:
            logging.debug('No pending rows to flush')
            return
        batch = list(self.pending_flush.values())
        batch_size = len(batch)
        logging.info('Flushing %d rows to PostgreSQL', batch_size)
        self.pending_flush.clear()
        try:
            inserted = await asyncio.to_thread(self.database.insert_rows, batch)
            logging.info('Successfully inserted %d rows into PostgreSQL', inserted)
        except Exception as error:
            logging.error('PostgreSQL batch insert failed: %s', error)
            for row in batch:
                self.pending_flush[row[3]] = row

    async def flush_loop(self) -> None:
        logging.info('Flush loop started, interval: %d seconds', self.settings.flush_interval_seconds)
        while True:
            await asyncio.sleep(self.settings.flush_interval_seconds)
            logging.info('Flush cycle starting, pending rows: %d', len(self.pending_flush))
            await self.flush_pending()
            logging.info('Flush cycle complete')


DATABASE = Database(SETTINGS)
STATE = DashboardState(SETTINGS, DATABASE)


def on_mqtt_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        logging.info('MQTT connected to %s:%s', SETTINGS.mqtt_broker, SETTINGS.mqtt_port)
        subscribed_count = 0
        for metric in TOPIC_DEFINITIONS:
            result = client.subscribe(metric['topic'], qos=1)
            if result[0] == 0:
                subscribed_count += 1
        logging.info('Successfully subscribed to %d topics', subscribed_count)
    else:
        logging.error('MQTT connection failed: %s', reason_code)


def on_mqtt_disconnect(client, userdata, disconnect_flags, reason_code, properties):
    logging.warning('MQTT disconnected with code %s', reason_code)


def on_mqtt_message(client, userdata, msg):
    try:
        payload = msg.payload.decode('utf-8')
        value = float(payload)
        
        # Parse MQTT topic: Nevinnomisk/devices/{device}/controls/{sensor}
        parts = msg.topic.split('/')
        device = parts[2] if len(parts) > 2 else 'unknown'
        sensor = parts[4] if len(parts) > 4 else 'unknown'
        
        # Update real-time values and publish to WebSocket clients
        now = datetime.utcnow()
        now_ts = now.timestamp()
        
        # Update STATE.latest for immediate API responses
        STATE.latest[msg.topic] = {
            'value': value,
            'ts': now_ts,
        }
        
        # Publish to all WebSocket clients
        asyncio.run_coroutine_threadsafe(STATE.publish_metric(msg.topic, value, now_ts), STATE.loop)
        
        # Store as (device, sensor, value, topic, timestamp) for database flush
        STATE.pending_flush[msg.topic] = (device, sensor, value, msg.topic, now)
        logging.info('Updated: %s/%s = %s', device, sensor, value)
    except ValueError:
        logging.debug('Could not decode MQTT payload on %s: %s', msg.topic, msg.payload)
    except Exception as error:
        logging.error('MQTT message handling error: %s', error)


async def handle_message() -> None:
    pass


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info('Starting backend services')
    STATE.loop = asyncio.get_running_loop()
    DATABASE.connect()
    await STATE.load_initial_state()
    STATE.flush_task = asyncio.create_task(STATE.flush_loop())

    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=SETTINGS.mqtt_client_id)
    mqtt_client.on_connect = on_mqtt_connect
    mqtt_client.on_disconnect = on_mqtt_disconnect
    mqtt_client.on_message = on_mqtt_message
    mqtt_client.reconnect_delay_set(min_delay=1, max_delay=30)
    mqtt_client.max_queued_messages_set(0)
    mqtt_client.max_inflight_messages_set(200)
    mqtt_client.connect_async(SETTINGS.mqtt_broker, SETTINGS.mqtt_port, keepalive=60)
    mqtt_client.loop_start()
    STATE.mqtt_client = mqtt_client

    yield

    logging.info('Stopping backend services')
    if STATE.flush_task:
        STATE.flush_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await STATE.flush_task
    await STATE.flush_pending()
    if STATE.mqtt_client:
        STATE.mqtt_client.loop_stop()
        STATE.mqtt_client.disconnect()
    DATABASE.close()


app = FastAPI(title='KFC Dashboard Backend', version='1.0.0', lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(SETTINGS.cors_origins),
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/')
async def root() -> JSONResponse:
    return JSONResponse({'status': 'ok', 'service': 'kfc-dashboard-backend'})


@app.get('/api/metrics')
async def metrics() -> JSONResponse:
    return JSONResponse(
        {
            'broker': SETTINGS.mqtt_broker,
            'metrics': TOPIC_DEFINITIONS,
            'values': STATE.latest,
        }
    )


@app.get('/api/history')
async def history(
    topic: str = Query(...),
    window: str = Query('24h'),
    limit: int = Query(1440, ge=1, le=10000),
) -> JSONResponse:
    end_at = datetime.now()
    start_at = end_at - parse_window(window)
    try:
        points = await asyncio.to_thread(DATABASE.fetch_history, topic, start_at, end_at, limit)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f'History query failed: {error}') from error

    metric = TOPIC_MAP.get(topic)
    return JSONResponse(
        {
            'topic': topic,
            'metric': metric,
            'window': window,
            'points': points,
        }
    )


@app.websocket('/ws')
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    STATE.clients.add(websocket)
    await websocket.send_json(
        {
            'type': 'bootstrap',
            'broker': SETTINGS.mqtt_broker,
            'metrics': TOPIC_DEFINITIONS,
            'values': STATE.latest,
        }
    )
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        STATE.clients.discard(websocket)
    except Exception:
        STATE.clients.discard(websocket)


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
    uvicorn.run('main:app', host=SETTINGS.api_host, port=SETTINGS.api_port, reload=False)
