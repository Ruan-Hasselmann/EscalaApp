import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";

import { useTheme } from "@/contexts/ThemeContext";
import { Ministry } from "@/services/ministries";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

/* =========================
   TYPES
========================= */

type Props = {
  visible: boolean;
  ministry: Ministry | null;
  onClose: () => void;
};

/* =========================
   COMPONENT
========================= */

export default function MinistryModal({
  visible,
  ministry,
  onClose,
}: Props) {
  const { theme } = useTheme();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  /* =========================
     SYNC FORM
  ========================= */

  useEffect(() => {
    if (!visible) {
      // reset defensivo
      setName("");
      setDescription("");
      setSaving(false);
      return;
    }

    setName(ministry?.name ?? "");
    setDescription(ministry?.description ?? "");
  }, [visible, ministry?.id]);

  /* =========================
     ACTIONS
  ========================= */

  async function saveMinistry() {
    if (!name.trim() || saving) return;

    const payload = {
      name: name.trim(),
      description: description.trim(),
    };

    setSaving(true);

    try {
      if (ministry) {
        await updateDoc(doc(db, "ministries", ministry.id), payload);
      } else {
        await addDoc(collection(db, "ministries"), {
          ...payload,
          active: true,
        });
      }

      onClose();
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {/* TITLE */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {ministry ? "Editar ministério" : "Novo ministério"}
          </Text>

          {/* NAME */}
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nome do ministério"
            placeholderTextColor={theme.colors.textMuted}
            editable={!saving}
            style={[
              styles.input,
              {
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
          />

          {/* DESCRIPTION */}
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Descrição (opcional)"
            placeholderTextColor={theme.colors.textMuted}
            editable={!saving}
            multiline
            style={[
              styles.input,
              {
                borderColor: theme.colors.border,
                color: theme.colors.text,
                minHeight: 80,
                textAlignVertical: "top",
              },
            ]}
          />

          {/* ACTIONS */}
          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={[
                styles.btn,
                {
                  backgroundColor: theme.colors.background,
                  opacity: saving ? 0.6 : 1,
                },
              ]}
            >
              <Text style={{ color: theme.colors.textMuted }}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              onPress={saveMinistry}
              disabled={!name.trim() || saving}
              style={[
                styles.btn,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: !name.trim() || saving ? 0.6 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator
                  color={theme.colors.primaryContrast}
                />
              ) : (
                <Text
                  style={{
                    color: theme.colors.primaryContrast,
                    fontWeight: "600",
                  }}
                >
                  Salvar
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    borderRadius: 20,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});
