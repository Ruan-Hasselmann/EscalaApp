import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Ministry } from "@/services/ministries";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

type Props = {
  visible: boolean;
  ministry: Ministry | null;
  onClose: () => void;
};

export default function MinistryModal({
  visible,
  ministry,
  onClose,
}: Props) {
  const { theme } = useTheme();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setName(ministry?.name ?? "");
    setDescription(ministry?.description ?? "");
  }, [ministry, visible]);

  async function handleSave() {
    if (!name.trim()) return;

    if (ministry) {
      await updateDoc(doc(db, "ministries", ministry.id), {
        name: name.trim(),
        description: description.trim(),
      });
    } else {
      await setDoc(doc(db, "ministries", name.toLowerCase()), {
        name: name.trim(),
        description: description.trim(),
        active: true,
        membersCount: 0,
        leadersCount: 0,
      });
    }

    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {ministry ? "Editar ministério" : "Novo ministério"}
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nome"
            placeholderTextColor={theme.colors.textMuted}
            style={[
              styles.input,
              {
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
          />

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Descrição"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            style={[
              styles.input,
              {
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
          />

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={[styles.btn, { backgroundColor: theme.colors.background }]}
            >
              <Text style={{ color: theme.colors.textMuted }}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              style={[styles.btn, { backgroundColor: theme.colors.primary }]}
            >
              <Text
                style={{
                  color: theme.colors.primaryContrast,
                  fontWeight: "600",
                }}
              >
                Salvar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

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
