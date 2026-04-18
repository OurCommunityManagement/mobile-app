import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";
import { AppProvider } from "./src/context/AppContext";
import { Root } from "./src/Root";

export default function App() {
  return (
    <AppProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f4f7fb" }}>
        <StatusBar style="dark" />
        <Root />
      </SafeAreaView>
    </AppProvider>
  );
}
