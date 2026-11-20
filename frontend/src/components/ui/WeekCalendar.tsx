import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

interface WeekCalendarProps {
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  daysWithMeals?: string[];
}

export default function WeekCalendar({
  selectedDate: propSelectedDate,
  onSelectDate,
  daysWithMeals = [],
}: WeekCalendarProps) {
  const [internalSelected, setInternalSelected] = useState<Date>(new Date());
  const activeDate = propSelectedDate || internalSelected;

  const handleSelect = (day: Date) => {
    if (onSelectDate) {
      onSelectDate(day);
    } else {
      setInternalSelected(day);
    }
  };

  const toDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const daysOfWeek = useMemo(() => {
    const base = propSelectedDate || new Date();
    const currentDay = base.getDay(); // 0 is Sunday
    // Monday as start of week
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(base);
    monday.setDate(base.getDate() + distanceToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [propSelectedDate]);

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  return (
    <View style={s.container}>
      {daysOfWeek.map((day, idx) => {
        const isSelected = isSameDay(day, activeDate);
        const dayLabel = DAY_LABELS[day.getDay()];
        const dateNum = day.getDate();
        const hasMeal = daysWithMeals.includes(toDateKey(day));

        return (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.8}
            onPress={() => handleSelect(day)}
            style={[s.dayBox, isSelected && s.dayBoxActive]}
          >
            <Text style={[s.label, isSelected && s.labelActive]}>{dayLabel}</Text>
            <Text style={[s.date, isSelected && s.dateActive]}>{dateNum}</Text>
            <View
              style={[
                s.dot,
                isSelected
                  ? s.dotActive
                  : hasMeal
                  ? { backgroundColor: '#2E7D4F', width: 5, height: 5, borderRadius: 2.5 }
                  : { opacity: 0.3 },
              ]}
            />
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
