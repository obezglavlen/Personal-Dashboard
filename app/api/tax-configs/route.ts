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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.taxConfig.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(rows.map(serialize));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = taxConfigSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const cfg = await prisma.taxConfig.create({
      data: { ...parsed.data, userId: session.user.id },
    });
    return NextResponse.json(serialize(cfg), { status: 201 });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Tax type with this name already exists" }, { status: 409 });
    }
    throw e;
  }
}