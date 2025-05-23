import {createContext} from "@lit/context";
import {ScrybbleCommon} from "../../@types/scrybble";

export const scrybbleContext = createContext<ScrybbleCommon>('scrybble-common');
