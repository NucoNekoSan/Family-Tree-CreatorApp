import { authApi } from "./api/auth";
import { chartApi } from "./api/charts";
import { settingsApi } from "./api/settings";

export { ApiError } from "./api/transport";

export const api = { ...authApi, ...chartApi, ...settingsApi };
