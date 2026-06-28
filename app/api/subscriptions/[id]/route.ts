import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { subscriptionSchema } from "@/lib/validations/subscription";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = subscriptionSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { startDate, ...data } = parsed.data;
  const sub = await prisma.subscription.update({
    where: { id, userId: session.user.id },
    data: {
      ...data,
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : new Date() }),
    },
  });

  return NextResponse.json({
    ...sub,
    price: Number(sub.price),
    startDate: sub.startDate.toISOString(),
    createdAt: sub.createdAt.toISOString(),
    updatedAt: sub.updatedAt.toISOString(),
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.subscription.delete({ where: { id, userId: session.user.id } });
  return NextResponse.json({ success: true });
}