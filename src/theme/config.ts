import { GetShadowHost } from "../app/shared/utils/dom";
import { CustomPreset } from "./preset";

export const ThemeConfig = {
    options:{
      document: GetShadowHost()?.shadowRoot, 
      darkModeSelector: false,
      selector: ":host"
    },
    preset: CustomPreset,
}