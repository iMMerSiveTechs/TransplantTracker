import * as Notifications from 'expo-notifications';
import type { Medication } from '@/data/types';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a daily repeating notification for a medication.
 * reminderTime format: "HH:MM" (24-hour)
 */
export async function scheduleMedReminder(med: Medication): Promise<void> {
  if (!med.reminderTime || !med.notifyEnabled) return;

  const [hourStr, minuteStr] = med.reminderTime.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  if (isNaN(hour) || isNaN(minute)) return;

  // Cancel any existing notification for this med first
  await cancelMedReminder(med.id);

  await Notifications.scheduleNotificationAsync({
    identifier: `med_${med.id}`,
    content: {
      title: `💊 Time for ${med.name}`,
      body: med.instr || `Take your ${med.dosage} dose`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelMedReminder(medId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`med_${medId}`);
  } catch (e) {
    console.warn(`cancelMedReminder: failed to cancel reminder for ${medId}`, e);
  }
}

export async function rescheduleAll(meds: Medication[]): Promise<void> {
  // Guard: do not attempt to schedule if permission is not granted
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  try {
    // Cancel all existing med notifications then rebuild
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier.startsWith('med_')) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    for (const med of meds) {
      if (med.notifyEnabled && med.reminderTime) {
        await scheduleMedReminder(med);
      }
    }
  } catch (e) {
    console.warn('rescheduleAll: failed to reschedule notifications', e);
  }
}
