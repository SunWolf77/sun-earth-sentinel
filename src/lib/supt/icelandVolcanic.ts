/**
 * Iceland volcanic desk — thin wrapper over generic SUPT volcanic engine.
 * Prefer buildVolcanicDesk + VOLCANIC_DESK_CONFIGS.iceland for new code.
 */

import type { EqFeature } from "@/lib/feeds/usgs";
import type { GlobalVolcAlert } from "@/lib/feeds/globalVolcanoAlerts";
import { VOLCANIC_DESK_CONFIGS } from "@/lib/feeds/volcanicZones";
import {
  buildVolcanicDesk,
  type VolcanicDeskModel,
  type VolcZoneSnapshot,
  type ZoneActivityTone,
} from "@/lib/supt/volcanicDesk";

export type { ZoneActivityTone };

/** @deprecated use VolcZoneSnapshot */
export type IcelandZoneSnapshot = VolcZoneSnapshot;

/** @deprecated use VolcanicDeskModel */
export type IcelandVolcanicDesk = VolcanicDeskModel;

export function buildIcelandVolcanicDesk(opts: {
  features: EqFeature[];
  volcAlerts?: GlobalVolcAlert[] | null;
  timeWindow?: string;
  now?: number;
}): IcelandVolcanicDesk {
  return buildVolcanicDesk({
    config: VOLCANIC_DESK_CONFIGS.iceland!,
    features: opts.features,
    volcAlerts: opts.volcAlerts,
    timeWindow: opts.timeWindow,
    now: opts.now,
  });
}
