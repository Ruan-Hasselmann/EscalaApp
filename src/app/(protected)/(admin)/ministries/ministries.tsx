import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";

import { listenMinistries, Ministry } from "@/services/ministries";
import { listenMemberships, Membership } from "@/services/memberships";

import MinistryModal from "./MinistryModal";

/* =========================
   TYPES
========================= */

type MinistryRow = Ministry & {
  membersCount: number;
  leadersCount: number;
};

/* =========================
   SCREEN
========================= */

export default function AdminMinistries() {
  const { theme } = useTheme();
  const router = useRouter();

  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  const [selected, setSelected] = useState<Ministry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  /* =========================
     SNAPSHOTS
  ========================= */

  useEffect(() => {
    const unsubMinistries = listenMinistries(setMinistries);
    const unsubMemberships = listenMemberships(setMemberships);

    return () => {
      unsubMinistries();
      unsubMemberships();
    };
  }, []);

  /* =========================
     JOIN + ORDER
  ========================= */

  const rows = useMemo<MinistryRow[]>(() => {
    return ministries
      .map((m) => {
        const activeMemberships = memberships.filter(
          (mb) => mb.ministryId === m.id && mb.active
        );

        return {
          ...m,
          membersCount: activeMemberships.length,
          leadersCount: activeMemberships.filter(
            (mb) => mb.role === "leader"
          ).length,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [ministries, memberships]);

  /* =========================
     ACTIONS
  ========================= */

  function openNew() {
    setSelected(null);
    setModalOpen(true);
  }

  function openEdit(m: Ministry) {
    setSelected(m);
    setModalOpen(true);
  }

  function openPeople(m: Ministry) {
    router.push(`/(protected)/(admin)/ministries/${m.id}`);
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader title="🎧 Ministérios" />

      <View style={styles.wrapper}>
        {/* NOVO */}
        <Pressable
          onPress={openNew}
          style={[
            styles.newBtn,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
            ➕ Novo ministério
          </Text>
        </Pressable>

        {/* EMPTY STATE */}
        {rows.length === 0 && (
          <Text
            style={{
              textAlign: "center",
              color: theme.colors.textMuted,
              marginTop: 24,
            }}
          >
            Nenhum ministério cadastrado ainda
          </Text>
        )}

        {/* LISTA */}
        {rows.map((m) => (
          <View
            key={m.id}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {/* CLICK AREA */}
            <Pressable
              onPress={() => openPeople(m)}
              style={({ pressed }) => [
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                {m.name}
              </Text>

              {m.description ? (
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    marginTop: 4,
                  }}
                >
                  {m.description}
                </Text>
              ) : null}

              <Text
                style={{
                  color: theme.colors.textMuted,
                  marginTop: 8,
                  fontSize: 13,
                }}
              >
                👥 {m.membersCount} membros · ⭐ {m.leadersCount} líderes
              </Text>
            </Pressable>

            {/* ACTIONS */}
            <View style={styles.actions}>
              <Pressable
                onPress={() => openEdit(m)}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontWeight: "600",
                  }}
                >
                  Editar
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      {/* MODAL */}
      <MinistryModal
        visible={modalOpen}
        ministry={selected}
        onClose={() => {
          setModalOpen(false);
          setSelected(null);
        }}
      />
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },

  newBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
  },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },

  actionBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
