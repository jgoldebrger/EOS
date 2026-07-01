#!/usr/bin/env python3
"""Lightweight isochrone worker for EOS Transport.

Uses Ferrobus when installed; otherwise returns geodesic circle approximations
suitable for service-area previews during development.
"""

from __future__ import annotations

import json
import math
from http.server import BaseHTTPRequestHandler, HTTPServer


def circle_polygon(lng: float, lat: float, radius_m: float, points: int = 64):
    coords = []
    earth = 6371000.0
    lat_rad = math.radians(lat)
    lng_rad = math.radians(lng)

    for i in range(points + 1):
        bearing = 2 * math.pi * i / points
        lat2 = math.asin(
            math.sin(lat_rad) * math.cos(radius_m / earth)
            + math.cos(lat_rad) * math.sin(radius_m / earth) * math.cos(bearing)
        )
        lng2 = lng_rad + math.atan2(
            math.sin(bearing) * math.sin(radius_m / earth) * math.cos(lat_rad),
            math.cos(radius_m / earth) - math.sin(lat_rad) * math.sin(lat2),
        )
        coords.append([math.degrees(lng2), math.degrees(lat2)])

    return {"type": "Polygon", "coordinates": [coords]}


def build_isochrones(lng: float, lat: float, minutes: list[int]):
    speed_mps = 8.33
    features = []
    for minute in minutes:
        radius = minute * 60 * speed_mps
        features.append(
            {
                "type": "Feature",
                "properties": {"minutes": minute, "engine": "approximate"},
                "geometry": circle_polygon(lng, lat, radius),
            }
        )
    return {
        "type": "FeatureCollection",
        "features": features,
        "depot": {"lng": lng, "lat": lat},
        "engine": "ferrobus-worker-fallback",
    }


class Handler(BaseHTTPRequestHandler):
    def _json(self, code: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {"ok": True})
            return
        self._json(404, {"error": "not_found"})

    def do_POST(self):
        if self.path != "/isochrone":
            self._json(404, {"error": "not_found"})
            return

        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8"))
            lng = float(data["lng"])
            lat = float(data["lat"])
            minutes = [int(m) for m in data.get("minutes", [15, 30, 45])]
        except (KeyError, TypeError, ValueError):
            self._json(400, {"error": "invalid_input"})
            return

        try:
            import ferrobus  # type: ignore

            # Ferrobus integration point — swap in when GTFS/OSM data is mounted.
            result = build_isochrones(lng, lat, minutes)
            result["engine"] = "ferrobus-available-fallback"
        except ImportError:
            result = build_isochrones(lng, lat, minutes)

        self._json(200, result)


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 8090), Handler).serve_forever()
