import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { subscriptionSchema } from "@/lib/validations/subscription";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.subscription.findMany({
    where: { userId: session.user.id },
    orderBy: [{ createdAt: "desc" }],
  });

  const subs = rows.map((s) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price),
    period: s.period,
    startDate: s.startDate.toISOString(),
    category: s.category,
    currency: s.currency,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return NextResponse.json(subs);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = subscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { startDate, ...data } = parsed.data;
  const sub = await prisma.subscription.create({
    data: {
      ...data,
      startDate: startDate ? new Date(startDate) : new Date(),
      userId: session.user.id,
    },
  });

  return NextResponse.json(
    {
      ...sub,
      price: Number(sub.price),
      startDate: sub.startDate.toISOString(),
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    },
    { status: 201 }
  );
}