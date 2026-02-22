import { Url } from '../../src/AcInfinityClient';
import getAuth from './getAuth.json';
import getControllers from './getControllers.json';
import getDeviceModeSettings from './getDeviceModeSettings.json';
import getDeviceSettings from './getDeviceSettings.json';

export const responseMock = {
  [Url.AUTH]: getAuth,
  [Url.GET_CONTROLLERS]: getControllers,
  [Url.GET_DEVICE_SETTINGS]: getDeviceSettings,
  [Url.GET_DEVICE_MODE_SETTINGS]: getDeviceModeSettings,
};
