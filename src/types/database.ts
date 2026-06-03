// src/types/database.ts

export enum OrganizationType {
  School = "School",
  Nonprofit = "Nonprofit",
  Business = "Business",
}

export interface Organization {
  id: string; // UUID
  name: string;
  type: OrganizationType;
  created_by: string; // UUID — FK to auth.users.id
  created_at: string; // ISO 8601 timestamptz
  school_district: string | null;
  member_count?: number; // computed via join or separate query
}

export interface OrganizationMember {
  id: string; // UUID
  organization_id: string; // UUID — FK to organizations.id
  user_id: string | null; // UUID — FK to auth.users.id (null until accepted)
  email: string;
  status: "invited" | "active";
  role: "admin" | "member";
  invited_at: string | null; // ISO 8601 timestamptz
  joined_at: string | null; // ISO 8601 timestamptz
  invite_token: string | null; // used for accept-invite flow
  token_expires_at: string | null; // ISO 8601 timestamptz
}

// API response types for Edge Functions
export interface InviteMemberRequest {
  organization_id: string;
  email: string;
}

export interface InviteMemberResponse {
  success: boolean;
  member?: OrganizationMember;
  error?: string;
}

export interface ApiError {
  error: string;
  status: number;
}

export interface CreateOrganizationPayload {
  name: string;
  type: OrganizationType;
  school_district?: string;
  created_by: string;
}
