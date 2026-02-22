import axios, { type AxiosInstance } from 'axios';

import { AuthenticationError } from './errors';
import type { Controller, DeviceModeSettings, DeviceSettings, User } from './types';
import { ControllerSchema, DeviceModeSettingsSchema, DeviceSettingsSchema, UserSchema } from './types';

export enum Url {
  AUTH = '/user/appUserLogin',
  GET_CONTROLLERS = '/user/devInfoListAll',
  GET_DEVICE_SETTINGS = '/dev/getDevSetting',
  GET_DEVICE_MODE_SETTINGS = '/dev/getdevModeSettingList',
  SET_DEVICE_MODE_SETTINGS = '/dev/addDevMode',
}

export interface Response<T> {
  code: number;
  data: T;
}

interface SetResponse {
  code: number;
  msg: string;
}

export interface AuthParams {
  email: string;
  password: string;
}

interface GetDeviceParams {
  deviceId: string;
  port: number;
}

interface SetDeviceModeSettingsParams extends GetDeviceParams {
  settings: Partial<DeviceModeSettings>;
}

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
    const response = await this.api.post<Response<User>>(Url.AUTH, {
      appEmail: this.email,
      appPasswordl: this.password,
    });

    if (response.data.code !== 200) {
      throw new AuthenticationError();
    }

    const user = UserSchema.parse(response.data.data);
    this.token = user.appId;
    this.api.defaults.headers.common['token'] = user.appId;

    return user;
  }

  private ensureSuccess(response: SetResponse) {
    if (response.code !== 200) {
      throw new Error(`API request failed [code="${response.code}", msg="${response.msg}"]`);
    }
  }

  public async getControllers(): Promise<Controller[]> {
    const response = await this.api.post<Response<Controller[]>>(Url.GET_CONTROLLERS, {
      userId: this.token,
    });

    return response.data.data.map((device) => ControllerSchema.parse(device));
  }

  public async getDeviceSettings({ deviceId, port }: GetDeviceParams): Promise<DeviceSettings> {
    const response = await this.api.post<Response<DeviceSettings>>(Url.GET_DEVICE_SETTINGS, {
      devId: deviceId,
      port,
    });

    return DeviceSettingsSchema.parse(response.data.data);
  }

  public async getDeviceModeSettings({ deviceId, port }: GetDeviceParams): Promise<DeviceModeSettings> {
    const response = await this.api.post<Response<DeviceModeSettings>>(Url.GET_DEVICE_MODE_SETTINGS, {
      devId: deviceId,
      port,
    });

    return DeviceModeSettingsSchema.parse(response.data.data);
  }

  public async setDeviceModeSettings({ deviceId, port, settings }: SetDeviceModeSettingsParams): Promise<void> {
    const rawCurrentSettings = await this.api.post<Response<DeviceModeSettings>>(Url.GET_DEVICE_MODE_SETTINGS, {
      devId: deviceId,
      port,
    });
    const currentSettings = DeviceModeSettingsSchema.parse(rawCurrentSettings.data.data);

    const response = await this.api.post<SetResponse>(Url.SET_DEVICE_MODE_SETTINGS, {
      ...currentSettings,
      ...settings,
    });

    this.ensureSuccess(response.data);
  }

  static async build(args: AuthParams) {
    const instance = new AcInfinityClient(args);
    await instance.authenticate();
    return instance;
  }
}

export { AcInfinityClient };
export type { Controller, User, DeviceModeSettings, DeviceSettings };
