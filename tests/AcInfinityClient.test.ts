import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ZodError } from 'zod';

import {
  AcInfinityClient,
  ApiError,
  AuthenticationError,
  AuthParams,
  ControllerDeviceType,
  DeviceMode,
  DeviceType,
  SensorType,
  TemperatureUnit,
  Url,
} from '../src';
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

  it('should parse getController response', async () => {
    // given
    const [response] = responseMock[Url.GET_CONTROLLERS];
    mockApiResponse(response);

    const client = new AcInfinityClient(authparams);

    // when
    const controller = await client.getController({ controllerId: 'test' });

    // then
    expect(mockAxios.post).toHaveBeenCalledWith(Url.GET_CONTROLLER, { devId: 'test' });
    expect(controller).toMatchObject({
      id: response.devId,
      macAddress: response.devMacAddr,
      timeZone: response.zoneId,
      wifiName: response.wifiName,
      deviceInfo: { temperature: 25.44, temperatureF: 77.79, sensors: [] },
    });
    expect(controller.deviceInfo.ports[2]).toMatchObject({ online: true, remainingTime: null });
  });

  it('should parse getSharedControllers response', async () => {
    // given
    const response = responseMock[Url.GET_CONTROLLERS];
    mockApiResponse(response);

    const client = new AcInfinityClient(authparams);

    // when
    const controllers = await client.getSharedControllers();

    // then
    expect(mockAxios.post).toHaveBeenCalledWith(Url.GET_SHARED_CONTROLLERS, { userId: '' });
    expect(controllers).toHaveLength(response.length);
  });

  it('should decode sensor readings by their precision', async () => {
    // given
    const [controller] = responseMock[Url.GET_CONTROLLERS];
    const sensors = [
      { accessPort: 1, sensorType: SensorType.CO2, sensorPrecision: 1, sensorData: 820, sensorUnit: 0, sensorTrend: 0 },
      { accessPort: 2, sensorType: SensorType.PH, sensorPrecision: 3, sensorData: 612, sensorUnit: 0, sensorTrend: 0 },
      { accessPort: 2, sensorType: SensorType.WATER_TEMPERATURE_C, sensorPrecision: 2, sensorData: 215, sensorUnit: 0, sensorTrend: 0 },
      { accessPort: 3, sensorType: SensorType.SOIL_MOISTURE, sensorPrecision: 1, sensorData: -32768, sensorUnit: 0, sensorTrend: 0 },
    ];
    mockApiResponse({ ...controller, deviceInfo: { ...controller.deviceInfo, sensors } });

    const client = new AcInfinityClient(authparams);

    // when
    const { deviceInfo } = await client.getController({ controllerId: 'test' });

    // then
    expect(deviceInfo.sensors).toEqual([
      { port: 1, type: SensorType.CO2, value: 820 },
      { port: 2, type: SensorType.PH, value: 6.12 },
      { port: 2, type: SensorType.WATER_TEMPERATURE_C, value: 21.5 },
      { port: 3, type: SensorType.SOIL_MOISTURE, value: null },
    ]);
  });

  it('should strip the outlet flag from port device types', async () => {
    // given
    const [controller] = responseMock[Url.GET_CONTROLLERS];
    const [first, ...ports] = controller.deviceInfo.ports;
    mockApiResponse({
      ...controller,
      deviceInfo: { ...controller.deviceInfo, ports: [{ ...first, loadType: 134 }, ...ports] },
    });

    const client = new AcInfinityClient(authparams);

    // when
    const { deviceInfo } = await client.getController({ controllerId: 'test' });

    // then
    expect(deviceInfo.ports[0].deviceType).toBe(DeviceType.FAN);
  });

  it.each([
    [400, DeviceType.GROW_LIGHT],
    [5100, DeviceType.FAN],
    [12000, DeviceType.HUMIDIFIER],
    [1500, DeviceType.PUMP],
    [20000, DeviceType.AIR_CONDITION],
    [30000, DeviceType.NONE],
    [null, DeviceType.NONE],
  ])('should recognize unassigned port with resistance %p as device type %p', async (portResistance, deviceType) => {
    // given
    const [controller] = responseMock[Url.GET_CONTROLLERS];
    const [first, ...ports] = controller.deviceInfo.ports;
    mockApiResponse({
      ...controller,
      deviceInfo: { ...controller.deviceInfo, ports: [{ ...first, loadType: 0, portResistance }, ...ports] },
    });

    const client = new AcInfinityClient(authparams);

    // when
    const { deviceInfo } = await client.getController({ controllerId: 'test' });

    // then
    expect(deviceInfo.ports[0]).toMatchObject({ deviceType, resistance: portResistance });
  });

  it.each([
    [ControllerDeviceType.UIS_CONTROLLER_69_PRO, DeviceType.PUMP],
    [ControllerDeviceType.UIS_CONTROLLER_69_PRO_PLUS, DeviceType.PUMP],
    [ControllerDeviceType.CONTROLLER_69_WIFI, DeviceType.WATER_PUMP],
  ])('should recognize a pump on controller type %p as device type %p', async (devType, deviceType) => {
    // given
    const [controller] = responseMock[Url.GET_CONTROLLERS];
    const [first, ...ports] = controller.deviceInfo.ports;
    mockApiResponse({
      ...controller,
      devType,
      deviceInfo: { ...controller.deviceInfo, ports: [{ ...first, loadType: 0, portResistance: 1500 }, ...ports] },
    });

    const client = new AcInfinityClient(authparams);

    // when
    const result = await client.getController({ controllerId: 'test' });

    // then
    expect(result.type).toBe(devType);
    expect(result.deviceInfo.ports[0].deviceType).toBe(deviceType);
  });

  it('should prefer the assigned port device type over its resistance', async () => {
    // given
    const [controller] = responseMock[Url.GET_CONTROLLERS];
    const [first, ...ports] = controller.deviceInfo.ports;
    mockApiResponse({
      ...controller,
      deviceInfo: { ...controller.deviceInfo, ports: [{ ...first, loadType: DeviceType.HEATER, portResistance: 5100 }, ...ports] },
    });

    const client = new AcInfinityClient(authparams);

    // when
    const { deviceInfo } = await client.getController({ controllerId: 'test' });

    // then
    expect(deviceInfo.ports[0].deviceType).toBe(DeviceType.HEATER);
  });

  it('should transform device settings into readable values', async () => {
    // given
    mockApiResponse(responseMock[Url.GET_DEVICE_SETTINGS]);

    const client = new AcInfinityClient(authparams);

    // when
    const settings = await client.getDeviceSettings({ controllerId: 'test', port: 1 });

    // then
    expect(settings).toMatchObject({
      name: null,
      temperatureUnit: TemperatureUnit.CELSIUS,
      brightness: 3,
      backlight: true,
      calibration: { temperatureC: 0, temperatureF: 0, humidity: -10 },
      buffer: { enabled: true, temperatureC: 1, temperatureF: 2, humidity: 0, vpd: 0 },
    });
  });

  it('should transform device mode settings into readable values', async () => {
    // given
    mockApiResponse(responseMock[Url.GET_DEVICE_MODE_SETTINGS]);

    const client = new AcInfinityClient(authparams);

    // when
    const settings = await client.getDeviceModeSettings({ controllerId: 'test', port: 1 });

    // then
    expect(settings).toMatchObject({
      mode: DeviceMode.SCHEDULE,
      remainingTime: 57072,
      schedule: { start: 960, end: 600 },
      auto: {
        targetMode: false,
        highTemperature: { enabled: false, celsius: 90, fahrenheit: 194 },
        highHumidity: { enabled: false, value: 100 },
      },
      vpd: {
        high: { enabled: false, value: 9.9 },
        low: { enabled: false, value: 0.1 },
      },
    });
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
    expect(mockAxios.post).toHaveBeenNthCalledWith(
      2,
      Url.SET_DEVICE_MODE_SETTINGS,
      expect.objectContaining({
        modeSetid: currentSettings.modeSetid,
        devId: currentSettings.devId,
        externalPort: currentSettings.externalPort,
        offSpead: currentSettings.offSpead,
        onSpead: 10,
        onlyUpdateSpeed: 0,
      }),
    );
  });

  it('should only send flat values when setting device mode settings', async () => {
    // given
    mockApiResponse({ ...responseMock[Url.GET_DEVICE_MODE_SETTINGS], targetTempF: 0 });
    mockSetResponse();

    const client = new AcInfinityClient(authparams);

    // when
    await client.setDeviceModeSettings({ controllerId: 'test', port: 1, settings: {} });

    // then
    const payload = setPayload();
    expect(payload).not.toHaveProperty('devSetting');
    expect(payload).not.toHaveProperty('devMacAddr');
    expect(payload).not.toHaveProperty('ecOrTds');
    expect(payload.targetTempF).toBe(32);
    expect(Object.values(payload).every((value) => typeof value !== 'object')).toBe(true);
  });

  it('should encode readable mode settings into vendor values', async () => {
    // given
    mockApiResponse(responseMock[Url.GET_DEVICE_MODE_SETTINGS]);
    mockSetResponse();

    const client = new AcInfinityClient(authparams);

    // when
    await client.setDeviceModeSettings({
      controllerId: 'test',
      port: 1,
      settings: {
        mode: DeviceMode.AUTO,
        levelWhileOff: 2,
        timer: { toOn: 3600 },
        cycle: { on: 600, off: 1200 },
        schedule: { start: 480, end: null },
        auto: {
          targetMode: false,
          highTemperature: { enabled: true, celsius: 28 },
          lowTemperature: { enabled: true, fahrenheit: 68 },
          highHumidity: { enabled: true, value: 70 },
        },
        vpd: { high: { enabled: true, value: 1.4 } },
      },
    });

    // then
    expect(setPayload()).toMatchObject({
      atType: DeviceMode.AUTO,
      offSpead: 2,
      acitveTimerOn: 3600,
      activeCycleOn: 600,
      activeCycleOff: 1200,
      schedStartTime: 480,
      schedEndtTime: 65535,
      settingMode: 0,
      activeHt: 1,
      devHt: 28,
      devHtf: 82,
      activeLt: 1,
      devLt: 20,
      devLtf: 68,
      activeHh: 1,
      devHh: 70,
      activeHtVpd: 1,
      activeHtVpdNums: 14,
    });
  });

  it('should reject invalid mode settings before sending any request', async () => {
    // given
    const client = new AcInfinityClient(authparams);

    // when / then
    await expect(
      client.setDeviceModeSettings({
        controllerId: 'test',
        port: 1,
        settings: { levelWhileOn: 11 },
      }),
    ).rejects.toThrow(ZodError);
    await expect(
      client.setDeviceModeSettings({
        controllerId: 'test',
        port: 1,
        settings: { auto: { highTemperature: { celsius: 28, fahrenheit: 82 } } },
      }),
    ).rejects.toThrow(ZodError);
    expect(mockAxios.post).not.toHaveBeenCalled();
  });

  it.each([
    [0, 'Zelt'],
    [1, 'Abluft'],
  ])('should send the current name of port %p when setting device settings without one', async (port, devName) => {
    // given
    mockApiResponse(responseMock[Url.GET_DEVICE_SETTINGS]);
    mockApiResponse(responseMock[Url.GET_CONTROLLERS][0]);
    mockSetResponse();

    const client = new AcInfinityClient(authparams);

    // when
    await client.setDeviceSettings({ controllerId: 'test', port, settings: { brightness: 2 } });

    // then
    expect(mockAxios.post).toHaveBeenNthCalledWith(2, Url.GET_CONTROLLER, { devId: 'test' });
    expect(mockAxios.post).toHaveBeenNthCalledWith(3, Url.SET_DEVICE_SETTINGS, expect.objectContaining({ devName, devLight: 2 }));
  });

  it('should merge current settings with changes when setting device settings', async () => {
    // given
    const currentSettings = responseMock[Url.GET_DEVICE_SETTINGS];
    mockApiResponse(currentSettings);
    mockSetResponse();

    const client = new AcInfinityClient(authparams);

    // when
    await client.setDeviceSettings({
      controllerId: 'test',
      port: 0,
      settings: {
        name: 'Tent',
        temperatureUnit: TemperatureUnit.FAHRENHEIT,
        brightness: 5,
        backlight: false,
        calibration: { temperatureF: -3, humidity: 2 },
      },
    });

    // then
    expect(mockAxios.post).toHaveBeenNthCalledWith(1, Url.GET_DEVICE_SETTINGS, { devId: 'test', port: 0 });
    expect(mockAxios.post).toHaveBeenNthCalledWith(
      2,
      Url.SET_DEVICE_SETTINGS,
      expect.objectContaining({
        devId: currentSettings.devId,
        port: currentSettings.port,
        devName: 'Tent',
        devCompany: TemperatureUnit.FAHRENHEIT,
        devLight: 5,
        backlightSwitch: 0,
        devCth: -3,
        devCt: -1,
        devCh: 2,
        portParamData: currentSettings.portParamData,
      }),
    );
    expect(setPayload()).not.toHaveProperty('fieldSet');
    expect(setPayload()).not.toHaveProperty('setId');
  });

  it('should throw ApiError when a response code is not 200', async () => {
    // given
    mockApiResponse({}, 403);

    const client = new AcInfinityClient(authparams);

    // when / then
    await expect(client.getControllers()).rejects.toThrow(ApiError);
  });

  it('should throw when set device mode settings response is not 200', async () => {
    // given
    mockApiResponse(responseMock[Url.GET_DEVICE_MODE_SETTINGS]);
    mockSetResponse(500);

    const client = new AcInfinityClient(authparams);

    // when / then
    await expect(client.setDeviceModeSettings({ controllerId: 'test', port: 1, settings: {} })).rejects.toThrow(ApiError);
  });

  const axiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  });

  const setPayload = () => jest.mocked(mockAxios.post).mock.calls[1][1] as Record<string, unknown>;

  const mockSetResponse = (code = 200) => {
    jest.mocked(mockAxios.post).mockImplementationOnce(() => Promise.resolve(axiosResponse({ code, msg: 'ok' })));
  };

  const mockApiResponse = (data: object, code = 200) => {
    jest.mocked(mockAxios.post).mockImplementationOnce(() => Promise.resolve(axiosResponse({ code, data })));
  };
});
