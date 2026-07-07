# Transport

Transport is a transportation management module for dispatch, loads, carriers, and route optimization.

## Transport home

**Path:** `/org/[slug]/transport`

### Features

| Area | Purpose |
|------|---------|
| **Dispatch board** | Operational view of loads and assignments |
| **Map** | Geographic view of stops and routes |
| **Loads** | Create and manage shipments |
| **Carriers** | Carrier directory |
| **Depots** | Origin/destination facilities |
| **Route analysis** | Optimization and isochrone analysis |

---

## Loads

### Create a load

1. Go to **Transport**.
2. Create a new load with customer/reference details.
3. Add **stops** (pickup, delivery) with addresses and scheduled times.

### Load detail

**Path:** `/org/[slug]/transport/[loadId]`

- Manage stops and status.
- Run route optimization.
- Link to **projects**, **issues**, or **to-dos**.

---

## Route optimization

Uses external routing services (VROOM, OSRM) when configured. See `docker/transport/README.md` in the repository for infrastructure setup.

### Analysis

Run transport analysis for drive-time isochrones and planning scenarios.

---

## Permissions

Org owner, admin, and member can use transport. Viewers have read access.

---

## Best practices

- Link loads to projects when delivery is part of a larger initiative.
- Keep carrier records updated for dispatch efficiency.
