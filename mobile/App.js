import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import YoddhaApp from "./src/YoddhaApp.js";
import { T } from "../shared/theme.js";

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={["top", "left", "right"]}>
        <YoddhaApp />
        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
