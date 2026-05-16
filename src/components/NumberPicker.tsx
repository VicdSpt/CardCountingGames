import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { colors, radius, spacing } from '../theme';

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
        style={[styles.trigger, { borderColor: color }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, { color: value !== null ? colors.text : colors.textMuted }]}>
          {value !== null ? String(value) : placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item)}
              numColumns={5}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item === value && { backgroundColor: color },
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
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  triggerText: {
    fontSize: 18,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    width: 280,
    maxHeight: 400,
  },
  grid: {
    gap: spacing.sm,
  },
  option: {
    width: 44,
    height: 44,
    margin: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
});
