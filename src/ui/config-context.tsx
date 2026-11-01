import { createContext, useContext } from "react";

import { resolveConfig, type NakasConfig } from "../core/options.js";

const ConfigContext = createContext<NakasConfig>(resolveConfig());

export const ConfigProvider = ConfigContext.Provider;

/** Config (endpoint, content selector) provided by the mount. */
export const useNakasConfig = (): NakasConfig => useContext(ConfigContext);
