import axios, { type HttpStatusCode, type AxiosInstance } from 'axios';

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
  username: string;
  password: string;
}

export interface GetDeviceParams {
  deviceId: string;
  port: number;
}

class AcInfinityClientInstance {
  constructor(args: AuthParams) {
    const { username, password } = args;

    this.username = username;
    this.password = password;

    this.token = '';

    this.api = axios.create({
      baseURL: 'http://www.acinfinityserver.com/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private api: AxiosInstance;
  private token: string;
  private username: string;
  private password: string;

  public async authenticate(): Promise<User> {
    const response = await this.api.post<Response<User>>(Url.AUTH, {
      username: this.username,
      password: this.password,
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

export class AcInfinityClient {
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
