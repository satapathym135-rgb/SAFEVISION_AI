export const cameras = [
  { id: "CAM-01", name: "Assembly Line A", zone: "Zone A", online: true, fps: 30, uptime: 99.8 },
  { id: "CAM-02", name: "Welding Bay", zone: "Zone B", online: true, fps: 25, uptime: 98.9 },
  { id: "CAM-03", name: "Chemical Storage", zone: "Zone C", online: true, fps: 30, uptime: 99.2 },
  { id: "CAM-04", name: "Loading Dock", zone: "Zone D", online: true, fps: 24, uptime: 97.1 },
  { id: "CAM-05", name: "Boiler Room", zone: "Zone E", online: false, fps: 0, uptime: 82.4 },
  { id: "CAM-06", name: "Warehouse North", zone: "Zone F", online: true, fps: 30, uptime: 99.5 },
];

export type Severity = "critical" | "high" | "medium" | "low";

export const alerts: { id: string; type: string; severity: Severity; time: string; camera: string; location: string }[] = [
  { id: "AL-2041", type: "Fire Detected", severity: "critical", time: "22:04:12", camera: "CAM-05", location: "Boiler Room" },
  { id: "AL-2040", type: "Missing Helmet", severity: "high", time: "22:01:47", camera: "CAM-02", location: "Welding Bay" },
  { id: "AL-2039", type: "Unauthorized Entry", severity: "high", time: "21:58:03", camera: "CAM-03", location: "Chemical Storage" },
  { id: "AL-2038", type: "Smoke Detected", severity: "critical", time: "21:52:30", camera: "CAM-05", location: "Boiler Room" },
  { id: "AL-2037", type: "Missing Vest", severity: "medium", time: "21:47:18", camera: "CAM-04", location: "Loading Dock" },
  { id: "AL-2036", type: "Missing Gloves", severity: "medium", time: "21:40:55", camera: "CAM-01", location: "Assembly Line A" },
  { id: "AL-2035", type: "Missing Goggles", severity: "low", time: "21:33:09", camera: "CAM-02", location: "Welding Bay" },
];

export const workers = Array.from({ length: 10 }, (_, i) => ({
  id: `WK-${(1040 + i * 7).toString()}`,
  zone: cameras[i % 6]!.zone,
  camera: cameras[i % 6]!.id,
  lastSeen: `22:0${i % 6}:${(10 + i * 4) % 60}`.replace(/:(\d)$/, ":0$1"),
  compliant: i % 4 !== 1,
  score: 72 + ((i * 13) % 27),
}));

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const weekly = days.map((d, i) => ({
  day: d,
  compliance: [88, 91, 87, 93, 94, 90, 95][i],
  incidents: [12, 9, 14, 7, 6, 10, 5][i],
  safety: [78, 81, 79, 84, 86, 83, 88][i],
  risk: [42, 38, 45, 33, 30, 36, 28][i],
}));

export const hourly = Array.from({ length: 12 }, (_, i) => ({
  hour: `${(i * 2).toString().padStart(2, "0")}:00`,
  ppe: 4 + ((i * 7) % 9),
  fire: i === 10 ? 2 : i % 5 === 0 ? 1 : 0,
  entry: (i * 3) % 4,
}));

export const ppeItems = [
  { name: "Helmet", rate: 96 },
  { name: "Vest", rate: 92 },
  { name: "Gloves", rate: 84 },
  { name: "Goggles", rate: 79 },
  { name: "Mask", rate: 88 },
  { name: "Boots", rate: 97 },
];

export const zones = [
  { zone: "Zone A", occupancy: 34, capacity: 40 },
  { zone: "Zone B", occupancy: 18, capacity: 20 },
  { zone: "Zone C", occupancy: 6, capacity: 10 },
  { zone: "Zone D", occupancy: 22, capacity: 35 },
  { zone: "Zone E", occupancy: 3, capacity: 8 },
  { zone: "Zone F", occupancy: 41, capacity: 60 },
];
