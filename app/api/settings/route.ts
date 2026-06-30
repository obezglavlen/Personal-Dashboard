import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

const settingsSchema = z.object({
	name: z.string().min(1).optional(),
	currency: z.string().length(3).optional(),
	dashboardLayout: z
		.object({
			order: z.array(z.string()),
			hidden: z.array(z.string()),
		})
		.optional(),
	currentPassword: z.string().optional(),
	newPassword: z.string().min(8).optional(),
});

export async function GET() {
	const session = await getServerSession(authOptions);
	if (!session)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		include: { settings: true },
	});

	return NextResponse.json({
		name: user?.name,
		email: user?.email,
		currency: user?.settings?.currency ?? "USD",
	});
}

export async function PUT(req: Request) {
	const session = await getServerSession(authOptions);
	if (!session)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const body = await req.json();
	const parsed = settingsSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { name, currency, dashboardLayout, currentPassword, newPassword } =
		parsed.data;

	if (name) {
		await prisma.user.update({
			where: { id: session.user.id },
			data: { name },
		});
	}

	if (currency) {
		await prisma.userSettings.upsert({
			where: { userId: session.user.id },
			update: { currency },
			create: { userId: session.user.id, currency },
		});
	}

	if (dashboardLayout) {
		await prisma.userSettings.upsert({
			where: { userId: session.user.id },
			update: { dashboardLayout },
			create: { userId: session.user.id, dashboardLayout },
		});
	}

	if (currentPassword && newPassword) {
		const user = await prisma.user.findUnique({
			where: { id: session.user.id },
		});
		if (!user?.password) {
			return NextResponse.json({ error: "No password set" }, { status: 400 });
		}

		const valid = await verifyPassword(currentPassword, user.password);
		if (!valid) {
			return NextResponse.json(
				{ error: "Current password incorrect" },
				{ status: 400 },
			);
		}

		const hashed = await hashPassword(newPassword);
		await prisma.user.update({
			where: { id: session.user.id },
			data: { password: hashed },
		});
	}

	return NextResponse.json({ success: true });
}
