/** A seed must never create (or reset) an account with a public default password. */
export function requiredAdminPassword(
	env: Record<string, string | undefined>,
): string {
	const password = env.ADMIN_PASSWORD;
	if (!password)
		throw new Error("Set ADMIN_PASSWORD before seeding an admin user");
	if (password.length < 12)
		throw new Error("ADMIN_PASSWORD must contain at least 12 characters");
	return password;
}
