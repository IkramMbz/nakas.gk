import { createContext, useContext } from "react";
import { resolveConfig } from "../core/options.js";
const ConfigContext = createContext(resolveConfig());
export const ConfigProvider = ConfigContext.Provider;
/** Config (endpoint, content selector) provided by the mount. */
export const useNakasConfig = () => useContext(ConfigContext);
//# sourceMappingURL=config-context.js.map