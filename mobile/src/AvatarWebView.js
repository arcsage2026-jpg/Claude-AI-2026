import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { Asset } from "expo-asset";
import { T } from "../../shared/theme.js";

const avatarModule = require("../assets/avatar/avatar.html");

/**
 * Loads the standalone avatar.html bundle (built via `npm run build:avatar`
 * at the repo root, a self-contained single-file Three.js/R3F scene) inside
 * a WebView. Avoids the unstable @react-three/fiber/native + expo-gl native
 * rendering path entirely — see the implementation plan for why.
 */
export default function AvatarWebView({ exerciseId, gender, style }) {
  const webviewRef = useRef(null);
  const [uri, setUri] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const asset = Asset.fromModule(avatarModule);
      await asset.downloadAsync();
      if (live) setUri(asset.localUri || asset.uri);
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    webviewRef.current?.postMessage(JSON.stringify({ exerciseId, gender }));
  }, [exerciseId, gender]);

  if (!uri) {
    return (
      <View style={[{ height: 220, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: T.bg2 }, style]}>
        <ActivityIndicator color={T.solar} />
      </View>
    );
  }

  return (
    <View style={[{ height: 220, borderRadius: 14, overflow: "hidden" }, style]}>
      <WebView
        ref={webviewRef}
        source={{ uri: `${uri}?exerciseId=${encodeURIComponent(exerciseId)}&gender=${gender}` }}
        originWhitelist={["*"]}
        style={{ backgroundColor: "transparent" }}
        javaScriptEnabled
        onLoadEnd={() => webviewRef.current?.postMessage(JSON.stringify({ exerciseId, gender }))}
      />
    </View>
  );
}
