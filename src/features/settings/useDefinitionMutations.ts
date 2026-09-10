import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";
import type { GenderDefinition, RelationshipDefinition } from "../../types";

export function useRelationshipMutations(onSaved: () => void) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (value: Partial<RelationshipDefinition>) =>
      value.id
        ? api.updateRelationship(value.id, value)
        : api.createRelationship(
            value as Omit<RelationshipDefinition, "id" | "usageCount">,
          ),
    onSuccess: () => {
      onSaved();
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
    },
  });
  const remove = useMutation({
    mutationFn: api.deleteRelationship,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["relationships"] }),
  });
  return { save, remove };
}

export function useGenderMutations(onSaved: () => void) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (value: Partial<GenderDefinition>) =>
      value.id
        ? api.updateGender(value.id, value)
        : api.createGender(
            value as Omit<GenderDefinition, "id" | "usageCount">,
          ),
    onSuccess: () => {
      onSaved();
      queryClient.invalidateQueries({ queryKey: ["genders"] });
    },
  });
  const remove = useMutation({
    mutationFn: api.deleteGender,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["genders"] }),
  });
  return { save, remove };
}
