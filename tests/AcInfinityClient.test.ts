import { AcInfinityClient, AuthParams, Url } from '../src';

import { responseMock } from './mocks/responseMock';
import mockAxios from './__mocks__/axios';
import { AuthenticationError } from '../src/errors';
import { ZodError } from 'zod';

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
    expect(mockAxios.defaults.headers.common['token']).toBe(response.appId);
  });

  it('should throw when authentication code is not 200', async () => {
    // given
    mockApiResponse(
      {
        something: 'else',
      },
      401
    );

    // when
    const client = new AcInfinityClient(authparams);

    // then
    expect(client.instance.authenticate()).rejects.toThrow(AuthenticationError);
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
    const response = responseMock[Url.CONTROLLERS];
    mockApiResponse(response);

    const client = new AcInfinityClient(authparams);

    // when
    const controllers = await client.instance.getControllers();

    // then
    expect(mockAxios.post).toHaveBeenCalledWith(Url.CONTROLLERS, { userId: '' });
    expect(controllers).toHaveLength(response.length);
  });

  it('should parse getDeviceSettings response', async () => {
    // given
    const response = responseMock[Url.DEVICE_SETTINGS];
    mockApiResponse(response);

    const client = new AcInfinityClient(authparams);

    // when
    await client.instance.getDeviceSettings({ deviceId: 'test', port: 1 });

    // then
    expect(mockAxios.post).toHaveBeenCalledWith(Url.DEVICE_SETTINGS, { devId: 'test', port: 1 });
  });

  it('should parse getDeviceModeSettings response', async () => {
    // given
    const response = responseMock[Url.DEVICE_MODE_SETTINGS];
    mockApiResponse(response);

    const client = new AcInfinityClient(authparams);

    // when
    await client.instance.getDeviceModeSettings({ deviceId: 'test', port: 1 });

    // then
    expect(mockAxios.post).toHaveBeenCalledWith(Url.DEVICE_MODE_SETTINGS, { devId: 'test', port: 1 });
  });

  const mockApiResponse = (data: Object, code?: number) => {
    const response = {
      data: {
        code: code || 200,
        data,
      },
    };

    // @ts-ignore
    mockAxios.post.mockImplementationOnce(() => Promise.resolve(response));
  };
});
