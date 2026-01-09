import { useEffect, useState } from "react";
import {
  AppNotification,
  listenUserNotifications,
} from "@/services/notifications/notifications";
import { useAuth } from "@/contexts/AuthContext";

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;

    return listenUserNotifications(user.uid, setNotifications);
  }, [user]);

  const unreadCount = notifications.filter(
    (n) => !n.read
  ).length;

  return {
    notifications,
    unreadCount,
  };
}
