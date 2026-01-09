import { listMembershipsByMinistry, Membership } from "@/services/memberships";
import { notifyUsers } from "./NotificationService";

/* =========================
   TYPES
========================= */

type PublishContext =
  | {
    type: "service";
    serviceDate: string;
    serviceId: string;
    serviceLabel: string;
    month: number;
    year: number;
  }
  | {
    type: "month";
    month: number;
    year: number;
  };

/* =========================
   NOTIFY
========================= */

function monthNamePt(month: number) {
  return new Date(2024, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
  });
}

export async function notifySchedulesPublished(params: {
  ministryIds: string[];
  context: PublishContext;
}) {
  const { ministryIds, context } = params;
  if (ministryIds.length === 0) return;

  /* =========================
     LOAD MEMBERS
  ========================= */

  const membershipsByMinistry = await Promise.all(
    ministryIds.map((ministryId) =>
      listMembershipsByMinistry(ministryId)
    )
  );

  const memberships: Membership[] = membershipsByMinistry.flat();

  const userIds: string[] = Array.from(
    new Set(
      memberships
        .filter((m) => m.active)
        .map((m) => m.userId)
    )
  );

  if (userIds.length === 0) return;

  /* =========================
     MESSAGE + ENTITY
  ========================= */

  let title: string;
  let body: string;
  let relatedEntity:
    | {
      type: string;
      id: string;
    }
    | undefined;

  if (context.type === "service") {

    const date = new Date(`${context.serviceDate}T12:00:00`);
    const formattedDate = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    title = "Escala publicada";
    body = `A escala do culto ${context.serviceLabel} (${formattedDate}) foi publicada.`;

    // 🔑 ID semântico do culto
    relatedEntity = {
      type: "service",
      id: `${context.serviceDate}__${context.serviceId}`,
    };
  } else {
    title = "Escala mensal publicada";
    const monthLabel = monthNamePt(context.month);

    body = `A escala do mês de ${monthLabel} foi publicada.`;

    // 🔑 ID semântico do mês
    relatedEntity = {
      type: "month",
      id: `${context.year}-${String(context.month).padStart(2, "0")}`,
    };
  }

  /* =========================
     SEND
  ========================= */

  await notifyUsers({
    userIds,
    type: "schedule_published",
    title,
    body,
    relatedEntity,
  });
}
