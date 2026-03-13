import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '@/data/colors';
import { CL_LIMITS } from '@/data/clinicalLimits';
import { addD, toId } from '@/utils/dates';
import S from '@/utils/storage';
import Card from '@/components/Card';
import SectionLabel from '@/components/SectionLabel';
import TrendChart from '@/components/TrendChart';
import type { DailyLog } from '@/data/types';

interface DataPoint {
  date: Date;
  log: DailyLog | null;
}

export default function HistoryScreen() {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      const today = new Date();
      const points: DataPoint[] = [];

      // Load last 30 days of data
      for (let i = 29; i >= 0; i--) {
        const date = addD(today, -i);
        const dateId = toId(date);
        const log = await S.get(`log_${dateId}`);
        points.push({ date, log });
      }

      setDataPoints(points);
      setLoaded(true);
    }
    load();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>History & Trends</Text>
          <Text style={styles.subtitle}>Last 30 days of tracking</Text>
        </View>
      </View>

      {!loaded ? (
        <Card>
          <Text style={styles.loadingText}>Loading data...</Text>
        </Card>
      ) : null}

      {/* Weight Trend */}
      <SectionLabel title="Weight Tracking" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="weight"
          label="Weight"
          unit="lbs"
          color={colors.indigo500}
          dangerAbove={undefined}
        />
        <Text style={styles.chartNote}>Monitor for sudden weight gain (more than 2 lbs in 24 hours)</Text>
      </Card>

      {/* Temperature Trends */}
      <SectionLabel title="Temperature" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="amTemp"
          label="Morning Temperature"
          unit="°F"
          color={colors.cyan800}
          dangerAbove={CL_LIMITS.feverWarning}
        />
        <View style={{ height: 20 }} />
        <TrendChart
          data={dataPoints}
          dataKey="pmTemp"
          label="Evening Temperature"
          unit="°F"
          color={colors.orange700}
          dangerAbove={CL_LIMITS.feverWarning}
        />
        <Text style={styles.chartNote}>Contact team if temperature exceeds 101.5°F</Text>
      </Card>

      {/* Blood Pressure Trends */}
      <SectionLabel title="Blood Pressure (Systolic)" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="amSys"
          label="Morning BP Systolic"
          unit="mmHg"
          color={colors.rose500}
          dangerAbove={CL_LIMITS.bpSysHigh}
          dangerBelow={CL_LIMITS.bpSysLow}
        />
        <View style={{ height: 20 }} />
        <TrendChart
          data={dataPoints}
          dataKey="pmSys"
          label="Evening BP Systolic"
          unit="mmHg"
          color={colors.rose600}
          dangerAbove={CL_LIMITS.bpSysHigh}
          dangerBelow={CL_LIMITS.bpSysLow}
        />
        <Text style={styles.chartNote}>Target range: 100-160 mmHg systolic</Text>
      </Card>

      {/* Heart Rate Trends */}
      <SectionLabel title="Heart Rate" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="amHr"
          label="Morning Heart Rate"
          unit="bpm"
          color={colors.pink400}
          dangerAbove={CL_LIMITS.hrHigh}
          dangerBelow={CL_LIMITS.hrLow}
        />
        <View style={{ height: 20 }} />
        <TrendChart
          data={dataPoints}
          dataKey="pmHr"
          label="Evening Heart Rate"
          unit="bpm"
          color={colors.purple700}
          dangerAbove={CL_LIMITS.hrHigh}
          dangerBelow={CL_LIMITS.hrLow}
        />
        <Text style={styles.chartNote}>Target range: 60-120 bpm</Text>
      </Card>

      {/* Lab Values */}
      <SectionLabel title="Lab Values" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="labCr"
          label="Creatinine"
          unit="mg/dL"
          color={colors.emerald500}
        />
        <View style={{ height: 20 }} />
        <TrendChart
          data={dataPoints}
          dataKey="labTac"
          label="Tacrolimus"
          unit="ng/mL"
          color={colors.indigo500}
        />
        <View style={{ height: 20 }} />
        <TrendChart
          data={dataPoints}
          dataKey="labGfr"
          label="GFR"
          unit="mL/min"
          color={colors.sky400}
        />
        <Text style={styles.chartNote}>Lab values show kidney function and immunosuppression levels</Text>
      </Card>

      {/* Fluid Intake */}
      <SectionLabel title="Fluid Intake" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="fluidMl"
          label="Daily Fluid Intake"
          unit="mL"
          color={colors.blue700}
          dangerBelow={CL_LIMITS.fluidGoal * 0.75}
        />
        <Text style={styles.chartNote}>Daily goal: {CL_LIMITS.fluidGoal} mL</Text>
      </Card>

      {/* Pain Level */}
      <SectionLabel title="Pain Level" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="pain"
          label="Pain Score"
          unit="/10"
          color={colors.amber500}
        />
        <Text style={styles.chartNote}>Track pain trends and report persistent high pain to your team</Text>
      </Card>

      {/* Info */}
      <Card flat style={{ backgroundColor: colors.sky50 }}>
        <Text style={styles.infoTitle}>Reading Your Trends</Text>
        <Text style={styles.infoText}>
          • Upward trends may indicate issues needing attention{'\n'}
          • Sudden changes should be reported to your care team{'\n'}
          • Red values are outside safe ranges{'\n'}
          • Keep tracking daily for accurate trends
        </Text>
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: colors.slate800 },
  subtitle: { fontSize: 14, color: colors.slate500, marginTop: 2 },
  loadingText: { fontSize: 14, color: colors.slate500, textAlign: 'center', paddingVertical: 20 },
  chartNote: { fontSize: 11, color: colors.slate500, marginTop: 12, lineHeight: 16 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: colors.sky700, marginBottom: 8 },
  infoText: { fontSize: 12, color: colors.sky700, lineHeight: 20 },
});
