import React, { useState, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import { useColorScheme } from '@/lib/useColorScheme';
import { useClientOnlyValue } from '@/lib/useClientOnlyValue';
import S from '@/utils/storage';
import { toId } from '@/utils/dates';
import type { Medication, MedDose, ClinicalNote } from '@/data/types';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const [medsBadge, setMedsBadge] = useState<number>(0);
  const [notesBadge, setNotesBadge] = useState<number>(0);

  useEffect(() => {
    async function computeBadges() {
      try {
        const meds: Medication[] = (await S.get('medications')) ?? [];
        const doses: MedDose[] = (await S.get(`doses_${toId(new Date())}`)) ?? [];
        // Count critical meds where today's doses not fully logged
        const pending = meds.filter(m => m.critical).reduce((count, m) => {
          const taken = doses.filter(d => d.medId === m.id).length;
          return taken < m.ppd ? count + 1 : count;
        }, 0);
        setMedsBadge(pending);

        // Clinical notes action required
        const notes: ClinicalNote[] = (await S.get('clinical_notes')) ?? [];
        const actionCount = notes.filter(n => n.actionRequired && !n.followUpDate).length;
        setNotesBadge(actionCount);
      } catch {
        // Ignore badge compute errors
      }
    }
    computeBadges();
    // Recompute every 60 seconds
    const interval = setInterval(computeBadges, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#FFFFFF',
          borderTopColor: colorScheme === 'dark' ? '#334155' : '#E2E8F0',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon name="calendar" color={color} />,
          headerTitle: 'Daily Tracking',
        }}
      />
      <Tabs.Screen
        name="labs"
        options={{
          title: 'Labs',
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon name="flask" color={color} />,
          headerTitle: 'Lab Results',
        }}
      />
      <Tabs.Screen
        name="meds"
        options={{
          title: 'Meds',
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon name="medkit" color={color} />,
          headerTitle: 'Medications',
          tabBarBadge: medsBadge > 0 ? medsBadge : undefined,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon name="line-chart" color={color} />,
          headerTitle: 'History & Trends',
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon name="user" color={color} />,
          headerTitle: 'Profile',
        }}
      />
    </Tabs>
  );
}
