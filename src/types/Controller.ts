import { z } from 'zod';

import { DeviceMode, DeviceType } from './Device';

export enum ControllerDeviceType {
  CONTROLLER_67 = 1,
  CONTROLLER_69 = 7,
  CONTROLLER_69_WIFI = 8,
  UIS_CONTROLLER_69_PRO = 11,
  UIS_CONTROLLER_69_PRO_PLUS = 18,
  UIS_CONTROLLER_AI_PLUS = 20,
}

// these controllers report pumps as PUMP instead of WATER_PUMP
const PUMP_CONTROLLERS = [ControllerDeviceType.UIS_CONTROLLER_69_PRO, ControllerDeviceType.UIS_CONTROLLER_69_PRO_PLUS];

export enum SensorType {
  TEMPERATURE_F = 0,
  TEMPERATURE_C = 1,
  HUMIDITY = 2,
  VPD = 3,
  ZONE_TEMPERATURE_F = 4,
  ZONE_TEMPERATURE_C = 5,
  ZONE_HUMIDITY = 6,
  ZONE_VPD = 7,
  LEAF_TEMPERATURE_F = 8,
  LEAF_TEMPERATURE_C = 9,
  SOIL_MOISTURE = 10,
  CO2 = 11,
  LIGHT = 12,
  PH = 13,
  EC_US = 14,
  EC_MS = 15,
  TDS_PPM = 16,
  TDS_PPT = 17,
  WATER_TEMPERATURE_F = 18,
  WATER_TEMPERATURE_C = 19,
  WATER_LEVEL = 20,
}

// outlet ports report their device type with this bit set
const OUTLET_FLAG = 0x80;

// ports without an assigned device type are recognized by the id resistor in the plug, in ohms
const RESISTANCE_RANGES: [min: number, max: number, type: DeviceType][] = [
  [380, 420, DeviceType.GROW_LIGHT],
  [3135, 3465, DeviceType.GROW_LIGHT],
  [4845, 10500, DeviceType.FAN],
  [10501, 12600, DeviceType.HUMIDIFIER],
  [12601, 14385, DeviceType.DEHUMIDIFIER],
  [16591, 18900, DeviceType.HEATER],
  [18901, 21525, DeviceType.AIR_CONDITION],
  [35100, 42900, DeviceType.DEHUMIDIFIER],
];
const PUMP_RESISTANCE_RANGE = [1350, 1650];

const deviceTypeByResistance = (resistance: number | null, controllerType: ControllerDeviceType): DeviceType => {
  if (resistance === null) {
    return DeviceType.NONE;
  }

  const ohms = resistance < 0 ? resistance & 0xffff : resistance;

  const [pumpMin, pumpMax] = PUMP_RESISTANCE_RANGE;
  if (ohms >= pumpMin && ohms <= pumpMax) {
    return PUMP_CONTROLLERS.includes(controllerType) ? DeviceType.PUMP : DeviceType.WATER_PUMP;
  }

  return RESISTANCE_RANGES.find(([min, max]) => ohms >= min && ohms <= max)?.[2] ?? DeviceType.NONE;
};

// the vendor reports this value for a sensor that has no reading
const SENSOR_NO_DATA = -32768;

const decodeSensorValue = (data: number, precision: number) => {
  if (data === SENSOR_NO_DATA) {
    return null;
  }

  switch (precision) {
    case 0:
      return data * 10;
    case 2:
      return data / 10;
    case 3:
      return data / 100;
    default:
      return data;
  }
};

export const ControllerSensorSchema = z
  .object({
    accessPort: z.number(),
    sensorType: z.number(),
    sensorPrecision: z.number(),
    sensorData: z.number(),
  })
  .transform((v) => ({
    port: v.accessPort,
    type: v.sensorType as SensorType,
    value: decodeSensorValue(v.sensorData, v.sensorPrecision),
  }));

export const ControllerPortSchema = z
  .object({
    speak: z.number(),
    port: z.number().positive(),
    curMode: z.enum(DeviceMode),
    loadType: z.number(),
    portName: z.string(),
    portResistance: z.number().nullish(),
    online: z.coerce.boolean(),
    remainTime: z.number().nullish(),
  })
  .transform((v) => ({
    port: v.port,
    currentLevel: v.speak,
    currentMode: v.curMode,
    /** NONE when no type is assigned, the controller schema then recognizes it by resistance */
    deviceType: (v.loadType & ~OUTLET_FLAG) as DeviceType,
    deviceName: v.portName,
    /** id resistor of the plugged in device, in ohms */
    resistance: v.portResistance ?? null,
    online: v.online,
    /** seconds left until the current timer, cycle or schedule step switches */
    remainingTime: v.remainTime ?? null,
  }));

export const ControllerDeviceInfoSchema = z
  .object({
    temperature: z.number(),
    temperatureF: z.number().nullish(),
    humidity: z.number(),
    vpdnums: z.number(),
    ports: z.array(ControllerPortSchema),
    sensors: z.array(ControllerSensorSchema).nullish(),
  })
  .transform((v) => ({
    temperature: v.temperature / 100,
    temperatureF: v.temperatureF == null ? null : v.temperatureF / 100,
    humidity: v.humidity / 100,
    vpd: v.vpdnums / 100,
    ports: v.ports,
    sensors: v.sensors ?? [],
  }));

export const ControllerSchema = z
  .object({
    devId: z.string(),
    devCode: z.string(),
    devName: z.string(),
    devType: z.enum(ControllerDeviceType),
    devPortCount: z.number().positive(),
    devVersion: z.number(),
    devMacAddr: z.string().nullish(),
    zoneId: z.string().nullish(),
    wifiName: z.string().nullish(),
    online: z.coerce.boolean(),
    firmwareVersion: z.string(),
    hardwareVersion: z.string(),
    deviceInfo: ControllerDeviceInfoSchema,
  })
  .transform(({ devId, devCode, devName, devType, devPortCount, devVersion, devMacAddr, zoneId, wifiName, deviceInfo, ...rest }) => ({
    id: devId,
    code: devCode,
    name: devName,
    type: devType,
    totalPorts: devPortCount,
    version: devVersion,
    macAddress: devMacAddr ?? null,
    timeZone: zoneId ?? null,
    wifiName: wifiName ?? null,
    deviceInfo: {
      ...deviceInfo,
      ports: deviceInfo.ports.map((port) => ({
        ...port,
        deviceType: port.deviceType || deviceTypeByResistance(port.resistance, devType),
      })),
    },
    ...rest,
  }));

export type ControllerSensor = z.infer<typeof ControllerSensorSchema>;
export type ControllerPort = z.infer<typeof ControllerPortSchema>;
export type ControllerDeviceInfo = z.infer<typeof ControllerDeviceInfoSchema>;
export type Controller = z.infer<typeof ControllerSchema>;
