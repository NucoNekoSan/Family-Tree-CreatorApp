import { useQuery } from "@tanstack/react-query";
import { api } from "../../api";

export function useSettingsDefinitions() {
  const relationships = useQuery({
    queryKey: ["relationships"],
    queryFn: api.relationships,
  });
  const genders = useQuery({
    queryKey: ["genders"],
    queryFn: api.genders,
  });
  return { relationships, genders };
}
