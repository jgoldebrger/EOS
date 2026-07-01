# Transport routing stack (VROOM + optional OSRM + Ferrobus worker)

## Quick start

```bash
cd docker/transport
mkdir -p data
docker compose up -d vroom ferrobus-worker
```

Set in `.env.local`:

```
VROOM_URL=http://localhost:3001
FERROBUS_WORKER_URL=http://localhost:8090
```

## VROOM

The `vroom` service exposes HTTP on port **3001**. EOS calls it from server actions and the `optimize-routes` Edge Function.

For road-accurate routing, preprocess an OpenStreetMap extract into `./data` and enable the `osrm` profile:

```bash
# Example — replace region with your extract
docker run -t -v "${PWD}/data:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/region.osm.pbf
docker run -t -v "${PWD}/data:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/region.osrm
docker run -t -v "${PWD}/data:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/region.osrm
docker compose --profile osrm up -d
```

## Ferrobus worker

The worker on port **8090** serves `/isochrone` for service-area analysis. Install [Ferrobus](https://github.com/chingiztob/ferrobus) in the image when GTFS/OSM feeds are available; until then it returns geodesic approximations.

Health check: `GET http://localhost:8090/health`

## Edge Functions

Deploy proxies (optional if server actions call services directly):

```bash
npx supabase functions deploy optimize-routes
npx supabase functions deploy run-transport-analysis
```

Set secrets:

```bash
npx supabase secrets set VROOM_URL=http://host.docker.internal:3001
npx supabase secrets set FERROBUS_WORKER_URL=http://host.docker.internal:8090
```
