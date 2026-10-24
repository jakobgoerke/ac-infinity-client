import axios, { type AxiosInstance } from 'axios';

import { ApiError, AuthenticationError } from './errors';
import type { Controller, DeviceModeSettings, DeviceModeSettingsChanges, DeviceSettings, DeviceSettingsChanges, User } from './types';
import {
  ControllerSchema,
  DeviceModeSettingsSchema,
  DeviceSettingsSchema,
  encodeDeviceModeSettings,
  encodeDeviceSettings,
  UserSchema,
} from './types';

export enum Url {
  AUTH = '/user/appUserLogin',
  GET_CONTROLLERS = '/user/devInfoListAll',
  GET_SHARED_CONTROLLERS = '/user/shareDevList',
  GET_CONTROLLER = '/dev/getDeviceInfo',
  GET_DEVICE_SETTINGS = '/dev/getDevSetting',
  SET_DEVICE_SETTINGS = '/dev/updateAdvSetting',
  GET_DEVICE_MODE_SETTINGS = '/dev/getdevModeSettingList',
  SET_DEVICE_MODE_SETTINGS = '/dev/addDevMode',
}

export interface Response<T> {
  code: number;
  msg?: string;
  data: T;
}

export interface AuthParams {
  email: string;
  password: string;
}

export interface ControllerParams {
  controllerId: string;
}

export interface GetDeviceParams extends ControllerParams {
  /** 0 addresses the controller itself, 1..n the devices plugged into its ports */
  port: number;
}

export interface SetDeviceModeSettingsParams extends GetDeviceParams {
  settings: DeviceModeSettingsChanges;
}

export interface SetDeviceSettingsParams extends GetDeviceParams {
  settings: DeviceSettingsChanges;
}

type Payload = Record<string, unknown>;

// fahrenheit values below freezing are raised to 32 before sending mode settings
const FAHRENHEIT_FIELDS = ['devHtf', 'devLtf', 'targetTempF', 'waterTempHighValueF', 'waterTempLowValueF', 'waterTempTargetValueF'];

// only send flat values: nested objects and empty fields are left out
const toFormPayload = (values: Payload): Payload =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value !== null && value !== undefined && typeof value !== 'object'));

const clampFahrenheit = (payload: Payload): Payload => {
  for (const field of FAHRENHEIT_FIELDS) {
    const value = payload[field];
    if (typeof value === 'number' && value < 32) {
      payload[field] = 32;
    }
  }
  return payload;
};

class AcInfinityClient {
  constructor(args: AuthParams) {
    const { email, password } = args;

    this.email = email;
    this.password = password;

    this.token = '';

    this.api = axios.create({
      timeout: 5000,
      baseURL: 'http://www.acinfinityserver.com/api',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      },
    });
  }

  private api: AxiosInstance;
  private token: string;
  private email: string;
  private password: string;

  public async authenticate(): Promise<User> {
    const response = await this.api.post<Response<unknown>>(Url.AUTH, {
      appEmail: this.email,
      appPasswordl: this.password,
    });

    if (response.data.code !== 200) {
      throw new AuthenticationError();
    }

    const user = UserSchema.parse(response.data.data);
    this.token = user.id;
    this.api.defaults.headers.common.token = user.id;

    return user;
  }

  private async request<T = unknown>(url: Url, params: Payload): Promise<T> {
    const response = await this.api.post<Response<T>>(url, params);

    if (response.data.code !== 200) {
      throw new ApiError(response.data.code, response.data.msg);
    }

    return response.data.data;
  }

  public async getControllers(): Promise<Controller[]> {
    const controllers = await this.request<unknown[]>(Url.GET_CONTROLLERS, {
      userId: this.token,
    });

    return controllers.map((device) => ControllerSchema.parse(device));
  }

  public async getSharedControllers(): Promise<Controller[]> {
    const controllers = await this.request<unknown[]>(Url.GET_SHARED_CONTROLLERS, {
      userId: this.token,
    });

    return controllers.map((device) => ControllerSchema.parse(device));
  }

  public async getController({ controllerId }: ControllerParams): Promise<Controller> {
    const controller = await this.request(Url.GET_CONTROLLER, {
      devId: controllerId,
    });

    return ControllerSchema.parse(controller);
  }

  public async getDeviceSettings({ controllerId, port }: GetDeviceParams): Promise<DeviceSettings> {
    const settings = await this.request(Url.GET_DEVICE_SETTINGS, {
      devId: controllerId,
      port,
    });

    return DeviceSettingsSchema.parse(settings);
  }

  public async setDeviceSettings({ controllerId, port, settings }: SetDeviceSettingsParams): Promise<void> {
    const vendorChanges = encodeDeviceSettings(settings);

    const currentSettings = await this.request<Payload>(Url.GET_DEVICE_SETTINGS, {
      devId: controllerId,
      port,
    });

    // the name is required, but often not stored in the settings themselves
    const devName = vendorChanges.devName ?? currentSettings.devName ?? (await this.getDeviceName({ controllerId, port }));

    const payload = toFormPayload({ ...currentSettings, ...vendorChanges, devName });
    await this.request(Url.SET_DEVICE_SETTINGS, payload);
  }

  private async getDeviceName({ controllerId, port }: GetDeviceParams): Promise<string | undefined> {
    const controller = await this.getController({ controllerId });

    return port === 0 ? controller.name : controller.deviceInfo.ports.find((p) => p.port === port)?.deviceName;
  }

  public async getDeviceModeSettings({ controllerId, port }: GetDeviceParams): Promise<DeviceModeSettings> {
    const settings = await this.request(Url.GET_DEVICE_MODE_SETTINGS, {
      devId: controllerId,
      port,
    });

    return DeviceModeSettingsSchema.parse(settings);
  }

  public async setDeviceModeSettings({ controllerId, port, settings }: SetDeviceModeSettingsParams): Promise<void> {
    const vendorChanges = encodeDeviceModeSettings(settings);

    const currentSettings = await this.request<Payload>(Url.GET_DEVICE_MODE_SETTINGS, {
      devId: controllerId,
      port,
    });

    const payload = clampFahrenheit(toFormPayload({ ...currentSettings, ...vendorChanges, onlyUpdateSpeed: 0 }));
    await this.request(Url.SET_DEVICE_MODE_SETTINGS, payload);
  }

  static async build(args: AuthParams) {
    const instance = new AcInfinityClient(args);
    await instance.authenticate();
    return instance;
  }
}

export type { Controller, DeviceModeSettings, DeviceModeSettingsChanges, DeviceSettings, DeviceSettingsChanges, User };
export { AcInfinityClient };
