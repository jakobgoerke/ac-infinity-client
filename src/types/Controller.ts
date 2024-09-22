import { z } from 'zod';
import { DeviceMode, DeviceType } from './Device';

enum ControllerDeviceType {
  UIS_CONTROLLER_69_PRO = 11,
  UIS_CONTROLLER_69_PRO_PLUS = 10,
}

export const ControllerPortSchema = z.object({
  loadType: z.nativeEnum(DeviceType),
  curMode: z.nativeEnum(DeviceMode),
  port: z.number().positive(),
  speak: z.number(),
  portName: z.string(),
});
export type ControllerPort = z.infer<typeof ControllerPortSchema>;

export const ControllerDeviceInfoSchema = z.object({
  temperature: z.number(),
  humidity: z.number(),
  ports: z.array(ControllerPortSchema),
  vpdnums: z.number(),
});
export type ControllerDeviceInfo = z.infer<typeof ControllerDeviceInfoSchema>;

export const ControllerSchema = z.object({
  devId: z.string(),
  devCode: z.string(),
  devName: z.string(),
  devType: z.nativeEnum(ControllerDeviceType),
  devPortCount: z.number().positive(),
  devVersion: z.number(),
  online: z.boolean(),
  firmwareVersion: z.string(),
  hardwareVersion: z.string(),
  deviceInfo: ControllerDeviceInfoSchema,
});
export type Controller = z.infer<typeof ControllerSchema>;
