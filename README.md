# ac-infinity-client

[![npm](https://img.shields.io/npm/v/@jakobgoerke/ac-infinity-client)](https://www.npmjs.com/package/@jakobgoerke/ac-infinity-client)
[![build & test](https://github.com/jakobgoerke/ac-infinity-client/actions/workflows/build.yml/badge.svg)](https://github.com/jakobgoerke/ac-infinity-client/actions/workflows/build.yml)
[![license](https://img.shields.io/npm/l/@jakobgoerke/ac-infinity-client)](LICENSE)

A typed Node.js client for the [AC Infinity](https://acinfinity.com) cloud API, the same backend the AC Infinity app uses. Use it to read your
UIS controllers, their ports and sensors, and to change device and mode settings from your own code.

- **Typed**: responses are validated with [zod](https://zod.dev) and turned into readable objects (`levelWhileOn` instead of `onSpead`).
- **Decoded values**: temperatures, humidity, VPD and sensor readings come back in real units, not vendor-scaled integers.
- **Partial updates**: send only the fields you want to change. The client fetches the current settings and merges your changes in.
- **Device detection**: ports without an assigned device type are identified by the ID resistor in the plug.

> [!NOTE]
> This is an unofficial project and is not affiliated with AC Infinity. The API is undocumented and may change without notice.

## Installation

```sh
npm install @jakobgoerke/ac-infinity-client
# or
yarn add @jakobgoerke/ac-infinity-client
```

Requires Node.js 24 or newer.

## Quick start

```ts
import { AcInfinityClient, DeviceMode } from '@jakobgoerke/ac-infinity-client';

// build() creates the client and logs in
const client = await AcInfinityClient.build({
  email: 'you@example.com',
  password: 'your-password',
});

const [controller] = await client.getControllers();
console.log(`${controller.name}: ${controller.deviceInfo.temperature} °C, ${controller.deviceInfo.humidity} %`);

for (const port of controller.deviceInfo.ports) {
  console.log(`Port ${port.port} (${port.deviceName}) is at level ${port.currentLevel}`);
}

// turn the fan on port 1 on at level 6
await client.setDeviceModeSettings({
  controllerId: controller.id,
  port: 1,
  settings: { mode: DeviceMode.ON, levelWhileOn: 6 },
});
```

## Usage

### Authentication

`AcInfinityClient.build()` creates a client and logs in right away. If you want to log in later, create the client with `new` and call
`authenticate()` yourself:

```ts
const client = new AcInfinityClient({ email, password });
const user = await client.authenticate(); // { id, username, email }
```

If the credentials are rejected, an `AuthenticationError` is thrown.

### Controllers

```ts
const controllers = await client.getControllers();        // controllers on your account
const shared = await client.getSharedControllers();       // controllers others shared with you
const controller = await client.getController({ controllerId: controllers[0].id });
```

A controller looks like this (abridged):

```ts
{
  id: '1234567890123456789',
  name: 'Grow Tent',
  type: ControllerDeviceType.UIS_CONTROLLER_69_PRO,
  totalPorts: 4,
  online: true,
  firmwareVersion: '3.2.25',
  deviceInfo: {
    temperature: 24.5,   // °C
    temperatureF: 76.1,  // °F, null if not reported
    humidity: 58.3,      // %
    vpd: 1.28,           // kPa
    ports: [
      {
        port: 1,
        deviceName: 'Exhaust Fan',
        deviceType: DeviceType.FAN,
        currentMode: DeviceMode.AUTO,
        currentLevel: 4,
        online: true,
        remainingTime: null, // seconds until the next timer / cycle / schedule switch
      },
    ],
    sensors: [
      { port: 1, type: SensorType.CO2, value: 812 }, // value is null when the sensor has no reading
    ],
  },
}
```

### Ports

Settings are addressed by `controllerId` and `port`. Port `0` is the controller itself, ports `1` to `n` are the devices plugged into it.

### Mode settings

Mode settings control what a device does: its mode, its levels, and the triggers for timer, cycle, schedule, auto and VPD modes.

```ts
const modes = await client.getDeviceModeSettings({ controllerId, port: 1 });

modes.mode;                          // DeviceMode.AUTO
modes.levelWhileOn;                  // 0–10
modes.auto.highTemperature;          // { enabled: true, celsius: 28, fahrenheit: 82 }
modes.vpd.target;                    // { enabled: false, value: 1.2 } (kPa)
modes.schedule;                      // { start: 480, end: 1200 } (minutes after midnight)
```

Only the fields you pass to `setDeviceModeSettings()` are changed:

```ts
// run the fan in auto mode when it gets hotter than 28 °C or more humid than 65 %
await client.setDeviceModeSettings({
  controllerId,
  port: 1,
  settings: {
    mode: DeviceMode.AUTO,
    levelWhileOn: 8,
    levelWhileOff: 1,
    auto: {
      highTemperature: { enabled: true, celsius: 28 },
      highHumidity: { enabled: true, value: 65 },
    },
  },
});

// switch the light on at 08:00 and off at 20:00
await client.setDeviceModeSettings({
  controllerId,
  port: 2,
  settings: {
    mode: DeviceMode.SCHEDULE,
    schedule: { start: 8 * 60, end: 20 * 60 },
  },
});

// 15 minutes on, 45 minutes off
await client.setDeviceModeSettings({
  controllerId,
  port: 3,
  settings: {
    mode: DeviceMode.CYCLE,
    cycle: { on: 15 * 60, off: 45 * 60 },
  },
});
```

| Setting                                              | Unit / range                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `levelWhileOn`, `levelWhileOff`                      | 0–10                                                           |
| `timer.toOn`, `timer.toOff`, `cycle.on`, `cycle.off` | seconds                                                        |
| `schedule.start`, `schedule.end`                     | minutes after midnight (0–1439), `null` to clear               |
| temperature triggers                                 | `celsius` (0–90) **or** `fahrenheit` (32–194), the other is computed |
| humidity triggers                                    | percent (0–100)                                                |
| VPD triggers                                         | kPa (0–9.9)                                                    |

### Device settings

Device settings are the general settings of a port or the controller: name, temperature unit, display brightness, backlight and sensor
calibration.

```ts
const settings = await client.getDeviceSettings({ controllerId, port: 0 });

settings.name;             // 'Grow Tent'
settings.temperatureUnit;  // TemperatureUnit.CELSIUS
settings.calibration;      // { temperatureC, temperatureF, humidity, leafTemperatureC, leafTemperatureF }

await client.setDeviceSettings({
  controllerId,
  port: 0,
  settings: {
    name: 'Grow Tent',
    temperatureUnit: TemperatureUnit.CELSIUS,
    backlight: true,
    calibration: { temperatureC: -1, humidity: 2 },
  },
});
```

As with temperature triggers, give the temperature calibration in either `temperatureC` or `temperatureF`. The other value is computed for you.

### Errors

| Error                 | When                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `AuthenticationError` | The login was rejected.                                                                  |
| `ApiError`            | The API answered with a non-200 code. The error carries the vendor's `code` and `msg`.   |
| `ZodError`            | A response didn't match the expected shape, or the changes you passed are out of range. |

```ts
import { ApiError } from '@jakobgoerke/ac-infinity-client';

try {
  await client.getController({ controllerId: 'unknown' });
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.code, error.msg);
  }
}
```

## API reference

| Method                                                   | Returns                       |
| -------------------------------------------------------- | ----------------------------- |
| `AcInfinityClient.build({ email, password })`            | `Promise<AcInfinityClient>`   |
| `authenticate()`                                         | `Promise<User>`               |
| `getControllers()`                                       | `Promise<Controller[]>`       |
| `getSharedControllers()`                                 | `Promise<Controller[]>`       |
| `getController({ controllerId })`                        | `Promise<Controller>`         |
| `getDeviceSettings({ controllerId, port })`              | `Promise<DeviceSettings>`     |
| `setDeviceSettings({ controllerId, port, settings })`    | `Promise<void>`               |
| `getDeviceModeSettings({ controllerId, port })`          | `Promise<DeviceModeSettings>` |
| `setDeviceModeSettings({ controllerId, port, settings })`| `Promise<void>`               |

The package also exports the enums `ControllerDeviceType`, `DeviceType`, `DeviceMode`, `SensorType` and `TemperatureUnit`, and the types
`Controller`, `ControllerDeviceInfo`, `ControllerPort`, `ControllerSensor`, `DeviceSettings`, `DeviceSettingsChanges`, `DeviceModeSettings`,
`DeviceModeSettingsChanges` and `User`.

## Development

```sh
corepack enable
yarn install
yarn test       # run the tests
yarn coverage   # run the tests with coverage
yarn lint       # check formatting and lint rules with Biome
yarn build      # compile to ./build
```

New versions are published to npm by CI when a tag is pushed.

## License

[GPL-3.0-or-later](LICENSE)
