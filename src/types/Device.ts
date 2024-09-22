import { z } from 'zod';

export enum DeviceType {
  'GROW_LIGHT' = 1,
  'HUMIDIFIER' = 2,
  'DEHUMIDIFIER' = 3,
  'HEATER' = 4,
  'AIR_CONDITION' = 5,
  'FAN' = 6,
}

export enum DeviceMode {
  'OFF' = 1,
  'ON' = 2,
  'AUTO' = 3,
  'TIMER_TO_ON' = 4,
  'TIMER_TO_OFF' = 5,
  'CYCLE' = 6,
  'SCHEDULE' = 7,
  'VPD' = 8,
}

export const DeviceSettingsSchema = z.object({});
export type DeviceSettings = z.infer<typeof DeviceSettingsSchema>;

export const DeviceModeSettingsSchema = z.object({});
export type DeviceModeSettings = z.infer<typeof DeviceModeSettingsSchema>;
