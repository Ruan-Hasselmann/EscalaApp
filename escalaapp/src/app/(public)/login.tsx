import { Text, Pressable } from "react-native";
import { AppScreen } from "@/components/layout/AppScreen";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();

  return (
    <AppScreen>
      <Text>Login</Text>

      <Pressable
        onPress={() => login("teste@email.com", "123456")}
      >
        <Text>Entrar</Text>
      </Pressable>
    </AppScreen>
  );
}
