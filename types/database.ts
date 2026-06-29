/** Hand-written Supabase Database types — matches migrations 001–011. */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrgRoleDb = "owner" | "admin" | "member" | "viewer";
export type TeamRoleDb = "leader" | "member" | "viewer";
export type SsoProviderTypeDb = "oauth" | "saml";
export type SsoMappableRoleDb = "admin" | "member" | "viewer";
export type ScorecardTargetRuleDb =
  | "higher_is_better"
  | "lower_is_better"
  | "range"
  | "exact"
  | "boolean";
export type ScorecardStatusDb = "green" | "yellow" | "red" | "na";
export type RockStatusDb = "on_track" | "off_track" | "done" | "dropped";
export type RockTypeDb = "company" | "team" | "individual";
export type IssueStatusDb = "open" | "discussing" | "solved" | "archived";
export type TodoStatusDb = "open" | "done" | "cancelled";
export type TodoSourceTypeDb = "issue" | "rock" | "meeting" | "manual";
export type MeetingTypeDb = "l10" | "other";
export type MeetingStatusDb =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";
export type AiSuggestionTypeDb =
  | "todo"
  | "issue_merge"
  | "meeting_summary"
  | "scorecard_insight"
  | "agenda_focus";
export type AiSuggestionStatusDb = "pending" | "approved" | "dismissed";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings: Json;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          org_role: OrgRoleDb;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          org_role: OrgRoleDb;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          org_role?: OrgRoleDb;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "teams_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          team_role: TeamRoleDb;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          team_role: TeamRoleDb;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string;
          team_role?: TeamRoleDb;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          org_role: OrgRoleDb;
          token: string;
          expires_at: string;
          accepted_at: string | null;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          org_role: OrgRoleDb;
          token: string;
          expires_at: string;
          accepted_at?: string | null;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          org_role?: OrgRoleDb;
          token?: string;
          expires_at?: string;
          accepted_at?: string | null;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          actor_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      accountability_seats: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          parent_id: string | null;
          responsibilities: string | null;
          assigned_user_id: string | null;
          display_order: number;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          parent_id?: string | null;
          responsibilities?: string | null;
          assigned_user_id?: string | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          title?: string;
          parent_id?: string | null;
          responsibilities?: string | null;
          assigned_user_id?: string | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "accountability_seats_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accountability_seats_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "accountability_seats";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_runs: {
        Row: {
          id: string;
          organization_id: string;
          actor_id: string;
          function_name: string;
          input_summary: string;
          output_summary: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_id: string;
          function_name: string;
          input_summary: string;
          output_summary?: string | null;
          status: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          actor_id?: string;
          function_name?: string;
          input_summary?: string;
          output_summary?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_runs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_suggestions: {
        Row: {
          id: string;
          organization_id: string;
          ai_run_id: string;
          suggestion_type: AiSuggestionTypeDb;
          payload: Json;
          status: AiSuggestionStatusDb;
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          ai_run_id: string;
          suggestion_type: AiSuggestionTypeDb;
          payload: Json;
          status?: AiSuggestionStatusDb;
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          ai_run_id?: string;
          suggestion_type?: AiSuggestionTypeDb;
          payload?: Json;
          status?: AiSuggestionStatusDb;
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_suggestions_ai_run_id_fkey";
            columns: ["ai_run_id"];
            isOneToOne: false;
            referencedRelation: "ai_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_sso_settings: {
        Row: {
          id: string;
          organization_id: string;
          provider_type: SsoProviderTypeDb;
          provider_name: string;
          domain: string;
          enforced: boolean;
          allow_email_password_login: boolean;
          auto_join_enabled: boolean;
          default_org_role: SsoMappableRoleDb;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          provider_type: SsoProviderTypeDb;
          provider_name: string;
          domain: string;
          enforced?: boolean;
          allow_email_password_login?: boolean;
          auto_join_enabled?: boolean;
          default_org_role?: SsoMappableRoleDb;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          provider_type?: SsoProviderTypeDb;
          provider_name?: string;
          domain?: string;
          enforced?: boolean;
          allow_email_password_login?: boolean;
          auto_join_enabled?: boolean;
          default_org_role?: SsoMappableRoleDb;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_sso_settings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_sso_role_mappings: {
        Row: {
          id: string;
          organization_id: string;
          provider_group: string;
          org_role: SsoMappableRoleDb;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          provider_group: string;
          org_role: SsoMappableRoleDb;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          provider_group?: string;
          org_role?: SsoMappableRoleDb;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_sso_role_mappings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_verified_domains: {
        Row: {
          id: string;
          organization_id: string;
          domain: string;
          verified_at: string;
          verification_method: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          domain: string;
          verified_at?: string;
          verification_method: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          domain?: string;
          verified_at?: string;
          verification_method?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_verified_domains_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      scorecard_metrics: {
        Row: {
          id: string;
          organization_id: string;
          team_id: string | null;
          owner_id: string;
          name: string;
          unit: string | null;
          description: string | null;
          target_rule: ScorecardTargetRuleDb;
          target_value: number | null;
          target_min: number | null;
          target_max: number | null;
          tolerance_percent: number;
          display_order: number;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          team_id?: string | null;
          owner_id: string;
          name: string;
          unit?: string | null;
          description?: string | null;
          target_rule: ScorecardTargetRuleDb;
          target_value?: number | null;
          target_min?: number | null;
          target_max?: number | null;
          tolerance_percent?: number;
          display_order?: number;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          team_id?: string | null;
          owner_id?: string;
          name?: string;
          unit?: string | null;
          description?: string | null;
          target_rule?: ScorecardTargetRuleDb;
          target_value?: number | null;
          target_min?: number | null;
          target_max?: number | null;
          tolerance_percent?: number;
          display_order?: number;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scorecard_metrics_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scorecard_metrics_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      scorecard_values: {
        Row: {
          id: string;
          organization_id: string;
          metric_id: string;
          period_start: string;
          actual: number | null;
          target_snapshot: number | null;
          status_override: ScorecardStatusDb | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          metric_id: string;
          period_start: string;
          actual?: number | null;
          target_snapshot?: number | null;
          status_override?: ScorecardStatusDb | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          metric_id?: string;
          period_start?: string;
          actual?: number | null;
          target_snapshot?: number | null;
          status_override?: ScorecardStatusDb | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scorecard_values_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scorecard_values_metric_id_fkey";
            columns: ["metric_id"];
            isOneToOne: false;
            referencedRelation: "scorecard_metrics";
            referencedColumns: ["id"];
          },
        ];
      };
      rocks: {
        Row: {
          id: string;
          organization_id: string;
          team_id: string | null;
          title: string;
          owner_id: string;
          quarter: string;
          status: RockStatusDb;
          confidence: number | null;
          due_date: string | null;
          success_definition: string | null;
          progress: number;
          rock_type: RockTypeDb;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          team_id?: string | null;
          title: string;
          owner_id: string;
          quarter: string;
          status?: RockStatusDb;
          confidence?: number | null;
          due_date?: string | null;
          success_definition?: string | null;
          progress?: number;
          rock_type?: RockTypeDb;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          team_id?: string | null;
          title?: string;
          owner_id?: string;
          quarter?: string;
          status?: RockStatusDb;
          confidence?: number | null;
          due_date?: string | null;
          success_definition?: string | null;
          progress?: number;
          rock_type?: RockTypeDb;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rocks_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rocks_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      issues: {
        Row: {
          id: string;
          organization_id: string;
          team_id: string | null;
          title: string;
          description: string | null;
          owner_id: string | null;
          priority: number;
          status: IssueStatusDb;
          ids_notes: string | null;
          linked_metric_id: string | null;
          linked_rock_id: string | null;
          linked_meeting_id: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          team_id?: string | null;
          title: string;
          description?: string | null;
          owner_id?: string | null;
          priority?: number;
          status?: IssueStatusDb;
          ids_notes?: string | null;
          linked_metric_id?: string | null;
          linked_rock_id?: string | null;
          linked_meeting_id?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          team_id?: string | null;
          title?: string;
          description?: string | null;
          owner_id?: string | null;
          priority?: number;
          status?: IssueStatusDb;
          ids_notes?: string | null;
          linked_metric_id?: string | null;
          linked_rock_id?: string | null;
          linked_meeting_id?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "issues_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_linked_metric_id_fkey";
            columns: ["linked_metric_id"];
            isOneToOne: false;
            referencedRelation: "scorecard_metrics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_linked_rock_id_fkey";
            columns: ["linked_rock_id"];
            isOneToOne: false;
            referencedRelation: "rocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_linked_rock_id_fkey";
            columns: ["linked_rock_id"];
            isOneToOne: false;
            referencedRelation: "rocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_linked_meeting_id_fkey";
            columns: ["linked_meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
      meetings: {
        Row: {
          id: string;
          organization_id: string;
          team_id: string | null;
          title: string;
          meeting_type: MeetingTypeDb;
          status: MeetingStatusDb;
          started_at: string | null;
          ended_at: string | null;
          agenda_template: Json;
          active_section_key: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          team_id?: string | null;
          title?: string;
          meeting_type?: MeetingTypeDb;
          status?: MeetingStatusDb;
          started_at?: string | null;
          ended_at?: string | null;
          agenda_template?: Json;
          active_section_key?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          team_id?: string | null;
          title?: string;
          meeting_type?: MeetingTypeDb;
          status?: MeetingStatusDb;
          started_at?: string | null;
          ended_at?: string | null;
          agenda_template?: Json;
          active_section_key?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meetings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meetings_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_notes: {
        Row: {
          id: string;
          organization_id: string;
          meeting_id: string;
          section_key: string;
          content: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          meeting_id: string;
          section_key: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          meeting_id?: string;
          section_key?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_notes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_notes_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
      decisions: {
        Row: {
          id: string;
          organization_id: string;
          meeting_id: string;
          title: string;
          description: string | null;
          decided_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          meeting_id: string;
          title: string;
          description?: string | null;
          decided_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          meeting_id?: string;
          title?: string;
          description?: string | null;
          decided_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "decisions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decisions_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
      todos: {
        Row: {
          id: string;
          organization_id: string;
          team_id: string | null;
          title: string;
          owner_id: string;
          due_date: string | null;
          status: TodoStatusDb;
          source_type: TodoSourceTypeDb | null;
          source_id: string | null;
          completed_at: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          team_id?: string | null;
          title: string;
          owner_id: string;
          due_date?: string | null;
          status?: TodoStatusDb;
          source_type?: TodoSourceTypeDb | null;
          source_id?: string | null;
          completed_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          team_id?: string | null;
          title?: string;
          owner_id?: string;
          due_date?: string | null;
          status?: TodoStatusDb;
          source_type?: TodoSourceTypeDb | null;
          source_id?: string | null;
          completed_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "todos_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "todos_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      vto_sections: {
        Row: {
          id: string;
          organization_id: string;
          section_key: string;
          title: string;
          content: string;
          display_order: number;
          visible: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          section_key: string;
          title: string;
          content?: string;
          display_order?: number;
          visible?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          section_key?: string;
          title?: string;
          content?: string;
          display_order?: number;
          visible?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vto_sections_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      vto_snapshots: {
        Row: {
          id: string;
          organization_id: string;
          snapshot_data: Json;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          snapshot_data: Json;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          snapshot_data?: Json;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vto_snapshots_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_org_member: {
        Args: { org_id: string };
        Returns: boolean;
      };
      is_org_admin: {
        Args: { org_id: string };
        Returns: boolean;
      };
      is_org_owner: {
        Args: { org_id: string };
        Returns: boolean;
      };
      is_team_member: {
        Args: { team_id: string };
        Returns: boolean;
      };
      is_team_leader: {
        Args: { team_id: string };
        Returns: boolean;
      };
      can_view_org: {
        Args: { org_id: string };
        Returns: boolean;
      };
      can_manage_org: {
        Args: { org_id: string };
        Returns: boolean;
      };
      can_manage_team: {
        Args: { team_id: string };
        Returns: boolean;
      };
      set_updated_at: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Organization = Tables<"organizations">;
export type OrganizationMember = Tables<"organization_members">;
export type Team = Tables<"teams">;
export type TeamMember = Tables<"team_members">;
export type Invitation = Tables<"invitations">;
export type AuditLog = Tables<"audit_logs">;
export type AccountabilitySeat = Tables<"accountability_seats">;
export type AiRun = Tables<"ai_runs">;
export type AiSuggestion = Tables<"ai_suggestions">;
export type OrganizationSsoSettings = Tables<"organization_sso_settings">;
export type OrganizationSsoRoleMapping = Tables<"organization_sso_role_mappings">;
export type OrganizationVerifiedDomain = Tables<"organization_verified_domains">;
export type ScorecardMetric = Tables<"scorecard_metrics">;
export type ScorecardValue = Tables<"scorecard_values">;
export type Rock = Tables<"rocks">;
export type Issue = Tables<"issues">;
export type Todo = Tables<"todos">;
export type Meeting = Tables<"meetings">;
export type MeetingNote = Tables<"meeting_notes">;
export type Decision = Tables<"decisions">;
export type VtoSection = Tables<"vto_sections">;
export type VtoSnapshot = Tables<"vto_snapshots">;
