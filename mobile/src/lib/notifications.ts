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
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return;

  // Cancel any existing notification for this med first
  await cancelMedReminder(med.id);

  await Notifications.scheduleNotificationAsync({
    identifier: `med_${med.id}`,
    content: {
      // Generic text only — med name and dosage are PHI and must not appear
      // on the lock screen where they're visible to anyone who picks up the phone.
      title: '💊 Time for your medication',
      body: 'Tap to log your dose in TransplantTracker',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  // Schedule escalation notification for critical meds (e.g. tacrolimus)
  // If dose not logged within 3 hours of reminder, send a follow-up
  if (med.critical || med.criticalEscalation) {
    await scheduleEscalationReminder(med, hour, minute);
  }
}

/**
 * Schedule an escalation reminder 3 hours after the primary reminder.
 * Used for tacrolimus and other critical meds where a missed dose is dangerous.
 * PHI-safe: no med name or dose details.
 */
export async function scheduleEscalationReminder(med: Medication, primaryHour: number, primaryMinute: number): Promise<void> {
  try {
    await cancelEscalationReminder(med.id);

    const escalateHour = (primaryHour + 3) % 24;

    await Notifications.scheduleNotificationAsync({
      identifier: `esc_${med.id}`,
      content: {
        title: '⚠️ Medication Reminder',
        body: 'Have you taken your medication today? Missing a dose can be serious.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: escalateHour,
        minute: primaryMinute,
      },
    });
  } catch (e) {
    console.warn(`scheduleEscalationReminder: failed for ${med.id}`, e);
  }
}

export async function cancelEscalationReminder(medId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`esc_${medId}`);
  } catch {
    // Silent — escalation may not have been scheduled
  }
}

export async function cancelMedReminder(medId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`med_${medId}`);
  } catch (e) {
    console.warn(`cancelMedReminder: failed to cancel reminder for ${medId}`, e);
  }
  await cancelEscalationReminder(medId);
}

/**
 * Schedule a lab prep reminder the evening before a lab appointment.
 * Reminds tacrolimus users to take dose AFTER blood draw.
 */
export async function scheduleLabPrepReminder(appointmentId: string, labDate: string): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const labDay = new Date(`${labDate}T12:00:00`);
    const evening = new Date(labDay);
    evening.setDate(evening.getDate() - 1);
    evening.setHours(20, 0, 0, 0); // 8pm evening before

    if (evening <= new Date()) return; // already past

    await Notifications.scheduleNotificationAsync({
      identifier: `lab_prep_${appointmentId}`,
      content: {
        title: '🧪 Lab Day Tomorrow',
        body: 'Remember: if you take tacrolimus, wait until AFTER your blood draw for your morning dose.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: evening,
      },
    });
  } catch (e) {
    console.warn('scheduleLabPrepReminder failed:', e);
  }
}

export async function cancelLabPrepReminder(appointmentId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`lab_prep_${appointmentId}`);
  } catch {
    // Silent
  }
}

export async function rescheduleAll(meds: Medication[]): Promise<void> {
  // Guard: do not attempt to schedule if permission is not granted
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  try {
    // Cancel all existing med/escalation notifications then rebuild
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier.startsWith('med_') || n.identifier.startsWith('esc_')) {
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
