import { AcInfinityClient, AuthParams, Url } from '../src';

import { responseMock } from './mocks/responseMock';
import mockAxios from './__mocks__/axios';

describe('AcInfintyClient', () => {
  const authparams: AuthParams = {
    username: 'test',
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
    expect(mockAxios.post).toHaveBeenCalledWith(Url.AUTH, authparams);
    expect(mockAxios.defaults.headers.common['token']).toBe(response.appId);
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

  const mockApiResponse = (data: Object) => {
    const response = {
      data: {
        data,
      },
    };

    // @ts-ignore
    mockAxios.post.mockImplementationOnce(() => Promise.resolve(response));
  };
});
