import { Schedule } from "../schedule/schedules";
import { notifyUsers } from "./NotificationService";
import { schedulePublishedTemplate } from "./NotificationTemplates";
import { listMembershipsByMinistry } from "@/services/memberships";

export async function onSchedulePublished(schedule: Schedule) {
  console.log("[onSchedulePublished] start", schedule.id);

  const memberships = await listMembershipsByMinistry(schedule.ministryId);

  console.log(
    "[onSchedulePublished] memberships",
    memberships.length
  );

  const userIds = memberships.map((m) => m.userId);

  console.log("[onSchedulePublished] userIds", userIds);

  if (userIds.length === 0) {
    console.warn("[onSchedulePublished] no recipients");
    return;
  }

  const message = schedulePublishedTemplate({
    ministryName: schedule.serviceLabel,
    month: schedule.month,
    year: schedule.year,
  });

  await notifyUsers({
    userIds,
    type: "schedule_published",
    title: message.title,
    body: message.body,
    relatedEntity: {
      type: "schedule",
      id: schedule.id,
    },
  });

  console.log("[onSchedulePublished] done");
}