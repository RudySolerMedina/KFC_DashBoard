import { config as loadEnv } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
loadEnv({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') })
import express from 'express'
import cors from 'cors'
import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import mqtt from 'mqtt'
import pg from 'pg'

const { Pool } = pg

// ─────────────────────────────────────────────
// Settings  (all come from backend/.env)
//
// IMPORTANT:
// - To switch LOCAL <-> CORPORATE server, edit backend/.env only.
// - Do not hardcode broker/database IPs or credentials in this file.
// ─────────────────────────────────────────────
const MQTT_BROKER       = process.env.MQTT_BROKER                          ?? '127.0.0.1'
const MQTT_PORT         = Number(process.env.MQTT_PORT                     ?? '1883')
const MQTT_CLIENT_ID    = process.env.MQTT_CLIENT_ID                       ?? 'kfc_dashboard_backend'
const API_HOST          = process.env.API_HOST                             ?? '127.0.0.1'
const API_PORT          = Number(process.env.API_PORT                      ?? '8080')
const FLUSH_INTERVAL_MS = Number(process.env.FLUSH_INTERVAL_SECONDS        ?? '60') * 1000
const DB_RECONNECT_MS   = Number(process.env.DB_RECONNECT_INTERVAL_SECONDS ?? '10') * 1000
const DB_DATABASE       = process.env.DB_DATABASE                          ?? process.env.DB_NAME ?? 'dbo'
const DB_SCHEMA         = process.env.DB_SCHEMA                            ?? 'smart_restaurants'
const DB_TABLE          = process.env.DB_TABLE                             ?? 'novonimisk_data'
const DB_AUTO_DDL       = (process.env.DB_AUTO_DDL                         ?? 'false').toLowerCase() === 'true'
const CORS_ORIGINS      = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map(s => s.trim()).filter(Boolean)

// Safely quoted identifiers for SQL (values come from env, never user input)
const SCHEMA_QUOTED = `"${DB_SCHEMA.replace(/"/g, '""')}"`
const TABLE_QUOTED  = `"${DB_TABLE.replace(/"/g, '""')}"`
const FULL_TABLE    = `${SCHEMA_QUOTED}.${TABLE_QUOTED}`
const INDEX_QUOTED  = `"${(DB_TABLE + '_topic_timestamp_idx').replace(/"/g, '""')}"`

function logStage (scope, message) {
  console.log(`[${scope}] ${message}`)
}

function logWarn (scope, message) {
  console.warn(`[${scope}] ${message}`)
}

function logError (scope, message) {
  console.error(`[${scope}] ${message}`)
}

function isDbPermissionError (err) {
  const text = `${err?.message ?? ''}`.toLowerCase()
  return err?.code === '42501' || text.includes('permission denied')
}

// ─────────────────────────────────────────────
// Topic definitions  (expanded equipment catalog)
// ─────────────────────────────────────────────
function buildThreePhaseMetricSet ({
  key,
  group,
  groupLabel,
  device,
  channel,
  frequencyDevice,
  includePowerFactor = false,
  totalEnergyTopicSuffix = 'Total AP energy',
  totalEnergyLabel = 'Полная энергия (кВт·ч)',
}) {
  const base = `Nevinnomisk/devices/${device}/controls`
  const freqBase = `Nevinnomisk/devices/${frequencyDevice ?? device}/controls`
  const ch = channel ? `Ch ${channel} ` : ''
  const metrics = [
    { id: `${key}_total_p`, label: 'Суммарная активная мощность (кВт)', topic: `${base}/${ch}Total P`, unit: 'кВт', group, groupLabel },
    { id: `${key}_total_ap_energy`, label: totalEnergyLabel, topic: `${base}/${ch}${totalEnergyTopicSuffix}`, unit: 'кВт·ч', group, groupLabel },
    { id: `${key}_urms_l1`, label: 'Действующее напряжение фаз L1 (В)', topic: `${base}/Urms L1`, unit: 'В', group, groupLabel },
    { id: `${key}_urms_l2`, label: 'Действующее напряжение фаз L2 (В)', topic: `${base}/Urms L2`, unit: 'В', group, groupLabel },
    { id: `${key}_urms_l3`, label: 'Действующее напряжение фаз L3 (В)', topic: `${base}/Urms L3`, unit: 'В', group, groupLabel },
    { id: `${key}_irms_l1`, label: 'Ток по фазам L1 (А)', topic: `${base}/${ch}Irms L1`, unit: 'А', group, groupLabel },
    { id: `${key}_irms_l2`, label: 'Ток по фазам L2 (А)', topic: `${base}/${ch}Irms L2`, unit: 'А', group, groupLabel },
    { id: `${key}_irms_l3`, label: 'Ток по фазам L3 (А)', topic: `${base}/${ch}Irms L3`, unit: 'А', group, groupLabel },
    { id: `${key}_p_l1`, label: 'Активная мощность по фазам L1 (кВт)', topic: `${base}/${ch}P L1`, unit: 'кВт', group, groupLabel },
    { id: `${key}_p_l2`, label: 'Активная мощность по фазам L2 (кВт)', topic: `${base}/${ch}P L2`, unit: 'кВт', group, groupLabel },
    { id: `${key}_p_l3`, label: 'Активная мощность по фазам L3 (кВт)', topic: `${base}/${ch}P L3`, unit: 'кВт', group, groupLabel },
    { id: `${key}_frequency`, label: 'Частота (Гц)', topic: `${freqBase}/Frequency`, unit: 'Гц', group, groupLabel },
  ]

  if (!includePowerFactor) return metrics

  return [
    ...metrics,
    { id: `${key}_pf_l1`, label: 'Коэффициент мощности L1', topic: `${base}/${ch}PF L1`, unit: '', group, groupLabel },
    { id: `${key}_pf_l2`, label: 'Коэффициент мощности L2', topic: `${base}/${ch}PF L2`, unit: '', group, groupLabel },
    { id: `${key}_pf_l3`, label: 'Коэффициент мощности L3', topic: `${base}/${ch}PF L3`, unit: '', group, groupLabel },
  ]
}

function buildSinglePhaseMetricSet ({ key, group, groupLabel, device, channel, phase }) {
  const base = `Nevinnomisk/devices/${device}/controls`
  return [
    { id: `${key}_urms`, label: `Действующее напряжение фаз ${phase} (В)`, topic: `${base}/Urms ${phase}`, unit: 'В', group, groupLabel },
    { id: `${key}_irms`, label: `Ток по фазам ${phase} (А)`, topic: `${base}/Ch ${channel} Irms ${phase}`, unit: 'А', group, groupLabel },
    { id: `${key}_p`, label: `Активная мощность по фазам ${phase} (кВт)`, topic: `${base}/Ch ${channel} P ${phase}`, unit: 'кВт', group, groupLabel },
    { id: `${key}_total_p`, label: 'Суммарная активная мощность (кВт)', topic: `${base}/Ch ${channel} P ${phase}`, unit: 'кВт', group, groupLabel },
    { id: `${key}_ap_energy`, label: 'Полная энергия (кВт·ч)', topic: `${base}/Ch ${channel} AP energy ${phase}`, unit: 'кВт·ч', group, groupLabel },
    { id: `${key}_frequency`, label: 'Частота (Гц)', topic: `${base}/Frequency`, unit: 'Гц', group, groupLabel },
  ]
}

const TOPIC_DEFINITIONS = [
  ...buildThreePhaseMetricSet({
    key: 'total_kfc',
    group: 'total_kfc',
    groupLabel: 'Общая мощность · KFC',
    device: 'energomera303_00000201',
    includePowerFactor: true,
    totalEnergyTopicSuffix: 'Total A energy',
    totalEnergyLabel: 'Энергия (итого)',
  }),

  ...buildThreePhaseMetricSet({ key: 'f100_left', group: 'f100_left', groupLabel: 'F100 Левая (Закрытые жаровни:1.1)', device: 'wb-map12e_58', channel: 1 }),
  ...buildThreePhaseMetricSet({ key: 'f100_right', group: 'f100_right', groupLabel: 'F100 Правая (Закрытые жаровни:1.2)', device: 'wb-map12e_58', channel: 2 }),
  ...buildThreePhaseMetricSet({ key: 'fastron_1_left', group: 'fastron_1_left', groupLabel: 'FASTRON_1 Левая (Открытые жаровни:2.1)', device: 'wb-map12e_58', channel: 3 }),
  ...buildThreePhaseMetricSet({ key: 'fastron_2_mid', group: 'fastron_2_mid', groupLabel: 'FASTRON_2 Средная (Открытые жаровни:2.2)', device: 'wb-map12e_58', channel: 4 }),
  ...buildThreePhaseMetricSet({ key: 'fastron_3_right', group: 'fastron_3_right', groupLabel: 'FASTRON_3 Правая (Открытые жаровни:2.3)', device: 'wb-map12e_34', channel: 1 }),
  ...buildThreePhaseMetricSet({ key: 'eee_142_right', group: 'eee_142_right', groupLabel: 'Жаровня EEE 142 правая (Фритюрница на кухне картофеля фри:3.2)', device: 'wb-map12e_34', channel: 3, frequencyDevice: 'wb-map12e_58' }),
  ...buildThreePhaseMetricSet({ key: 'eee_142_left', group: 'eee_142_left', groupLabel: 'Жаровня EEE 142 левая (Фритюрница на кухне картофеля фри:3.1)', device: 'wb-map12e_34', channel: 2 }),
  ...buildThreePhaseMetricSet({ key: 'cocktail', group: 'cocktail', groupLabel: 'Коктельница', device: 'wb-map12e_34', channel: 4 }),

  ...buildThreePhaseMetricSet({ key: 'freezer_1', group: 'freezer_1', groupLabel: 'Морозильная камера 1', device: 'wb-map12e_73', channel: 1 }),
  ...buildThreePhaseMetricSet({ key: 'freezer_2', group: 'freezer_2', groupLabel: 'Морозильная камера 2', device: 'wb-map12e_73', channel: 2 }),
  ...buildThreePhaseMetricSet({ key: 'cold_veg', group: 'cold_veg', groupLabel: 'Холодильная камера (овощн.)', device: 'wb-map12e_73', channel: 3 }),
  ...buildThreePhaseMetricSet({ key: 'cold_defrost_chicken', group: 'cold_defrost_chicken', groupLabel: 'Холодильная камера (дефрост) для курицы', device: 'wb-map12e_73', channel: 4 }),

  ...buildThreePhaseMetricSet({ key: 'boiler_1', group: 'boiler_1', groupLabel: 'Бойлер 1', device: 'wb-map12e_98', channel: 1 }),
  ...buildThreePhaseMetricSet({ key: 'boiler_2', group: 'boiler_2', groupLabel: 'Бойлер 2', device: 'wb-map12e_98', channel: 2 }),
  ...buildThreePhaseMetricSet({ key: 'boiler_3', group: 'boiler_3', groupLabel: 'Бойлер 3', device: 'wb-map12e_98', channel: 3 }),
  ...buildThreePhaseMetricSet({ key: 'ac', group: 'ac', groupLabel: 'Кондиционеры', device: 'wb-map12e_98', channel: 4 }),
  ...buildThreePhaseMetricSet({ key: 'heaters', group: 'heaters', groupLabel: 'Обогреватели', device: 'wb-map12e_24', channel: 4 }),

  ...buildThreePhaseMetricSet({ key: 'heat_curtain', group: 'heat_curtain', groupLabel: 'Тепловая завесы', device: 'wb-map12e_243', channel: 1 }),
  ...buildSinglePhaseMetricSet({ key: 'coffee_1', group: 'coffee_1', groupLabel: 'Кофемашина 1', device: 'wb-map12e_243', channel: 2, phase: 'L1' }),
  ...buildSinglePhaseMetricSet({ key: 'coffee_2', group: 'coffee_2', groupLabel: 'Кофемашина 2', device: 'wb-map12e_243', channel: 2, phase: 'L2' }),
  ...buildSinglePhaseMetricSet({ key: 'salad_fridge', group: 'salad_fridge', groupLabel: 'Холодильник саладет', device: 'wb-map12e_243', channel: 2, phase: 'L3' }),
  ...buildSinglePhaseMetricSet({ key: 'heat_cab', group: 'heat_cab', groupLabel: 'ТЕПЛОВОЙ ШКАФ', device: 'wb-map12e_243', channel: 3, phase: 'L1' }),
  ...buildSinglePhaseMetricSet({ key: 'follett_1050', group: 'follett_1050', groupLabel: 'Шкаф тепловой FOLLETT 1050BK (Тепловая витрина)', device: 'wb-map12e_243', channel: 3, phase: 'L2' }),
  ...buildSinglePhaseMetricSet({ key: 'toaster_vertical', group: 'toaster_vertical', groupLabel: 'ТОСТЕР ВЕРТИКАЛЬНЫЙ', device: 'wb-map12e_243', channel: 3, phase: 'L3' }),
  ...buildSinglePhaseMetricSet({ key: 'toaster_horizontal', group: 'toaster_horizontal', groupLabel: 'ТОСТЕР ГОРИЗОНТАЛЬНЫЙ', device: 'wb-map12e_243', channel: 4, phase: 'L1' }),
  ...buildSinglePhaseMetricSet({ key: 'heat_903_12', group: 'heat_903_12', groupLabel: 'Тепловой шкаф 903 (Тепловые шкафы на панировке:1.2)', device: 'wb-map12e_243', channel: 4, phase: 'L2' }),
  ...buildSinglePhaseMetricSet({ key: 'heat_903_11', group: 'heat_903_11', groupLabel: 'Тепловой шкаф 903 (Тепловые шкафы на панировке:1.1)', device: 'wb-map12e_243', channel: 4, phase: 'L2' }),

  { id: 'hall_1_temp', label: 'Температура', topic: 'Nevinnomisk/devices/wb-msw-v4_41/controls/Temperature', unit: '°C', group: 'hall_1', groupLabel: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (1)' },
  { id: 'hall_1_humidity', label: 'Влажность', topic: 'Nevinnomisk/devices/wb-msw-v4_41/controls/Humidity', unit: '%', group: 'hall_1', groupLabel: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (1)' },
  { id: 'hall_1_illuminance', label: 'Освещённость', topic: 'Nevinnomisk/devices/wb-msw-v4_41/controls/Illuminance', unit: 'лк', group: 'hall_1', groupLabel: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (1)' },
  { id: 'hall_1_co2', label: 'CO2', topic: 'Nevinnomisk/devices/wb-msw-v4_41/controls/CO2', unit: 'ppm', group: 'hall_1', groupLabel: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (1)' },
  { id: 'hall_1_voc', label: 'Качество воздуха (VOC)', topic: 'Nevinnomisk/devices/wb-msw-v4_41/controls/Air Quality (VOC)', unit: 'индекс', group: 'hall_1', groupLabel: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (1)' },
  { id: 'hall_1_sound', label: 'Уровень шума', topic: 'Nevinnomisk/devices/wb-msw-v4_41/controls/Sound Level', unit: 'дБ', group: 'hall_1', groupLabel: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (1)' },

  { id: 'hall_2_temp', label: 'Температура', topic: 'Nevinnomisk/devices/wb-msw-v4_96/controls/Temperature', unit: '°C', group: 'hall_2', groupLabel: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (2)' },
  { id: 'hall_2_humidity', label: 'Влажность', topic: 'Nevinnomisk/devices/wb-msw-v4_96/controls/Humidity', unit: '%', group: 'hall_2', groupLabel: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (2)' },
  { id: 'hall_2_illuminance', label: 'Освещённость', topic: 'Nevinnomisk/devices/wb-msw-v4_96/controls/Illuminance', unit: 'лк', group: 'hall_2', groupLabel: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (2)' },
  { id: 'hall_2_co2', label: 'CO2', topic: 'Nevinnomisk/devices/wb-msw-v4_96/controls/CO2', unit: 'ppm', group: 'hall_2', groupLabel: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (2)' },
  { id: 'hall_2_voc', label: 'Качество воздуха (VOC)', topic: 'Nevinnomisk/devices/wb-msw-v4_96/controls/Air Quality (VOC)', unit: 'индекс', group: 'hall_2', groupLabel: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (2)' },
  { id: 'hall_2_sound', label: 'Уровень шума', topic: 'Nevinnomisk/devices/wb-msw-v4_96/controls/Sound Level', unit: 'дБ', group: 'hall_2', groupLabel: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (2)' },

  { id: 'hot_shop_bread_temp', label: 'Температура', topic: 'Nevinnomisk/devices/wb-msw-v4_108/controls/Temperature', unit: '°C', group: 'hot_shop_bread', groupLabel: 'ГОРЯЧИЙ ЦЕХ И ПАНИРОВОЧНАЯ' },
  { id: 'hot_shop_bread_humidity', label: 'Влажность', topic: 'Nevinnomisk/devices/wb-msw-v4_108/controls/Humidity', unit: '%', group: 'hot_shop_bread', groupLabel: 'ГОРЯЧИЙ ЦЕХ И ПАНИРОВОЧНАЯ' },
  { id: 'hot_shop_bread_illuminance', label: 'Освещённость', topic: 'Nevinnomisk/devices/wb-msw-v4_108/controls/Illuminance', unit: 'лк', group: 'hot_shop_bread', groupLabel: 'ГОРЯЧИЙ ЦЕХ И ПАНИРОВОЧНАЯ' },
  { id: 'hot_shop_bread_co2', label: 'CO2', topic: 'Nevinnomisk/devices/wb-msw-v4_108/controls/CO2', unit: 'ppm', group: 'hot_shop_bread', groupLabel: 'ГОРЯЧИЙ ЦЕХ И ПАНИРОВОЧНАЯ' },
  { id: 'hot_shop_bread_voc', label: 'Качество воздуха (VOC)', topic: 'Nevinnomisk/devices/wb-msw-v4_108/controls/Air Quality (VOC)', unit: 'индекс', group: 'hot_shop_bread', groupLabel: 'ГОРЯЧИЙ ЦЕХ И ПАНИРОВОЧНАЯ' },
  { id: 'hot_shop_bread_sound', label: 'Уровень шума', topic: 'Nevinnomisk/devices/wb-msw-v4_108/controls/Sound Level', unit: 'дБ', group: 'hot_shop_bread', groupLabel: 'ГОРЯЧИЙ ЦЕХ И ПАНИРОВОЧНАЯ' },

  { id: 'freezer_1_caps_ext_1', label: 'Внешний датчик 1', topic: 'Nevinnomisk/devices/wb-m1w2_35/controls/External Sensor 1', unit: '°C', group: 'freezer_1_caps', groupLabel: 'МОРОЗИЛЬНАЯ КАМЕРА 1' },
  { id: 'freezer_1_caps_ext_2', label: 'Внешний датчик 2', topic: 'Nevinnomisk/devices/wb-m1w2_35/controls/External Sensor 2', unit: '°C', group: 'freezer_1_caps', groupLabel: 'МОРОЗИЛЬНАЯ КАМЕРА 1' },
  { id: 'freezer_2_caps_ext_1', label: 'Внешний датчик 1', topic: 'Nevinnomisk/devices/wb-m1w2_63/controls/External Sensor 1', unit: '°C', group: 'freezer_2_caps', groupLabel: 'МОРОЗИЛЬНАЯ КАМЕРА 2' },
  { id: 'freezer_2_caps_ext_2', label: 'Внешний датчик 2', topic: 'Nevinnomisk/devices/wb-m1w2_63/controls/External Sensor 2', unit: '°C', group: 'freezer_2_caps', groupLabel: 'МОРОЗИЛЬНАЯ КАМЕРА 2' },
  { id: 'technical_boilers_ext_1', label: 'Внешний датчик 1', topic: 'Nevinnomisk/devices/wb-m1w2_69/controls/External Sensor 1', unit: '°C', group: 'technical_boilers', groupLabel: 'ТЕХНИЧЕСКОЕ ПОМЕЩЕНИЕ (БОЙЛЕРЫ)' },
  { id: 'technical_boilers_ext_2', label: 'Внешний датчик 2', topic: 'Nevinnomisk/devices/wb-m1w2_69/controls/External Sensor 2', unit: '°C', group: 'technical_boilers', groupLabel: 'ТЕХНИЧЕСКОЕ ПОМЕЩЕНИЕ (БОЙЛЕРЫ)' },

  { id: 'vent_panel_1_total_p', label: 'Суммарная активная мощность (кВт)', topic: 'Nevinnomisk/devices/wb-map3e_74/controls/Total P', unit: 'кВт', group: 'vent_panel_1', groupLabel: 'ЩИТ вентиляции 1-2' },
  { id: 'vent_panel_1_total_ap_energy', label: 'Полная энергия (кВт·ч)', topic: 'Nevinnomisk/devices/wb-map3e_74/controls/Total AP energy', unit: 'кВт·ч', group: 'vent_panel_1', groupLabel: 'ЩИТ вентиляции 1-2' },
  { id: 'vent_panel_1_urms_l1', label: 'Действующее напряжение фаз L1 (В)', topic: 'Nevinnomisk/devices/wb-map3e_74/controls/Urms L1', unit: 'В', group: 'vent_panel_1', groupLabel: 'ЩИТ вентиляции 1-2' },
  { id: 'vent_panel_1_urms_l2', label: 'Действующее напряжение фаз L2 (В)', topic: 'Nevinnomisk/devices/wb-map3e_74/controls/Urms L2', unit: 'В', group: 'vent_panel_1', groupLabel: 'ЩИТ вентиляции 1-2' },
  { id: 'vent_panel_1_urms_l3', label: 'Действующее напряжение фаз L3 (В)', topic: 'Nevinnomisk/devices/wb-map3e_74/controls/Urms L3', unit: 'В', group: 'vent_panel_1', groupLabel: 'ЩИТ вентиляции 1-2' },
  { id: 'vent_panel_1_irms_l1', label: 'Ток по фазам L1 (А)', topic: 'Nevinnomisk/devices/wb-map3e_74/controls/Irms L1', unit: 'А', group: 'vent_panel_1', groupLabel: 'ЩИТ вентиляции 1-2' },
  { id: 'vent_panel_1_irms_l2', label: 'Ток по фазам L2 (А)', topic: 'Nevinnomisk/devices/wb-map3e_74/controls/Irms L2', unit: 'А', group: 'vent_panel_1', groupLabel: 'ЩИТ вентиляции 1-2' },
  { id: 'vent_panel_1_irms_l3', label: 'Ток по фазам L3 (А)', topic: 'Nevinnomisk/devices/wb-map3e_74/controls/Irms L3', unit: 'А', group: 'vent_panel_1', groupLabel: 'ЩИТ вентиляции 1-2' },
  { id: 'vent_panel_1_p_l1', label: 'Активная мощность по фазам L1 (кВт)', topic: 'Nevinnomisk/devices/wb-map3e_74/controls/P L1', unit: 'кВт', group: 'vent_panel_1', groupLabel: 'ЩИТ вентиляции 1-2' },
  { id: 'vent_panel_1_p_l2', label: 'Активная мощность по фазам L2 (кВт)', topic: 'Nevinnomisk/devices/wb-map3e_74/controls/P L2', unit: 'кВт', group: 'vent_panel_1', groupLabel: 'ЩИТ вентиляции 1-2' },
  { id: 'vent_panel_1_p_l3', label: 'Активная мощность по фазам L3 (кВт)', topic: 'Nevinnomisk/devices/wb-map3e_74/controls/P L3', unit: 'кВт', group: 'vent_panel_1', groupLabel: 'ЩИТ вентиляции 1-2' },
  { id: 'vent_panel_1_frequency', label: 'Частота (Гц)', topic: 'Nevinnomisk/devices/wb-map3e_74/controls/Frequency', unit: 'Гц', group: 'vent_panel_1', groupLabel: 'ЩИТ вентиляции 1-2' },

  { id: 'weather_temp', label: 'Температура на улице', topic: 'Nevinnomisk/devices/weather_owm/controls/Температура', unit: '°C', group: 'weather', groupLabel: 'Погода' },
  { id: 'weather_humidity', label: 'Влажность на улице', topic: 'Nevinnomisk/devices/weather_owm/controls/Влажность', unit: '%', group: 'weather', groupLabel: 'Погода' },
  { id: 'weather_wind', label: 'Скорость ветра на улице', topic: 'Nevinnomisk/devices/weather_owm/controls/Ветер', unit: 'м/с', group: 'weather', groupLabel: 'Погода' },
]

const TOPIC_MAP = Object.fromEntries(TOPIC_DEFINITIONS.map(m => [m.topic, m]))

function isEnergyTopic (topic) {
  return /energy/i.test(topic)
}



function toIsoOrNull (date) {
  return date instanceof Date ? date.toISOString() : null
}

async function computeEnergySummary (topic, now = new Date()) {
  // Consumption today = latest value now - first value since local 00:00.
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const [firstRow, lastRow] = await Promise.all([
    pool.query(
      `SELECT value FROM ${FULL_TABLE}
       WHERE topic = $1 AND timestamp >= $2 AND timestamp <= $3
       ORDER BY timestamp ASC LIMIT 1`,
      [topic, startOfToday, now],
    ),
    pool.query(
      `SELECT value FROM ${FULL_TABLE}
       WHERE topic = $1 AND timestamp >= $2 AND timestamp <= $3
       ORDER BY timestamp DESC LIMIT 1`,
      [topic, startOfToday, now],
    ),
  ])

  const first = firstRow.rows[0]?.value != null ? parseFloat(firstRow.rows[0].value) : null
  const last = lastRow.rows[0]?.value != null ? parseFloat(lastRow.rows[0].value) : null

  let todayValue = null
  if (first !== null && last !== null && Number.isFinite(first) && Number.isFinite(last)) {
    const diff = last - first
    todayValue = diff < 0 ? 0 : Number(diff.toFixed(3))
  }

  logStage('ENERGY', `topic="${topic}" from=${toIsoOrNull(startOfToday)} to=${toIsoOrNull(now)} first=${first ?? 'null'} last=${last ?? 'null'} => ${todayValue ?? 'null'}`)

  return {
    today: {
      value: todayValue,
      from: toIsoOrNull(startOfToday),
      to: toIsoOrNull(now),
    },
  }
}

// ─────────────────────────────────────────────
// Runtime state
// ─────────────────────────────────────────────
/** @type {Record<string, {value: number, ts: number}>} */
const latest = {}

/**
 * Pending flush buffer – keyed by topic so only the latest value per topic is
 * kept within each flush window (identical dedup behaviour to Python backend).
 * @type {Record<string, {device:string, sensor:string, value:number, topic:string, timestamp:Date}>}
 */
const pendingFlush = {}

/** @type {Set<import('ws').WebSocket>} */
const wsClients = new Set()

/**
 * Topics that received a new MQTT value since the last broadcast tick.
 * Used by the 500ms broadcast loop to send only changed values.
 * @type {Map<string, {value:number, ts:number}>}
 */
const pendingBroadcast = new Map()

// ─────────────────────────────────────────────
// Database
// ─────────────────────────────────────────────
let pool       = null
let dbAvailable = false

async function dbConnect () {
  logStage('DB', `starting PostgreSQL connection to ${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'} / database ${DB_DATABASE}`)
  if (pool) {
    try { await pool.end() } catch {}
    pool = null
    dbAvailable = false
  }
  pool = new Pool({
    host:                    process.env.DB_HOST     ?? 'localhost',
    port:                    Number(process.env.DB_PORT ?? '5432'),
    database:                DB_DATABASE,
    user:                    process.env.DB_USER     ?? 'postgres',
    password:                process.env.DB_PASSWORD ?? 'root',
    max:                     20,
    idleTimeoutMillis:       30_000,
    connectionTimeoutMillis: 5_000,
  })
  logStage('DB', 'connection pool created')

  await pool.query('SELECT 1')
  logStage('DB', 'connection check passed (SELECT 1)')

  if (DB_AUTO_DDL) {
    try {
      await ensureSchema()
    } catch (err) {
      if (!isDbPermissionError(err)) throw err
      logWarn('DB', `DDL permission denied, continuing in insert-only mode without CREATE operations: ${err.message}`)
    }
  } else {
    logStage('DB', 'DB_AUTO_DDL=false, skipping CREATE schema/table/index and using existing objects only')
  }

  dbAvailable = true
  logStage('DB', 'connected to PostgreSQL')
}

async function ensureSchema () {
  logStage('DB', `ensuring schema ${DB_SCHEMA}`)
  const schemaExists = await pool.query(
    'SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = $1) AS exists',
    [DB_SCHEMA],
  )
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA_QUOTED}`)
  logStage('DB', schemaExists.rows[0]?.exists
    ? `schema ${DB_SCHEMA} already exists`
    : `schema ${DB_SCHEMA} created`)

  logStage('DB', `ensuring table ${DB_SCHEMA}.${DB_TABLE}`)
  const tableExists = await pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = $2
     ) AS exists`,
    [DB_SCHEMA, DB_TABLE],
  )
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${FULL_TABLE} (
      id        SERIAL PRIMARY KEY,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      device    VARCHAR(100),
      sensor    VARCHAR(200),
      value     NUMERIC(20, 6),
      topic     VARCHAR(500)
    )
  `)
  logStage('DB', tableExists.rows[0]?.exists
    ? `table ${DB_SCHEMA}.${DB_TABLE} already exists`
    : `table ${DB_SCHEMA}.${DB_TABLE} created`)

  logStage('DB', `ensuring index ${DB_TABLE}_topic_timestamp_idx on ${DB_SCHEMA}.${DB_TABLE}`)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS ${INDEX_QUOTED}
    ON ${FULL_TABLE} (topic, timestamp DESC)
  `)
  logStage('DB', 'database structure ready; no DELETE, TRUNCATE, UPDATE, or REPLACE operations are used by this backend')
}

async function loadLatestValues () {
  if (!pool || !dbAvailable) return
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (topic) topic, value, timestamp
      FROM ${FULL_TABLE}
      ORDER BY topic, timestamp DESC
    `)
    for (const row of rows) {
      latest[row.topic] = {
        value: row.value !== null ? parseFloat(row.value) : null,
        ts:    row.timestamp ? row.timestamp.getTime() / 1000 : null,
      }
    }
    logStage('DB', `pre-loaded ${rows.length} latest values from ${DB_SCHEMA}.${DB_TABLE}`)
  } catch (err) {
    logWarn('DB', `loadLatestValues failed: ${err.message}`)
  }
}

async function flushPending () {
  const entries = Object.values(pendingFlush)
  if (entries.length === 0) return
  if (!pool || !dbAvailable) {
    logWarn('DB', `flush skipped for ${DB_SCHEMA}.${DB_TABLE} - database not available`)
    return
  }

  // Clear before attempt – new MQTT data keeps accumulating even if this fails
  for (const key of Object.keys(pendingFlush)) delete pendingFlush[key]

  try {
    logStage('DB', `flush started for ${entries.length} pending rows into ${DB_SCHEMA}.${DB_TABLE}`)
    const params      = []
    const placeholders = entries.map((row, i) => {
      const b = i * 5
      params.push(row.device, row.sensor, row.value, row.topic, row.timestamp)
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`
    })
    await pool.query(
      `INSERT INTO ${FULL_TABLE} (device, sensor, value, topic, timestamp) VALUES ${placeholders.join(',')}`,
      params,
    )
    logStage('DB', `flush committed ${entries.length} rows into ${DB_SCHEMA}.${DB_TABLE} using INSERT only`)
  } catch (err) {
    logError('DB', `flush error on ${DB_SCHEMA}.${DB_TABLE}: ${err.message}`)
    dbAvailable = false
    // Restore rows so data is not lost on next flush
    for (const row of entries) pendingFlush[row.topic] = row
    logWarn('DB', `restored ${entries.length} pending rows in memory after failed insert; no data was deleted from PostgreSQL`)
  }
}

async function dbReconnectLoop () {
  while (true) {
    await sleep(DB_RECONNECT_MS)
    if (dbAvailable && pool) continue
    try {
      logStage('DB', 'attempting reconnect…')
      await dbConnect()
      await loadLatestValues()
    } catch (err) {
      logWarn('DB', `reconnect failed: ${err.message}`)
      dbAvailable = false
      if (pool) { try { await pool.end() } catch {} pool = null }
    }
  }
}

// ─────────────────────────────────────────────
// WebSocket broadcast (rarely used - see main broadcast loop below)
// ─────────────────────────────────────────────
function broadcast (payload) {
  const text = JSON.stringify(payload)
  for (const ws of wsClients) {
    if (ws.readyState === 1) { // 1 = OPEN
      try { ws.send(text) } catch { wsClients.delete(ws) }
    } else {
      wsClients.delete(ws)
    }
  }
}

// ─────────────────────────────────────────────
// MQTT
// ─────────────────────────────────────────────
const mqttClient = mqtt.connect(`mqtt://${MQTT_BROKER}:${MQTT_PORT}`, {
  clientId:       MQTT_CLIENT_ID,
  reconnectPeriod: 1000,
  keepalive:      60,
  clean:          true,
})

mqttClient.on('connect', () => {
  logStage('MQTT', `connected to ${MQTT_BROKER}:${MQTT_PORT}`)
  const uniqueTopics = [...new Set(TOPIC_DEFINITIONS.map(metric => metric.topic))]
  for (const topic of uniqueTopics) {
    mqttClient.subscribe(topic, { qos: 1 })
  }
  logStage('MQTT', `subscribed to ${uniqueTopics.length} unique topics (${TOPIC_DEFINITIONS.length} metric bindings)`)
})

mqttClient.on('error',     err => logError('MQTT', `error: ${err.message}`))
mqttClient.on('offline',   ()  => logWarn('MQTT', 'offline'))
mqttClient.on('reconnect', ()  => logStage('MQTT', 'reconnecting…'))

mqttClient.on('message', (topic, payloadBuf) => {
  const raw   = payloadBuf.toString('utf-8').trim()
  const value = parseFloat(raw)
  if (Number.isNaN(value)) return

  const parts  = topic.split('/')
  const device = parts[2] ?? 'unknown'
  const sensor = parts[4] ?? 'unknown'
  const now    = new Date()
  const ts     = now.getTime() / 1000

  // Update in-memory latest
  latest[topic] = { value, ts }

  // Queue for DB flush (dedup by topic – keeps latest value for this interval)
  pendingFlush[topic] = { device, sensor, value, topic, timestamp: now }

  // Mark as changed for the next broadcast tick (do NOT broadcast here –
  // MQTT fires ~700 msg/s and would instantly flood and drop browser WS connections)
  pendingBroadcast.set(topic, { value, ts })
})

// ─────────────────────────────────────────────
// HTTP routes
// ─────────────────────────────────────────────
const WINDOW_MS = {
  '1h':  1 * 60 * 60 * 1000,
  '6h':  6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d':  7  * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  '1y':  365 * 24 * 60 * 60 * 1000,
}

const app = express()

app.use(cors({
  origin:      CORS_ORIGINS,
  methods:     ['GET'],
  credentials: false,
}))

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'kfc-dashboard-backend' })
})

app.get('/api/metrics', (_req, res) => {
  res.json({
    broker:             MQTT_BROKER,
    database_connected: dbAvailable,
    metrics:            TOPIC_DEFINITIONS,
    values:             latest,
  })
})

app.get('/api/history', async (req, res) => {
  const { topic, window = '24h', limit = '1440' } = req.query

  if (!topic) {
    return res.status(400).json({ detail: 'topic is required' })
  }
  if (!WINDOW_MS[window]) {
    return res.status(400).json({ detail: 'Unsupported window value' })
  }
  if (!pool || !dbAvailable) {
    return res.status(503).json({ detail: 'History unavailable: database disconnected' })
  }

  const limitNum = Math.min(Math.max(parseInt(limit) || 1440, 1), 10_000)
  const endAt    = new Date()
  const startAt  = new Date(endAt.getTime() - WINDOW_MS[window])

  try {
    const { rows } = await pool.query(
      `SELECT timestamp, value
       FROM ${FULL_TABLE}
       WHERE topic = $1 AND timestamp BETWEEN $2 AND $3
       ORDER BY timestamp DESC
       LIMIT $4`,
      [topic, startAt, endAt, limitNum],
    )

    const points = rows.reverse().map(row => ({
      timestamp: row.timestamp ? row.timestamp.toISOString() : null,
      value:     row.value !== null ? parseFloat(row.value) : null,
    }))

    const energySummary = isEnergyTopic(topic)
      ? await computeEnergySummary(topic, endAt)
      : null

    res.json({ topic, metric: TOPIC_MAP[topic] ?? null, window, points, energySummary })
  } catch (err) {
    res.status(500).json({ detail: `History query failed: ${err.message}` })
  }
})

// ─────────────────────────────────────────────
// WebSocket server  (same path /ws as before)
// ─────────────────────────────────────────────
const httpServer = createServer(app)
const wss        = new WebSocketServer({ server: httpServer, path: '/ws' })

httpServer.on('error', (err) => {
  if (err?.code === 'EADDRINUSE') {
    logError('HTTP', `cannot bind ${API_HOST}:${API_PORT} because the address is already in use`)
    logError('HTTP', 'stop the previous backend process and retry')
  } else {
    logError('HTTP', `server error: ${err.message}`)
  }
  process.exit(1)
})

wss.on('error', (err) => {
  logError('WS', `websocket server error: ${err.message}`)
})

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress ?? 'unknown'
  console.log(`[WS] client connected (${clientIp}) – total: ${wsClients.size + 1}`)

  // Send bootstrap first, then register for real-time broadcasts
  try {
    ws.send(JSON.stringify({
      type:    'bootstrap',
      broker:  MQTT_BROKER,
      metrics: TOPIC_DEFINITIONS,
      values:  latest,
    }))
  } catch {
    console.warn(`[WS] bootstrap send failed for ${clientIp}`)
    return
  }

  wsClients.add(ws)

  ws.on('close', () => {
    wsClients.delete(ws)
    console.log(`[WS] client disconnected (${clientIp}) – total: ${wsClients.size}`)
  })
  ws.on('error', (err) => {
    wsClients.delete(ws)
    console.warn(`[WS] client error (${clientIp}): ${err.message}`)
  })
})

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─────────────────────────────────────────────
// Startup
// ─────────────────────────────────────────────
async function main () {
  logStage('BOOT', 'backend startup initiated')
  logStage('BOOT', `runtime target schema=${DB_SCHEMA} table=${DB_TABLE}`)
  logStage('BOOT', DB_AUTO_DDL
    ? 'persistence mode is append-only with optional auto-create (CREATE IF NOT EXISTS + INSERT), never deletes data'
    : 'persistence mode is append-only insert-only (no CREATE/DELETE/TRUNCATE/UPDATE/REPLACE)')

  // DB – non-fatal: realtime works even if DB is offline
  try {
    logStage('BOOT', 'starting database initialization')
    await dbConnect()
    await loadLatestValues()
  } catch (err) {
    logWarn('DB', `initial connection failed, will retry in background: ${err.message}`)
    dbAvailable = false
    if (pool) { try { await pool.end() } catch {} pool = null }
  }

  // Periodic flush  (same 60-second interval as Python backend)
  logStage('BOOT', `starting periodic flush timer every ${FLUSH_INTERVAL_MS / 1000} seconds`)
  setInterval(flushPending, FLUSH_INTERVAL_MS)

  // Broadcast tick – sends changed topics to all WS clients every 500ms.
  // Decoupled from MQTT (which can be very fast) to avoid flooding browser connections.
  logStage('BOOT', 'starting WebSocket broadcast timer every 500 ms')
  setInterval(() => {
    if (wsClients.size === 0 || pendingBroadcast.size === 0) return

    for (const [topic, { value, ts }] of pendingBroadcast) {
      const payload = { type: 'metric', topic, value, ts }
      const jsonStr = JSON.stringify(payload)

      for (const ws of wsClients) {
        if (ws.readyState === 1) { // 1 = OPEN
          try {
            ws.send(jsonStr)
          } catch (err) {
            console.error(`[WS] send error: ${err.message}`)
            wsClients.delete(ws)
          }
        } else {
          wsClients.delete(ws)
        }
      }
    }
    pendingBroadcast.clear()
  }, 500)

  // Background DB reconnect loop
  logStage('BOOT', `starting background DB reconnect loop every ${DB_RECONNECT_MS / 1000} seconds when disconnected`)
  dbReconnectLoop()

  httpServer.listen(API_PORT, API_HOST, () => {
    logStage('HTTP', `listening on http://${API_HOST}:${API_PORT}`)
    logStage('WS', `websocket at ws://${API_HOST}:${API_PORT}/ws`)
    logStage('BOOT', 'backend startup completed')
  })
}

main().catch(err => {
  logError('FATAL', err.stack ?? err.message)
  process.exit(1)
})
