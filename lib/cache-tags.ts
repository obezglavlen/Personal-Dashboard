/**
 * Cache-tag builders shared between the API CRUD layer and the dashboard's
 * server render. Tags are per-user so one user's writes never invalidate
 * another's cached reads. Used with Next's `unstable_cache` (tagging) and
 * `revalidateTag` (busting on mutation).
 */

/** Tag for a resource's cached list read, e.g. `list:task:<userId>`. */
export const listTag = (resource: string, userId: string) =>
	`list:${resource}:${userId}`;

/** Tag for the dashboard's aggregate counts/recent-lists for a user. */
export const dashboardTag = (userId: string) => `dashboard:${userId}`;
