import { Url, Response } from '../../src/AcInfinityClient';

import getControllers from './getControllers.json';
import getAuth from './getAuth.json';
import getDeviceSettings from './getDeviceSettings.json';
import getDeviceModeSettings from './getDeviceModeSettings.json';

export const responseMock = {
  [Url.AUTH]: getAuth,
  [Url.CONTROLLERS]: getControllers,
  [Url.DEVICE_SETTINGS]: getDeviceSettings,
  [Url.DEVICE_MODE_SETTINGS]: getDeviceModeSettings,
};
