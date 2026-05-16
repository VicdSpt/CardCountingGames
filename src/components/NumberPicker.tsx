import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { colors, radius, spacing, shadow } from '../theme';

interface NumberPickerProps {
  value: number | null;
  min: number;
  max: number;
  onChange: (v: number) => void;
  placeholder?: string;
  color?: string;
}

export function NumberPicker({ value, min, max, onChange, placeholder = '?', color = colors.accent }: NumberPickerProps) {
  const [open, setOpen] = React.useState(false);
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { borderColor: value !== null ? color : colors.border }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, { color: value !== null ? color : colors.textMuted }]}>
          {value !== null ? String(value) : placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, shadow.md]}>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item)}
              numColumns={5}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item === value && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => { onChange(item); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, item === value && styles.optionTextSelected]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  triggerText: {
    fontSize: 17,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,25,23,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    width: 280,
    maxHeight: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  grid: { gap: spacing.xs },
  option: {
    width: 44,
    height: 44,
    margin: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  optionTextSelected: { color: colors.white, fontWeight: '700' },
});
