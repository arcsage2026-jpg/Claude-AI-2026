import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";

// Expo Go (Android, SDK 53+) hard-throws from setNotificationHandler's
// internal push-token bootstrapping — Google Play policy forced Expo to
// strip remote-push support from the shared Expo Go app, and that check now
// throws instead of warning. We only use local scheduled notifications
// (no push tokens involved), but the throw happens before we get a say, so
// guard it: in a development build or on iOS this always succeeds; in Expo
// Go on Android it fails and notifications silently no-op instead of taking
// the whole app down.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) { /* Expo Go / Android push restriction — see comment above */ }

if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch(() => { /* ignore */ });
}

export async function requestNotifyPermission() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch (e) {
    return false;
  }
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
