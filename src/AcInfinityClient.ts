import axios, { type AxiosInstance } from 'axios';

import {
  Controller,
  ControllerSchema,
  User,
  UserSchema,
  DeviceModeSettingsSchema,
  DeviceModeSettings,
  DeviceSettings,
  DeviceSettingsSchema,
} from './types';

export enum Url {
  AUTH = '/user/appUserLogin',
  CONTROLLERS = '/user/devInfoListAll',
  DEVICE_SETTINGS = '/dev/getDevSetting',
  DEVICE_MODE_SETTINGS = '/dev/getdevModeSettingList',
}

export interface Response<T> {
  code: number;
  data: T;
}

export interface AuthParams {
  email: string;
  password: string;
}

interface GetDeviceParams {
  deviceId: string;
  port: number;
}

class AcInfinityClientInstance {
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
    const response = await this.api.post<Response<User>>(Url.AUTH, {
      appEmail: this.email,
      appPasswordl: this.password,
    });

    const user = UserSchema.parse(response.data.data);
    this.token = user.appId;
    this.api.defaults.headers.common['token'] = user.appId;

    return user;
  }

  public async getControllers(): Promise<Controller[]> {
    const response = await this.api.post<Response<Controller[]>>(Url.CONTROLLERS, {
      userId: this.token,
    });

    return response.data.data.map((device) => ControllerSchema.parse(device));
  }

  public async getDeviceSettings({ deviceId, port }: GetDeviceParams): Promise<DeviceSettings> {
    const response = await this.api.post<Response<DeviceSettings>>(Url.DEVICE_SETTINGS, {
      devId: deviceId,
      port,
    });

    return DeviceSettingsSchema.parse(response.data.data);
  }

  public async getDeviceModeSettings({ deviceId, port }: GetDeviceParams): Promise<DeviceModeSettings> {
    const response = await this.api.post<Response<DeviceModeSettings>>(Url.DEVICE_MODE_SETTINGS, {
      devId: deviceId,
      port,
    });

    return DeviceModeSettingsSchema.parse(response.data.data);
  }
}

class AcInfinityClient {
  constructor(args: AuthParams) {
    this.instance = new AcInfinityClientInstance(args);
  }

  public instance: AcInfinityClientInstance;

  static async build(args: AuthParams) {
    const instance = new AcInfinityClientInstance(args);
    await instance.authenticate();
    return instance;
  }
}

export { AcInfinityClient };
export type { Controller, User, DeviceModeSettings, DeviceSettings };
