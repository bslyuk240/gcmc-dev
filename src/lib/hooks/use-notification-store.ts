"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getNotificationsForDept,
  getUnreadCountForDept,
  markRead,
  markAllReadForDept,
  subscribeNotificationStore,
  syncNotificationsFromSupabase,
  type AppNotification,
} from "@/lib/data/notification-store";

export function useNotificationStore(department: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (typeof window === "undefined") return [];
    return getNotificationsForDept(department);
  });

  const [unreadCount, setUnreadCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    return getUnreadCountForDept(department);
  });

  useEffect(() => {
    syncNotificationsFromSupabase();
    return subscribeNotificationStore(() => {
      setNotifications(getNotificationsForDept(department));
      setUnreadCount(getUnreadCountForDept(department));
    });
  }, [department]);

  const handleMarkRead = useCallback((id: string) => {
    markRead(id);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    markAllReadForDept(department);
  }, [department]);

  return {
    notifications,
    unreadCount,
    markRead: handleMarkRead,
    markAllRead: handleMarkAllRead,
  };
}
