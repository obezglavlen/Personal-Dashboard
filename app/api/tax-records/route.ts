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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.taxRecord.findMany({
    where: { userId: session.user.id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { taxConfig: true },
  });
  return NextResponse.json(rows.map(serialize));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = taxRecordSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { month, year, ...rest } = parsed.data;
  const date = new Date(Date.UTC(year, month - 1, 1));

  const rec = await prisma.taxRecord.create({
    data: {
      ...rest,
      date,
      userId: session.user.id,
    },
    include: { taxConfig: true },
  });

  return NextResponse.json(serialize(rec), { status: 201 });
}