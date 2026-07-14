import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import avatarHtml from "../assets/avatar/avatarHtml.js";

/**
 * Loads the standalone avatar scene (built via `npm run build:avatar` at the
 * repo root, a self-contained single-file Three.js/R3F bundle) inside a
 * WebView. Avoids the unstable @react-three/fiber/native + expo-gl native
 * rendering path entirely — see the implementation plan for why.
 *
 * The HTML is passed directly as a string via source={{ html }} rather than
 * as a file:// URI through expo-asset — loading local files in an Android
 * WebView needs explicit file-access permissions and hit a hard
 * net::ERR_ACCESS_DENIED in testing; passing the markup in-memory sidesteps
 * that whole class of problem, in Expo Go and in real builds alike.
 */
export default function AvatarWebView({ exerciseId, gender, style }) {
  const webviewRef = useRef(null);

  useEffect(() => {
    webviewRef.current?.postMessage(JSON.stringify({ exerciseId, gender }));
  }, [exerciseId, gender]);

  return (
    <View style={[{ height: 220, borderRadius: 14, overflow: "hidden" }, style]}>
      <WebView
        ref={webviewRef}
        source={{ html: avatarHtml, baseUrl: "" }}
        originWhitelist={["*"]}
        style={{ backgroundColor: "transparent" }}
        javaScriptEnabled
        onLoadEnd={() => webviewRef.current?.postMessage(JSON.stringify({ exerciseId, gender }))}
      />
    </View>
  );
}
