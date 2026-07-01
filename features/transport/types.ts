import type {
  TransportAnalysisStatusDb,
  TransportAnalysisTypeDb,
  TransportLoadStatusDb,
  TransportStopStatusDb,
  TransportStopTypeDb,
  Tables,
} from "@/types/database";

export type TransportDepot = Tables<"transport_depots">;
export type TransportCarrier = Tables<"transport_carriers">;
export type TransportLoad = Tables<"transport_loads">;
export type TransportStop = Tables<"transport_stops">;
export type TransportRoute = Tables<"transport_routes">;
export type TransportAnalysis = Tables<"transport_analyses">;

export type {
  TransportLoadStatusDb,
  TransportStopTypeDb,
  TransportStopStatusDb,
  TransportAnalysisTypeDb,
  TransportAnalysisStatusDb,
};

export interface TransportMemberOption {
  userId: string;
  orgRole: string;
  label: string;
}

export interface TransportStopWithMeta extends TransportStop {}

export interface TransportLoadWithMeta extends TransportLoad {
  loadLabel: string;
  carrierName: string | null;
  driverLabel: string | null;
  depotName: string | null;
  stopCount: number;
  stops: TransportStopWithMeta[];
  latestRoute: TransportRoute | null;
  linkedProjects: LinkedProject[];
  linkedIssues: LinkedIssue[];
  linkedTodos: LinkedTodo[];
}

export interface LinkedProject {
  id: string;
  title: string;
  slug: string;
}

export interface LinkedIssue {
  id: string;
  title: string;
  teamSlug: string | null;
}

export interface LinkedTodo {
  id: string;
  title: string;
}

export interface TransportWorkspaceData {
  loads: TransportLoadWithMeta[];
  carriers: TransportCarrier[];
  depots: TransportDepot[];
  analyses: TransportAnalysis[];
}

export type TransportActionResult =
  | { success: true }
  | { success: false; error: string };

export type CreateLoadResult =
  | { success: true; loadId: string }
  | { success: false; error: string };

export type OptimizeRouteResult =
  | {
      success: true;
      routeId: string;
      orderedStopIds: string[];
      totalDistanceMeters: number | null;
      totalDurationSeconds: number | null;
    }
  | { success: false; error: string };

export interface VroomJob {
  id: number;
  location: [number, number];
  service?: number;
}

export interface VroomVehicle {
  id: number;
  start: [number, number];
  end?: [number, number];
}

export interface VroomSolution {
  routes: Array<{
    steps: Array<{
      type: string;
      job?: number;
      arrival: number;
      duration: number;
      distance: number;
    }>;
    distance: number;
    duration: number;
  }>;
}
