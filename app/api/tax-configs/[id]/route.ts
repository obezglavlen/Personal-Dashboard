import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { taxConfigSchema } from "@/lib/validations/tax";

function serialize(c: {
  id: string;
  userId: string;
  name: string;
  rate: unknown;
  staticAmount: unknown;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: c.id,
    userId: c.userId,
    name: c.name,
    rate: Number(c.rate),
    staticAmount: c.staticAmount != null ? Number(c.staticAmount) : null,
    currency: c.currency,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = taxConfigSchema.partial().safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const cfg = await prisma.taxConfig.update({
      where: { id, userId: session.user.id },
      data: parsed.data,
    });
    return NextResponse.json(serialize(cfg));
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.taxConfig.delete({ where: { id, userId: session.user.id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }
}