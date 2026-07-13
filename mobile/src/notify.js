import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch(() => { /* ignore */ });
}

export async function requestNotifyPermission() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// Scheduled independently of the foreground JS countdown, since backgrounded
// JS timers stall — this is what actually fires if the app isn't in the
// foreground when the rest period ends.
export async function scheduleRestOverNotification(seconds) {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: "Rest over", body: "Time for your next set." },
      trigger: { seconds, channelId: "default" },
    });
  } catch (e) {
    return null;
  }
}

export async function cancelNotification(id) {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) { /* ignore */ }
}

export function hapticRestOver() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { /* ignore */ });
}
