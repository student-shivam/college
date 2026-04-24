export const initialSensors = {
  temperature: 78,
  vibration: 4.6,
  pressure: 36,
  humidity: 50,
  rpm: 1850,
  voltage: 228,
  current: 15,
  runtimeHours: 2200,
  errorCount: 1,
  maintenanceLagDays: 14
};

export const sensorFields = [
  ["temperature", "Temperature (C)"],
  ["vibration", "Vibration (mm/s)"],
  ["humidity", "Humidity (%)"],
  ["runtimeHours", "Runtime Hours"],
  ["pressure", "Pressure (bar)"]
];

export const sensorFieldsAll = [
  ["temperature", "Temperature (C)"],
  ["vibration", "Vibration (mm/s)"],
  ["pressure", "Pressure (bar)"],
  ["humidity", "Humidity (%)"],
  ["rpm", "RPM"],
  ["voltage", "Voltage (V)"],
  ["current", "Current (A)"],
  ["runtimeHours", "Runtime Hours"],
  ["errorCount", "Error Count"],
  ["maintenanceLagDays", "Maintenance Lag (days)"]
];
