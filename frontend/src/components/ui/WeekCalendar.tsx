import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function WeekCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const daysOfWeek = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday
    // Monday as start of week
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  return (
    <View style={s.container}>
      {daysOfWeek.map((day, idx) => {
        const isSelected = isSameDay(day, selectedDate);
        const dayLabel = DAY_LABELS[day.getDay()];
        const dateNum = day.getDate();

        return (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.8}
            onPress={() => setSelectedDate(day)}
            style={[s.dayBox, isSelected && s.dayBoxActive]}
          >
            <Text style={[s.label, isSelected && s.labelActive]}>{dayLabel}</Text>
            <Text style={[s.date, isSelected && s.dateActive]}>{dateNum}</Text>
            <View style={[s.dot, isSelected && s.dotActive]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dayBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 64,
    borderRadius: 22,
    gap: 4,
  },
  dayBoxActive: {
    backgroundColor: '#1E5136',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  labelActive: {
    color: '#D1E7DD',
    fontWeight: '600',
  },
  date: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  dateActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
  },
  dotActive: {
    backgroundColor: '#4ADE80',
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
