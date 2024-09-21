import axios, { HttpStatusCode, type AxiosInstance } from 'axios';

import { Controller, ControllerSchema, User, UserSchema, Device, DeviceSchema } from './types';

interface Response<T> {
  code: typeof HttpStatusCode;
  data: T;
}

interface AuthParams {
  username: string;
  password: string;
}

interface GetDeviceSettingsParams {
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
    const response = await this.api.post<Response<User>>('/user/appUserLogin', {
      username: this.username,
      password: this.password,
    });

    const user = UserSchema.parse(response.data.data);
    this.token = user.appId;
    this.api.defaults.headers.common['token'] = user.appId;

    return user;
  }

  public async getControllers(): Promise<Controller[]> {
    const response = await this.api.post<Response<Controller[]>>('/user/devInfoListAll', {
      userId: this.token,
    });

    return response.data.data.map((device) => ControllerSchema.parse(device));
  }

  public async getDeviceSettings({ deviceId, port }: GetDeviceSettingsParams): Promise<Device> {
    return (
      await this.api.post<Response<Device>>(`/dev/getdevModeSettingList`, {
        devId: deviceId,
        port,
      })
    ).data.data;
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
