import * as React from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import type { Trip, Order, Driver, Truck } from "@/modules/transport/types";

export const CITY_COORDS: Record<string, [number, number]> = {
  București: [44.4268, 26.1025],
  Bucharest: [44.4268, 26.1025],
  Cluj: [46.7712, 23.6236],
  "Cluj-Napoca": [46.7712, 23.6236],
  Timișoara: [45.7489, 21.2087],
  Timisoara: [45.7489, 21.2087],
  Iași: [47.1585, 27.6014],
  Iasi: [47.1585, 27.6014],
  Constanța: [44.1598, 28.6348],
  Constanta: [44.1598, 28.6348],
  Brașov: [45.6427, 25.5887],
  Brasov: [45.6427, 25.5887],
  Galați: [45.4353, 28.0077],
  Galati: [45.4353, 28.0077],
  Craiova: [44.3302, 23.7949],
  Ploiești: [44.9365, 26.0138],
  Ploiesti: [44.9365, 26.0138],
  Oradea: [47.0458, 21.9189],
  Sibiu: [45.7983, 24.1256],
  Arad: [46.1731, 21.3154],
  Bacău: [46.5671, 26.9146],
  Bacau: [46.5671, 26.9146],
  Pitești: [44.8565, 24.8692],
  Pitesti: [44.8565, 24.8692],
  Târgu: [46.5386, 24.5581],
  Suceava: [47.6515, 26.2556],
  Drobeta: [44.6334, 22.6566],
  Buzău: [45.15, 26.8236],
  Buzau: [45.15, 26.8236],
};

export function getCoords(city: string): [number, number] | null {
  const normalized = city.trim();
  if (CITY_COORDS[normalized]) return CITY_COORDS[normalized];
  const key = Object.keys(CITY_COORDS).find((k) =>
    normalized.toLowerCase().includes(k.toLowerCase()),
  );
  return key ? CITY_COORDS[key] : null;
}

export function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function interpolateAlongRoute(
  waypoints: [number, number][],
  progress: number,
): [number, number] | null {
  if (waypoints.length < 2) return null;
  if (progress <= 0) return waypoints[0];
  if (progress >= 1) return waypoints[waypoints.length - 1];

  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = haversineKm(waypoints[i], waypoints[i + 1]);
    segLengths.push(d);
    totalLen += d;
  }

  if (totalLen === 0) return waypoints[0];

  const targetDist = progress * totalLen;
  let traveled = 0;
  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (traveled + segLen >= targetDist) {
      const t = segLen === 0 ? 0 : (targetDist - traveled) / segLen;
      const a = waypoints[i];
      const b = waypoints[i + 1];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    traveled += segLen;
  }
  return waypoints[waypoints.length - 1];
}

export function traveledSegments(
  waypoints: [number, number][],
  progress: number,
  currentPos: [number, number],
): [number, number][] {
  if (waypoints.length < 2 || progress <= 0) return [];

  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = haversineKm(waypoints[i], waypoints[i + 1]);
    segLengths.push(d);
    totalLen += d;
  }
  if (totalLen === 0) return [];

  const targetDist = progress * totalLen;
  const result: [number, number][] = [waypoints[0]];
  let traveled = 0;

  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (traveled + segLen >= targetDist) {
      result.push(currentPos);
      break;
    }
    traveled += segLen;
    result.push(waypoints[i + 1]);
  }
  return result;
}

export function makeTruckIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#f59e0b;border:3px solid white;box-shadow:0 0 0 2px #f59e0b,0 2px 6px rgba(0,0,0,.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
}

export function makeEndpointIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -10],
  });
}

export function makeStopIcon(num: number, reached: boolean) {
  const bg = reached ? "#22c55e" : "#94a3b8";
  return L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${bg};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:700;font-family:sans-serif">${num}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

export function PanTo({ position }: { position: [number, number] }) {
  const map = useMap();
  React.useEffect(() => {
    map.panTo(position, { animate: true, duration: 0.8 });
  }, [map, position]);
  return null;
}

export type TrackerData = {
  trip: Trip | null;
  order: Order | null;
  driver: Driver | null;
  truck: Truck | null;
  waypoints: [number, number][];
  stopNames: string[];
};
