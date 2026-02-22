import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ZodError } from 'zod';

import { AcInfinityClient, AuthParams, Url } from '../src';
import { AuthenticationError } from '../src/errors';
import mockAxios from './__mocks__/axios';
import { responseMock } from './mocks/responseMock';

describe('AcInfintyClient', () => {
  const authparams: AuthParams = {
    email: 'test',
    password: 'test',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should authenticate when using builder', async () => {
    // given
    const response = responseMock[Url.AUTH];
    mockApiResponse(response);

    // when
    await AcInfinityClient.build(authparams);

    // then
    expect(mockAxios.post).toHaveBeenCalledWith(Url.AUTH, {
      appEmail: authparams.email,
      appPasswordl: authparams.password,
    });
    expect(mockAxios.defaults.headers.common.token).toBe(response.appId);
  });

  it('should throw when authentication code is not 200', async () => {
    // given
    mockApiResponse(
      {
        something: 'else',
      },
      401,
    );

    // when
    const client = new AcInfinityClient(authparams);

    // then
    expect(client.authenticate()).rejects.toThrow(AuthenticationError);
  });

  it('should throw ZodError when invalid data is returned', async () => {
    // given
    mockApiResponse({
      something: 'else',
    });

    // when
    expect(AcInfinityClient.build(authparams)).rejects.toThrow(ZodError);
  });

  it('should parse getControllers response', async () => {
    // given
    const response = responseMock[Url.GET_CONTROLLERS];
    mockApiResponse(response);

    const client = new AcInfinityClient(authparams);

    // when
    const controllers = await client.getControllers();

    // then
    expect(mockAxios.post).toHaveBeenCalledWith(Url.GET_CONTROLLERS, { userId: '' });
    expect(controllers).toHaveLength(response.length);
  });

  it('should parse getDeviceSettings response', async () => {
    // given
    const response = responseMock[Url.GET_DEVICE_SETTINGS];
    mockApiResponse(response);

    const client = new AcInfinityClient(authparams);

    // when
    await client.getDeviceSettings({ controllerId: 'test', port: 1 });

    // then
    expect(mockAxios.post).toHaveBeenCalledWith(Url.GET_DEVICE_SETTINGS, { devId: 'test', port: 1 });
  });

  it('should parse getDeviceModeSettings response', async () => {
    // given
    const response = responseMock[Url.GET_DEVICE_MODE_SETTINGS];
    mockApiResponse(response);

    const client = new AcInfinityClient(authparams);

    // when
    await client.getDeviceModeSettings({ controllerId: 'test', port: 1 });

    // then
    expect(mockAxios.post).toHaveBeenCalledWith(Url.GET_DEVICE_MODE_SETTINGS, { devId: 'test', port: 1 });
  });

  it('should merge current settings with changes when setting device mode settings', async () => {
    // given
    const currentSettings = responseMock[Url.GET_DEVICE_MODE_SETTINGS];
    mockApiResponse(currentSettings);
    mockSetResponse();

    const client = new AcInfinityClient(authparams);

    // when
    await client.setDeviceModeSettings({
      controllerId: 'test',
      port: 1,
      settings: { levelWhileOn: 10 },
    });

    // then
    expect(mockAxios.post).toHaveBeenNthCalledWith(1, Url.GET_DEVICE_MODE_SETTINGS, { devId: 'test', port: 1 });
    expect(mockAxios.post).toHaveBeenNthCalledWith(2, Url.SET_DEVICE_MODE_SETTINGS, {
      ...currentSettings,
      onSpead: 10,
    });
  });

  it('should throw when set device mode settings response is not 200', async () => {
    // given
    mockApiResponse(responseMock[Url.GET_DEVICE_MODE_SETTINGS]);
    mockSetResponse(500);

    const client = new AcInfinityClient(authparams);

    // when / then
    await expect(client.setDeviceModeSettings({ controllerId: 'test', port: 1, settings: {} })).rejects.toThrow(Error);
  });

  const axiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  });

  const mockSetResponse = (code = 200) => {
    jest.mocked(mockAxios.post).mockImplementationOnce(() => Promise.resolve(axiosResponse({ code, msg: 'ok' })));
  };

  const mockApiResponse = (data: object, code = 200) => {
    jest.mocked(mockAxios.post).mockImplementationOnce(() => Promise.resolve(axiosResponse({ code, data })));
  };
});
