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
 * net::ERR_ACCESS_DENIED in testing.
 *
 * baseUrl matters here: an empty string still gets resolved by Android's
 * WebView as a file-scheme-like origin, hitting the exact same
 * net::ERR_ACCESS_DENIED even though no file:// URI is involved. Pointing it
 * at a (never-fetched) dummy https URL instead gives the content a normal
 * web origin with none of the file-access restrictions.
 */
const DUMMY_BASE_URL = "https://yoddha-avatar.invalid/";

export default function AvatarWebView({ exerciseId, gender, style }) {
  const webviewRef = useRef(null);

  useEffect(() => {
    webviewRef.current?.postMessage(JSON.stringify({ exerciseId, gender }));
  }, [exerciseId, gender]);

  return (
    <View style={[{ height: 220, borderRadius: 14, overflow: "hidden" }, style]}>
      <WebView
        ref={webviewRef}
        source={{ html: avatarHtml, baseUrl: DUMMY_BASE_URL }}
        originWhitelist={["*"]}
        style={{ backgroundColor: "transparent" }}
        javaScriptEnabled
        onLoadEnd={() => webviewRef.current?.postMessage(JSON.stringify({ exerciseId, gender }))}
      />
    </View>
  );
}
