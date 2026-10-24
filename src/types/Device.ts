import { z } from 'zod';

export enum DeviceType {
  NONE = 0,
  GROW_LIGHT = 1,
  HUMIDIFIER = 2,
  DEHUMIDIFIER = 3,
  HEATER = 4,
  AIR_CONDITION = 5,
  FAN = 6,
  PUMP = 8,
  WATER_PUMP = 9,
  CO2_GENERATOR = 10,
  WATER_COOLER = 13,
  WATER_HEATER = 14,
}

export enum DeviceMode {
  OFF = 1,
  ON = 2,
  AUTO = 3,
  TIMER_TO_ON = 4,
  TIMER_TO_OFF = 5,
  CYCLE = 6,
  SCHEDULE = 7,
  VPD = 8,
}

export enum TemperatureUnit {
  FAHRENHEIT = 0,
  CELSIUS = 1,
}

// the vendor uses this value for a schedule boundary that is not set
const SCHEDULE_DISABLED = 65535;

const celsiusToFahrenheit = (celsius: number) => Math.round((celsius * 9) / 5 + 32);
const fahrenheitToCelsius = (fahrenheit: number) => Math.round(((fahrenheit - 32) * 5) / 9);

const decodeScheduleTime = (minutes: number) => (minutes === SCHEDULE_DISABLED ? null : minutes);
const encodeScheduleTime = (minutes: number | null | undefined) => (minutes === null ? SCHEDULE_DISABLED : minutes);

const encodeFlag = (value: boolean | undefined) => (value === undefined ? undefined : Number(value));

const encodeTemperature = (value: { celsius?: number; fahrenheit?: number } | undefined) => {
  if (value?.celsius !== undefined) {
    return { celsius: value.celsius, fahrenheit: celsiusToFahrenheit(value.celsius) };
  }
  if (value?.fahrenheit !== undefined) {
    return { celsius: fahrenheitToCelsius(value.fahrenheit), fahrenheit: value.fahrenheit };
  }
  return { celsius: undefined, fahrenheit: undefined };
};

const compact = <T extends object>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as { [K in keyof T]?: Exclude<T[K], undefined> };

const DeviceBaseInputSchema = z.object({
  devId: z.string(),
  devMacAddr: z.string().nullable(),
  externalPort: z.number(),
  offSpead: z.number().min(0).max(10),
  onSpead: z.number().min(0).max(10),
  onSelfSpead: z.number(),
  ecUnit: z.number(),
  tdsUnit: z.number(),
  settingMode: z.number(),
  vpdSettingMode: z.number(),
  atType: z.enum(DeviceMode),
});

type DeviceBaseInput = z.input<typeof DeviceBaseInputSchema>;

const transformDeviceBase = ({ devId, externalPort, offSpead, onSpead, atType }: DeviceBaseInput) => ({
  id: devId,
  port: externalPort,
  levelWhileOff: offSpead,
  levelWhileOn: onSpead,
  mode: atType,
});

export const DeviceSettingsSchema = DeviceBaseInputSchema.extend({
  setId: z.string().nullable(),
  port: z.number(),
  devName: z.string().nullable(),
  devLight: z.number(),
  hasBacklightSwitch: z.number(),
  backlightSwitch: z.number(),
  hasKeytoneSwitch: z.number(),
  keytoneSwitch: z.number(),
  devCth: z.number(),
  devCt: z.number(),
  devCth2: z.number().nullable(),
  devCt2: z.number().nullable(),
  devCh: z.number(),
  devTt: z.number(),
  devTh: z.number(),
  devCompany: z.enum(TemperatureUnit),
  devTth: z.number(),
  vpdCth: z.number(),
  vpdCt: z.number(),
  vpdTransition: z.number(),
  portResistance: z.number().nullable(),
  devBth: z.number(),
  devBt: z.number(),
  devBh: z.number(),
  devBvpd: z.number(),
  isFlag: z.number(),
  devTimeZone: z.string().nullable(),
  loadType: z.number(),
  tempCompare: z.number(),
  humiCompare: z.number(),
  onTimeSwitch: z.number(),
  onTime: z.number(),
  sensorSettingStr: z.string().nullable(),
  sensorSetting: z.unknown().nullable(),
  sensorTransBuffStr: z.string().nullable(),
  sensorTransBuff: z.unknown().nullable(),
  portParamData: z.string().nullable(),
  photocellSwitch: z.number(),
  isOpenDoseTime: z.number(),
  onDoseTime: z.number(),
  offDoseTime: z.number(),
  isOnMinMaxTime: z.number(),
  onMinTime: z.number(),
  onMaxTime: z.number(),
  ecOrTds: z.number(),
  interchangeSensor: z.number(),
  subDeviceId: z.string().nullable(),
  subDeviceVersion: z.string().nullable(),
  subDeviceType: z.number().nullable(),
  supportOta: z.unknown().nullable(),
  otaUpdating: z.unknown().nullable(),
  secFucStatus: z.number(),
  secFucDevtype: z.number(),
  secFucDevEffect: z.number(),
  secFucParamNums: z.number(),
  secFucParams: z.unknown().nullable(),
  secFucReportTime: z.number(),
  toward: z.unknown().nullable(),
  powerState: z.unknown().nullable(),
  updateAllPort: z.boolean(),
  timestamp: z.unknown().nullable(),
  calibrationTime: z.unknown().nullable(),
  fieldSet: z.array(z.unknown()),
  plantCode: z.number(),
  potSize: z.number(),
  plantingNum: z.number(),
  devCl: z.unknown().nullable(),
  devCsm1: z.unknown().nullable(),
  devCsm2: z.unknown().nullable(),
  devCsm3: z.unknown().nullable(),
  devCsm4: z.unknown().nullable(),
  uuidSta: z.number(),
  uuidType: z.unknown().nullable(),
  uuid: z.string().nullable(),
  matterCode: z.string().nullable(),
  matterSta: z.unknown().nullable(),
}).transform((v) => ({
  ...transformDeviceBase(v),
  name: v.devName,
  temperatureUnit: v.devCompany,
  brightness: v.devLight,
  backlight: v.backlightSwitch !== 0,
  calibration: {
    temperatureC: v.devCt,
    temperatureF: v.devCth,
    humidity: v.devCh,
    leafTemperatureC: v.vpdCt,
    leafTemperatureF: v.vpdCth,
  },
  transition: {
    temperatureC: v.devTt,
    temperatureF: v.devTth,
    humidity: v.devTh,
    vpd: v.vpdTransition,
  },
  buffer: {
    enabled: v.isFlag !== 0,
    temperatureC: v.devBt,
    temperatureF: v.devBth,
    humidity: v.devBh,
    vpd: v.devBvpd,
  },
}));

export const DeviceModeSettingsSchema = DeviceBaseInputSchema.extend({
  acitveTimerOff: z.number(),
  acitveTimerOn: z.number(),
  activeCycleOff: z.number(),
  activeCycleOn: z.number(),
  activeHh: z.number(),
  activeHt: z.number(),
  activeHtVpd: z.number(),
  activeHtVpdNums: z.number(),
  activeLh: z.number(),
  activeLt: z.number(),
  activeLtVpd: z.number(),
  activeLtVpdNums: z.number(),
  co2FanHighSwitch: z.number(),
  co2FanHighValue: z.number(),
  co2LowSwitch: z.number(),
  co2LowValue: z.number(),
  devHh: z.number(),
  devHt: z.number(),
  devHtf: z.number(),
  devLh: z.number(),
  devLt: z.number(),
  devLtf: z.number(),
  ecTdsLowSwitchEc: z.number(),
  ecTdsLowSwitchTds: z.number(),
  ecTdsLowValueEcUs: z.number(),
  ecTdsLowValueTdsPpm: z.number(),
  isOpenAutomation: z.number(),
  modeType: z.number(),
  moistureLowSwitch: z.number(),
  moistureLowValue: z.number(),
  onlyUpdateSpeed: z.number(),
  phHighSwitch: z.number(),
  phHighValue: z.number(),
  phLowSwitch: z.number(),
  phLowValue: z.number(),
  schedEndtTime: z.number(),
  schedStartTime: z.number(),
  surplus: z.number().nullable(),
  targetHumi: z.number(),
  targetHumiSwitch: z.number(),
  targetTSwitch: z.number(),
  targetTemp: z.number(),
  targetTempF: z.number(),
  targetVpd: z.number(),
  targetVpdSwitch: z.number(),
  waterLevelLowSwitch: z.number(),
  waterTempHighSwitch: z.number(),
  waterTempHighValue: z.number(),
  waterTempHighValueF: z.number(),
  waterTempLowSwitch: z.number(),
  waterTempLowValue: z.number(),
  waterTempLowValueF: z.number(),
}).transform((v) => ({
  ...transformDeviceBase(v),
  /** seconds left until the current timer, cycle or schedule step switches */
  remainingTime: v.surplus,
  /** durations in seconds */
  timer: {
    toOn: v.acitveTimerOn,
    toOff: v.acitveTimerOff,
  },
  /** durations in seconds */
  cycle: {
    on: v.activeCycleOn,
    off: v.activeCycleOff,
  },
  /** minutes after midnight, null when not set */
  schedule: {
    start: decodeScheduleTime(v.schedStartTime),
    end: decodeScheduleTime(v.schedEndtTime),
  },
  auto: {
    targetMode: v.settingMode !== 0,
    highTemperature: { enabled: v.activeHt !== 0, celsius: v.devHt, fahrenheit: v.devHtf },
    lowTemperature: { enabled: v.activeLt !== 0, celsius: v.devLt, fahrenheit: v.devLtf },
    highHumidity: { enabled: v.activeHh !== 0, value: v.devHh },
    lowHumidity: { enabled: v.activeLh !== 0, value: v.devLh },
    targetTemperature: { enabled: v.targetTSwitch !== 0, celsius: v.targetTemp, fahrenheit: v.targetTempF },
    targetHumidity: { enabled: v.targetHumiSwitch !== 0, value: v.targetHumi },
  },
  /** values in kPa */
  vpd: {
    targetMode: v.vpdSettingMode !== 0,
    high: { enabled: v.activeHtVpd !== 0, value: v.activeHtVpdNums / 10 },
    low: { enabled: v.activeLtVpd !== 0, value: v.activeLtVpdNums / 10 },
    target: { enabled: v.targetVpdSwitch !== 0, value: v.targetVpd / 10 },
  },
}));

export type DeviceSettings = z.infer<typeof DeviceSettingsSchema>;
export type DeviceSettingsInput = z.input<typeof DeviceSettingsSchema>;
export type DeviceModeSettings = z.infer<typeof DeviceModeSettingsSchema>;
export type DeviceModeSettingsInput = z.input<typeof DeviceModeSettingsSchema>;

const LevelSchema = z.number().int().min(0).max(10);
const DurationSchema = z.number().int().nonnegative();
const ScheduleTimeSchema = z.number().int().min(0).max(1439).nullable();

const TemperatureTriggerChangesSchema = z
  .object({
    enabled: z.boolean(),
    celsius: z.number().int().min(0).max(90),
    fahrenheit: z.number().int().min(32).max(194),
  })
  .partial()
  .refine((v) => v.celsius === undefined || v.fahrenheit === undefined, { message: 'Provide either celsius or fahrenheit, not both' });

const HumidityTriggerChangesSchema = z
  .object({
    enabled: z.boolean(),
    value: z.number().int().min(0).max(100),
  })
  .partial();

const VpdTriggerChangesSchema = z
  .object({
    enabled: z.boolean(),
    value: z.number().min(0).max(9.9),
  })
  .partial();

export const DeviceModeSettingsChangesSchema = z
  .object({
    mode: z.enum(DeviceMode),
    levelWhileOn: LevelSchema,
    levelWhileOff: LevelSchema,
    timer: z.object({ toOn: DurationSchema, toOff: DurationSchema }).partial(),
    cycle: z.object({ on: DurationSchema, off: DurationSchema }).partial(),
    schedule: z.object({ start: ScheduleTimeSchema, end: ScheduleTimeSchema }).partial(),
    auto: z
      .object({
        targetMode: z.boolean(),
        highTemperature: TemperatureTriggerChangesSchema,
        lowTemperature: TemperatureTriggerChangesSchema,
        highHumidity: HumidityTriggerChangesSchema,
        lowHumidity: HumidityTriggerChangesSchema,
        targetTemperature: TemperatureTriggerChangesSchema,
        targetHumidity: HumidityTriggerChangesSchema,
      })
      .partial(),
    vpd: z
      .object({
        targetMode: z.boolean(),
        high: VpdTriggerChangesSchema,
        low: VpdTriggerChangesSchema,
        target: VpdTriggerChangesSchema,
      })
      .partial(),
  })
  .partial()
  .transform(({ mode, levelWhileOn, levelWhileOff, timer, cycle, schedule, auto, vpd }): Partial<DeviceModeSettingsInput> => {
    const highTemperature = encodeTemperature(auto?.highTemperature);
    const lowTemperature = encodeTemperature(auto?.lowTemperature);
    const targetTemperature = encodeTemperature(auto?.targetTemperature);
    const encodeVpd = (value: number | undefined) => (value === undefined ? undefined : Math.round(value * 10));

    return compact({
      atType: mode,
      onSpead: levelWhileOn,
      offSpead: levelWhileOff,
      acitveTimerOn: timer?.toOn,
      acitveTimerOff: timer?.toOff,
      activeCycleOn: cycle?.on,
      activeCycleOff: cycle?.off,
      schedStartTime: encodeScheduleTime(schedule?.start),
      schedEndtTime: encodeScheduleTime(schedule?.end),
      settingMode: encodeFlag(auto?.targetMode),
      activeHt: encodeFlag(auto?.highTemperature?.enabled),
      devHt: highTemperature.celsius,
      devHtf: highTemperature.fahrenheit,
      activeLt: encodeFlag(auto?.lowTemperature?.enabled),
      devLt: lowTemperature.celsius,
      devLtf: lowTemperature.fahrenheit,
      activeHh: encodeFlag(auto?.highHumidity?.enabled),
      devHh: auto?.highHumidity?.value,
      activeLh: encodeFlag(auto?.lowHumidity?.enabled),
      devLh: auto?.lowHumidity?.value,
      targetTSwitch: encodeFlag(auto?.targetTemperature?.enabled),
      targetTemp: targetTemperature.celsius,
      targetTempF: targetTemperature.fahrenheit,
      targetHumiSwitch: encodeFlag(auto?.targetHumidity?.enabled),
      targetHumi: auto?.targetHumidity?.value,
      vpdSettingMode: encodeFlag(vpd?.targetMode),
      activeHtVpd: encodeFlag(vpd?.high?.enabled),
      activeHtVpdNums: encodeVpd(vpd?.high?.value),
      activeLtVpd: encodeFlag(vpd?.low?.enabled),
      activeLtVpdNums: encodeVpd(vpd?.low?.value),
      targetVpdSwitch: encodeFlag(vpd?.target?.enabled),
      targetVpd: encodeVpd(vpd?.target?.value),
    });
  });

export const DeviceSettingsChangesSchema = z
  .object({
    name: z.string().min(1),
    temperatureUnit: z.enum(TemperatureUnit),
    brightness: z.number().int().nonnegative(),
    backlight: z.boolean(),
    calibration: z
      .object({
        temperatureC: z.number().int(),
        temperatureF: z.number().int(),
        humidity: z.number().int(),
      })
      .partial()
      .refine((v) => v.temperatureC === undefined || v.temperatureF === undefined, {
        message: 'Provide either temperatureC or temperatureF, not both',
      }),
  })
  .partial()
  .transform(({ name, temperatureUnit, brightness, backlight, calibration }): Partial<DeviceSettingsInput> => {
    // the fahrenheit calibration is kept at twice the celsius one
    const calibrationC = calibration?.temperatureF !== undefined ? Math.trunc(calibration.temperatureF / 2) : calibration?.temperatureC;
    const calibrationF = calibration?.temperatureC !== undefined ? calibration.temperatureC * 2 : calibration?.temperatureF;

    return compact({
      devName: name,
      devCompany: temperatureUnit,
      devLight: brightness,
      backlightSwitch: encodeFlag(backlight),
      devCt: calibrationC,
      devCth: calibrationF,
      devCh: calibration?.humidity,
    });
  });

export type DeviceModeSettingsChanges = z.input<typeof DeviceModeSettingsChangesSchema>;
export type DeviceSettingsChanges = z.input<typeof DeviceSettingsChangesSchema>;

export function encodeDeviceModeSettings(settings: DeviceModeSettingsChanges): Partial<DeviceModeSettingsInput> {
  return DeviceModeSettingsChangesSchema.parse(settings);
}

export function encodeDeviceSettings(settings: DeviceSettingsChanges): Partial<DeviceSettingsInput> {
  return DeviceSettingsChangesSchema.parse(settings);
}
