/**
 * INTERMAGNET / IAGA data formats — reference + lightweight IAGA-2002 parser.
 *
 * Credits:
 *  - INTERMAGNET (www.intermagnet.org) — global observatory network
 *  - IAGA-2002 exchange format (IAGA / NCEI / Kyoto WDC documentation)
 *  - ImagCDF (INTERMAGNET CDF) — definitive 1s/1min archive format
 *  - Richard Cordaro (@rrichcord) drmagneto — public processed INTERMAGNET H series
 *
 * Primary formats:
 *  1) IAGA-2002 — fixed-width ASCII exchange (ms → monthly means)
 *  2) ImagCDF   — NASA CDF container used for INTERMAGNET definitive products
 *  3) IAF / IMF — legacy INTERMAGNET archive / minute-mean binary/text families
 *  4) WDC       — World Data Centre classic format (converters via BGS gm_convert)
 *
 * WolfWatch does not re-host raw INTERMAGNET files. Live relative-probability
 * series come from Cordaro’s public tool; optional paste/parse of IAGA-2002
 * snippets is for operator education / offline notes only.
 */

export type IntermagnetFormatId =
  | "iaga-2002"
  | "imagcdf"
  | "iaf"
  | "imf"
  | "wdc"
  | "drmagneto-processed";

export type FormatCard = {
  id: IntermagnetFormatId;
  name: string;
  cadence: string;
  use: string;
  notes: string;
  credit: string;
};

export const INTERMAGNET_FORMATS: FormatCard[] = [
  {
    id: "iaga-2002",
    name: "IAGA-2002",
    cadence: "ms → monthly (common: 1s, 1min)",
    use: "ASCII exchange between observatories, WDCs, and analysis software",
    notes:
      "70-char records + header. Four elements per line (XYZF, DHZF, …). Missing often 99999.00.",
    credit: "IAGA / NCEI / Kyoto WDC documentation",
  },
  {
    id: "imagcdf",
    name: "ImagCDF",
    cadence: "1s / 1min definitive",
    use: "INTERMAGNET official CDF packaging from ~2015",
    notes: "Filename: [IAGA]_[datetime]_[cadence]_[level].cdf — needs CDF libs to read.",
    credit: "INTERMAGNET Technical Notes / GitHub INTERMAGNET",
  },
  {
    id: "iaf",
    name: "IAF (archive)",
    cadence: "1-minute means",
    use: "Legacy INTERMAGNET archive bundles",
    notes: "View/convert via BGS IMCDview / gm_convert.",
    credit: "INTERMAGNET / BGS",
  },
  {
    id: "imf",
    name: "IMF (minute mean)",
    cadence: "1-minute",
    use: "Classic INTERMAGNET minute-mean exchange",
    notes: "Often converted to IAGA-2002 for modern pipelines.",
    credit: "INTERMAGNET",
  },
  {
    id: "wdc",
    name: "WDC classic",
    cadence: "hourly / minute variants",
    use: "World Data Centre historical archives",
    notes: "Still appears in conversion toolchains (WDC ↔ IAGA).",
    credit: "WDC Geomagnetism (e.g. Kyoto, Edinburgh)",
  },
  {
    id: "drmagneto-processed",
    name: "drmagneto processed H",
    cadence: "~30s relative series (public tool)",
    use: "Cordaro relative-probability / anomaly desk (this app’s live magneto path)",
    notes: "JSON: processed_data[], raw_data[], data_source (often H). Not an official INTERMAGNET product.",
    credit: "Richard Cordaro @rrichcord · data provider INTERMAGNET",
  },
];

export type IagaSample = {
  date: string;
  time: string;
  tMs: number | null;
  e1: number;
  e2: number;
  e3: number;
  e4: number;
  /** Parsed DOY / elements label if present in header */
  elements?: string;
};

export type IagaParseResult = {
  ok: boolean;
  station: string | null;
  elements: string | null;
  samples: IagaSample[];
  errors: string[];
  note: string;
};

const MISSING = 99999;

/** Minimal IAGA-2002 line parser (data rows after DATE TIME headers). */
export function parseIaga2002(text: string): IagaParseResult {
  const errors: string[] = [];
  let station: string | null = null;
  let elements: string | null = null;
  const samples: IagaSample[] = [];

  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.replace(/\t/g, " ");
    if (!line.trim()) continue;
    // Header keys
    if (/IAGA CODE/i.test(line) || /IAGA-Code/i.test(line)) {
      const m = line.match(/([A-Z]{3})\s*$/i) || line.match(/:\s*([A-Z]{3})/i);
      if (m) station = m[1]!.toUpperCase();
      continue;
    }
    if (/^ELE\s*MEN|^ELEMENTS/i.test(line) || /Reported\s*Elements/i.test(line)) {
      const m = line.match(/(XYZF|DHZF|DHIF|XYZG|DHZG|DHIG)/i);
      if (m) elements = m[1]!.toUpperCase();
      continue;
    }
    if (/^DATE\s+TIME/i.test(line) || line.startsWith("DATE ")) continue;
    if (line.startsWith(" ") && !/^\d{4}-\d{2}-\d{2}/.test(line.trim())) continue;

    // Data: YYYY-MM-DD HH:MM:SS.sss  v1 v2 v3 v4
    const dm = line.match(
      /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+([+\-\d.eE]+)\s+([+\-\d.eE]+)\s+([+\-\d.eE]+)\s+([+\-\d.eE]+)/,
    );
    if (!dm) continue;
    const nums = [dm[3], dm[4], dm[5], dm[6]].map((x) => Number(x));
    if (nums.some((n) => !Number.isFinite(n))) {
      errors.push(`bad numbers @ ${dm[1]} ${dm[2]}`);
      continue;
    }
    const tMs = Date.parse(`${dm[1]}T${dm[2]}Z`);
    samples.push({
      date: dm[1]!,
      time: dm[2]!,
      tMs: Number.isFinite(tMs) ? tMs : null,
      e1: nums[0]!,
      e2: nums[1]!,
      e3: nums[2]!,
      e4: nums[3]!,
      elements: elements ?? undefined,
    });
  }

  return {
    ok: samples.length > 0,
    station,
    elements,
    samples: samples.filter(
      (s) =>
        Math.abs(s.e1) < MISSING &&
        Math.abs(s.e2) < MISSING &&
        Math.abs(s.e3) < MISSING,
    ),
    errors: errors.slice(0, 8),
    note:
      samples.length === 0
        ? "No IAGA-2002 data rows found. Expect DATE TIME + four field columns."
        : `Parsed ${samples.length} rows${station ? ` · station ${station}` : ""}${
            elements ? ` · ${elements}` : ""
          }.`,
  };
}

/** Prefer horizontal component for SSC-style work: H or X depending on report. */
export function horizontalSeriesFromIaga(
  parsed: IagaParseResult,
): { t: number; h: number }[] {
  const el = (parsed.elements || "XYZF").toUpperCase();
  const useH = el.startsWith("DH") || el.includes("H");
  // DHZF → e2 is H often; XYZF → e1 is X (north) ≈ H mid-lat
  return parsed.samples
    .filter((s) => s.tMs != null)
    .map((s) => ({
      t: s.tMs!,
      h: useH ? s.e2 : s.e1,
    }));
}
