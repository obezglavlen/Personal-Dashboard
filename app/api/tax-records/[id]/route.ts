import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { taxRecordSchema } from "@/lib/validations/tax";

function serialize(r: {
  id: string;
  userId: string;
  type: string;
  taxConfigId: string | null;
  date: Date;
  amount: unknown;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  taxConfig?: { name: string } | null;
}) {
  return {
    id: r.id,
    userId: r.userId,
    type: r.type,
    taxConfigId: r.taxConfigId,
    taxConfigName: r.taxConfig?.name ?? null,
    date: r.date.toISOString(),
    amount: r.amount != null ? Number(r.amount) : null,
    description: r.description,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = taxRecordSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { month, year, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (month !== undefined && year !== undefined) {
    data.date = new Date(Date.UTC(year, month - 1, 1));
  }

  try {
    const rec = await prisma.taxRecord.update({
      where: { id, userId: session.user.id },
      data,
      include: { taxConfig: true },
    });
    return NextResponse.json(serialize(rec));
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
    await prisma.taxRecord.delete({ where: { id, userId: session.user.id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }
}