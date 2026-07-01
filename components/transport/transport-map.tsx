"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapDepot {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface TransportMapProps {
  depots?: MapDepot[];
  stops?: Array<{
    latitude: number | null;
    longitude: number | null;
    address: string;
    stop_type: string;
  }>;
  isochroneFeatures?: Array<{
    type: string;
    properties?: Record<string, unknown>;
    geometry: { type: string; coordinates: unknown };
  }>;
  className?: string;
  height?: number;
}

export function TransportMap({
  depots = [],
  stops = [],
  isochroneFeatures = [],
  className = "",
  height = 360,
}: TransportMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [-98.5795, 39.8283],
      zoom: 3,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const render = () => {
      const points: Array<{ lng: number; lat: number; label: string; color: string }> =
        [];

      for (const depot of depots) {
        if (depot.latitude != null && depot.longitude != null) {
          points.push({
            lng: depot.longitude,
            lat: depot.latitude,
            label: depot.name,
            color: "#2563eb",
          });
        }
      }

      for (const stop of stops) {
        if (stop.latitude != null && stop.longitude != null) {
          points.push({
            lng: stop.longitude,
            lat: stop.latitude,
            label: stop.address,
            color: stop.stop_type === "pickup" ? "#16a34a" : "#ea580c",
          });
        }
      }

      if (points.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        for (const p of points) {
          bounds.extend([p.lng, p.lat]);
        }
        map.fitBounds(bounds, { padding: 48, maxZoom: 14 });
      }

      const sourceId = "transport-points";
      const data: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: points.map((p) => ({
          type: "Feature",
          properties: { label: p.label, color: p.color },
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        })),
      };

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
      } else {
        map.addSource(sourceId, { type: "geojson", data });
        map.addLayer({
          id: "transport-points-circle",
          type: "circle",
          source: sourceId,
          paint: {
            "circle-radius": 8,
            "circle-color": ["get", "color"],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });
      }

      const isoSourceId = "transport-isochrones";
      const isoData: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: isochroneFeatures.map((f) => ({
          type: "Feature",
          properties: f.properties ?? {},
          geometry: f.geometry as GeoJSON.Geometry,
        })),
      };

      if (map.getSource(isoSourceId)) {
        (map.getSource(isoSourceId) as maplibregl.GeoJSONSource).setData(isoData);
      } else if (isochroneFeatures.length > 0) {
        map.addSource(isoSourceId, { type: "geojson", data: isoData });
        map.addLayer({
          id: "transport-isochrones-fill",
          type: "fill",
          source: isoSourceId,
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.15,
          },
        });
        map.addLayer({
          id: "transport-isochrones-line",
          type: "line",
          source: isoSourceId,
          paint: {
            "line-color": "#2563eb",
            "line-width": 2,
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      render();
    } else {
      map.once("load", render);
    }
  }, [depots, stops, isochroneFeatures]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden rounded-lg border ${className}`}
      style={{ height }}
    />
  );
}
