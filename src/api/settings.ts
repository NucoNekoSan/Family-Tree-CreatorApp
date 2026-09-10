import type { GenderDefinition, RelationshipDefinition } from "../types";
import { json, request } from "./transport";

export const settingsApi = {
  relationships: () =>
    request<RelationshipDefinition[]>("/settings/relationships"),
  createRelationship: (
    input: Omit<RelationshipDefinition, "id" | "usageCount">,
  ) =>
    request<RelationshipDefinition>(
      "/settings/relationships",
      json("POST", input),
    ),
  updateRelationship: (id: string, input: Partial<RelationshipDefinition>) =>
    request<RelationshipDefinition>(
      `/settings/relationships/${id}`,
      json("PATCH", input),
    ),
  deleteRelationship: (id: string) =>
    request<void>(`/settings/relationships/${id}`, json("DELETE")),
  genders: () => request<GenderDefinition[]>("/settings/genders"),
  createGender: (input: Omit<GenderDefinition, "id" | "usageCount">) =>
    request<GenderDefinition>("/settings/genders", json("POST", input)),
  updateGender: (id: string, input: Partial<GenderDefinition>) =>
    request<GenderDefinition>(`/settings/genders/${id}`, json("PATCH", input)),
  deleteGender: (id: string) =>
    request<void>(`/settings/genders/${id}`, json("DELETE")),
};
