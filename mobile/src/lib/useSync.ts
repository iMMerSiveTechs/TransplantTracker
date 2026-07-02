import { useEffect, useRef } from 'react';
import S from '@/utils/storage';
import { api } from '@/lib/api/api';
import { toId } from '@/utils/dates';

export function useBackgroundSync() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function sync() {
      try {
        const isLoggedIn = await S.get('auth_logged_in');
        if (!isLoggedIn) return;

        const profile = await S.get('profile');
        const medications = await S.get('medications');
        const appointments = await S.get('appointments');

        const today = new Date();
        const logs: any[] = [];
        for (let i = 0; i < 14; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const id = toId(d);
          const log = await S.get(`log_${id}`);
          if (log) {
            logs.push({ ...log, date: id });
          }
        }

        const payload: any = { logs };

        if (profile) {
          payload.profile = {
            name: profile.name,
            type: profile.type,
            surgDate:
              profile.surgDate instanceof Date
                ? profile.surgDate.toISOString().split('T')[0]
                : typeof profile.surgDate === 'string'
                  ? profile.surgDate.split('T')[0]
                  : String(profile.surgDate),
            emergPhone: profile.emergPhone || '',
            contacts: profile.contacts || [],
          };
        }

        if (medications?.length) {
          payload.medications = medications.map((m: any) => ({
            id: m.id,
            name: m.name,
            dosage: m.dosage,
            instr: m.instr || '',
            inv: m.inv ?? 0,
            ppd: m.ppd ?? 1,
            critical: m.critical ?? false,
            color: m.color || '#6366f1',
            isTac: m.isTac ?? false,
          }));
        }

        if (appointments?.length) {
          payload.appointments = appointments.map((a: any) => ({
            id: a.id,
            date: a.date,
            time: a.time,
            doc: a.doc,
            desc: a.desc,
            type: a.type || '',
            labBy: a.labBy || '',
          }));
        }

        await api.post('/api/sync', payload);
      } catch (_) {}
    }

    sync();
    timerRef.current = setInterval(sync, 60_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
}
