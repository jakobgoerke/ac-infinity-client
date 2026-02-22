import { z } from 'zod';

import { DeviceMode, DeviceType } from './Device';

export enum ControllerDeviceType {
  UIS_CONTROLLER_69_PRO = 11,
  UIS_CONTROLLER_69_PRO_PLUS = 10,
}

export const ControllerPortSchema = z
  .object({
    speak: z.number(),
    port: z.number().positive(),
    curMode: z.enum(DeviceMode),
    loadType: z.enum(DeviceType),
    portName: z.string(),
  })
  .transform((v) => ({
    port: v.port,
    currentLevel: v.speak,
    currentMode: v.curMode,
    deviceType: v.loadType,
    deviceName: v.portName,
  }));

export const ControllerDeviceInfoSchema = z
  .object({
    temperature: z.number(),
    humidity: z.number(),
    vpdnums: z.number(),
    ports: z.array(ControllerPortSchema),
  })
  .transform((v) => ({
    temperature: v.temperature / 100,
    humidity: v.humidity / 100,
    vpd: v.vpdnums / 100,
    ports: v.ports,
  }));

export const ControllerSchema = z
  .object({
    devId: z.string(),
    devCode: z.string(),
    devName: z.string(),
    devType: z.enum(ControllerDeviceType),
    devPortCount: z.number().positive(),
    devVersion: z.number(),
    online: z.coerce.boolean(),
    firmwareVersion: z.string(),
    hardwareVersion: z.string(),
    deviceInfo: ControllerDeviceInfoSchema,
  })
  .transform(({ devId, devCode, devName, devType, devPortCount, devVersion, ...rest }) => ({
    id: devId,
    code: devCode,
    name: devName,
    type: devType,
    totalPorts: devPortCount,
    version: devVersion,
    ...rest,
  }));

export type ControllerPort = z.infer<typeof ControllerPortSchema>;
export type ControllerDeviceInfo = z.infer<typeof ControllerDeviceInfoSchema>;
export type Controller = z.infer<typeof ControllerSchema>;
