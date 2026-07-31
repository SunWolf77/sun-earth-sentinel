import { i as __toESM } from "../_runtime.mjs";
import { N as require_react, h as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as createServerFn } from "./ssr.mjs";
import { A as stereoHeliographic, C as longChannelXrays, E as sdoStill, O as stereoCor2, S as lascoStill, T as sdoMovie, i as cmeImpactSummary, j as upcomingKpForecast, k as stereoEuvi, n as SDO_CHANNELS, o as earthDirectedCmes, v as fluxToClass, w as peakFlare, x as lascoMovie, y as forecastHighlights } from "./solarMedia-BbNb_6Ei.mjs";
import { B as probe, C as fetchSoloFrame, G as viewEvents, H as resonanceVerdict, I as nodeEventStats, L as nodeIdForAlert, M as isMobileViewport, N as magColor, R as nodeStatus, V as resonanceScore, W as useObservatory, _ as buildImpactBrief, a as DRAGON_NODES, d as SUPT_ANCHORS, f as SUPT_COPYRIGHT, h as bandPlainLabel, j as interEventSeconds, l as SHAKEMAP_NOTES, m as alertKey, o as FOCUSED_MONITORS, p as SUPT_SEED, s as MODES, u as SUPT_ALPHA, v as colorCodeHex, w as filteredEq, y as createSsrRpc } from "./observatory-DWEcu3Hj.mjs";
import { B as Earth, C as Orbit, E as Magnet, F as FlaskConical, G as ChevronDown, H as Copy, J as BookOpen, K as Check, L as Eye, M as HardDrive, N as Gauge, O as ListChecks, R as EyeOff, S as Pause, T as Map$1, U as ChevronUp, V as Crosshair, W as ChevronRight, X as Activity, Y as Atom, _ as Radio, a as Waves, b as Pin, c as Sun, d as Sparkles, f as Smartphone, g as RefreshCw, h as Satellite, i as WifiOff, j as Info, k as Layers, m as ShieldAlert, n as X, o as TriangleAlert, p as Shield, q as Bot, r as Wind, t as Zap, u as SquareFunction, v as Radar, w as Mountain, x as PinOff, y as Play, z as ExternalLink } from "../_libs/lucide-react.mjs";
import { c as createTabSwipe, d as plateVelocity, i as EULER_POLES, m as useIsMobile, n as DECAY_HALF_LIFE_H, o as NodeFocusPanel, p as timeDecayLegendRows, r as EEW_NOTES, t as ATTENUATION_NOTES, u as halfLifeLabel } from "./reference-DIt7NWTn.mjs";
import { a as ogImageUrl, c as shareCardUrl, d as xProfileUrl, l as unregisterShellServiceWorker, n as X_PROFILES, o as registerShellServiceWorker, r as absoluteUrl, t as SITE, u as xCardDebugReport } from "./register-DPsco08d.mjs";
import { a as Area, c as ReferenceLine, i as XAxis, l as ResponsiveContainer, n as LineChart, o as Line, r as YAxis, s as CartesianGrid, t as AreaChart, u as Tooltip } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DpTgkeYY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var linkClass = "inline-flex items-center gap-0.5 font-semibold text-primary underline decoration-primary/35 underline-offset-2 transition hover:decoration-primary";
/** Clickable @handle → opens X profile in a new tab. */
function XHandle({ profile, handle, showAt = true, className = "" }) {
	const known = profile ? X_PROFILES[profile] : null;
	const h = (known?.handle || handle || "").replace(/^@/, "");
	if (!h) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
		href: known?.url || xProfileUrl(h),
		target: "_blank",
		rel: "noopener noreferrer",
		className: `${linkClass} ${className}`,
		title: `Open @${h} on X`,
		children: showAt ? `@${h}` : h
	});
}
/** Name + optional @handle, both linked to X. */
function XPerson({ profile, children, className = "" }) {
	const p = X_PROFILES[profile];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: p.url,
				target: "_blank",
				rel: "noopener noreferrer",
				className: linkClass,
				title: `Open @${p.handle} on X`,
				children: children ?? p.name
			}),
			" ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XHandle, {
				profile,
				className: "font-medium"
			})
		]
	});
}
/** Compact chip row for Credits / About. */
function XProfileChips({ profiles = [
	"sunwolf",
	"sheppard",
	"dutchsinse"
] }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-wrap gap-2",
		children: profiles.map((id) => {
			const p = X_PROFILES[id];
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
				href: p.url,
				target: "_blank",
				rel: "noopener noreferrer",
				className: "inline-flex items-center gap-1.5 rounded-md border border-border bg-bg/70 px-2.5 py-1.5 text-[0.68rem] text-fg transition hover:border-primary/40 hover:bg-primary/10",
				title: p.role,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold",
						children: p.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono text-primary",
						children: ["@", p.handle]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3 w-3 shrink-0 text-dim" })
				]
			}, id);
		})
	});
}
function SuptSolarAgent({ assessment }) {
	const [openTech, setOpenTech] = (0, import_react.useState)(false);
	const a = assessment;
	const attnColor = a.attention >= 70 ? "text-danger" : a.attention >= 45 ? "text-warn" : a.attention >= 25 ? "text-gold" : "text-ok";
	const channelRows = (0, import_react.useMemo)(() => a.channels, [a.channels]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl border border-accent/35 bg-gradient-to-b from-accent/10 to-panel p-3 sm:p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 flex flex-wrap items-start justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "flex items-center gap-1.5 text-sm font-semibold text-accent",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bot, { className: "h-4 w-4" }), "SUPT Solar Interpreter"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-0.5 text-[0.68rem] text-dim",
						children: [
							"Deterministic multi-channel agent · frozen probe by ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XPerson, { profile: "sheppard" }),
							" · not a free-form LLM · not an official forecast"
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-right",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[0.62rem] uppercase tracking-wider text-dim",
						children: "Attention"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `font-mono text-2xl font-bold tabular-nums ${attnColor}`,
						children: [a.attention, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-dim",
							children: "/100"
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "rounded-lg border border-border/80 bg-bg/50 px-3 py-2 text-sm font-medium leading-snug text-fg",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "mr-1.5 inline h-3.5 w-3.5 text-accent" }), a.headline]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid gap-3 lg:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentCol, {
						title: "Observes",
						items: a.observations
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentCol, {
						title: "Interprets",
						items: a.interpretation
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentCol, {
						title: "Watch",
						items: a.watchItems,
						accent: true
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid gap-2 sm:grid-cols-3",
				children: channelRows.map((ch) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-lg border border-border bg-bg/40 px-2.5 py-2 text-xs",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[0.65rem] font-medium text-primary",
							children: ch.label
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1 flex flex-wrap items-baseline gap-2 font-mono text-fg",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["d=", ch.score.d_ij != null ? ch.score.d_ij.toFixed(3) : "—"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-dim",
								children: [ch.score.band, ch.score.separated ? " · sep" : " · null"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-[0.65rem] leading-snug text-muted",
							children: ch.plain
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-0.5 text-[0.6rem] text-dim",
							children: [
								"n=",
								ch.score.n,
								" gaps · ",
								ch.nEvents,
								" events"
							]
						})
					]
				}, ch.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-[0.68rem] leading-relaxed text-dim",
				children: a.enlilNote
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => setOpenTech((v) => !v),
				className: "mt-2 flex min-h-9 w-full items-center gap-1 text-left text-[0.68rem] font-medium text-primary",
				"aria-expanded": openTech,
				children: [openTech ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-3.5 w-3.5" }), "Method & caveats"]
			}),
			openTech && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-1 space-y-1 border-t border-border/60 pt-2 text-[0.65rem] leading-relaxed text-dim",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Inputs: NOAA R/S/G + L1 wind + GOES X-ray + protons + DONKI flares/CMEs + ENLIL frame tag. SUPT runs only on ordered inter-event gaps (flares, CMEs, X-ray peaks)." }),
					a.caveats.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: c }, i)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "text-dim",
						children: [
							"Generated ",
							new Date(a.generatedAt).toLocaleTimeString(),
							" local · re-runs on each data refresh."
						]
					})
				]
			})
		]
	});
}
function AgentCol({ title, items, accent }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `rounded-lg border px-2.5 py-2 ${accent ? "border-gold/30 bg-gold/5" : "border-border/80 bg-bg/30"}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
			className: "mb-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-primary",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-1.5 text-[0.72rem] leading-snug text-muted",
			children: items.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/80" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t })]
			}, i))
		})]
	});
}
function buildContinuum(opts) {
	const { seismic, solar } = opts;
	const v = resonanceVerdict(seismic);
	const seismicTone = v.tone === "null" ? "none" : v.tone;
	const seismicDomain = {
		id: "seismic",
		label: "Earth catalog",
		status: v.title,
		detail: seismic ? `${bandPlainLabel(seismic.band)} · n=${seismic.n}${seismic.separated ? " · sep" : " · null"}` : "Waiting for quake gaps",
		tone: seismicTone,
		metric: seismic?.d_ij != null ? `d=${seismic.d_ij.toFixed(3)}` : "d=—"
	};
	const solarAtt = solar?.attention ?? 0;
	const solarTone = solarAtt >= 70 ? "storm" : solarAtt >= 40 ? "watch" : solar?.channels?.some((c) => c.score.separated) ? "ordered" : solar ? "chance" : "none";
	const domains = [{
		id: "solar",
		label: "Solar storm stack",
		status: solar?.impact.title ?? "Solar loading…",
		detail: solar ? `Attention ${solar.attention}/100 · ${solar.channels.filter((c) => c.score.separated).length}/${solar.channels.length} SUPT channels non-null` : "Waiting for space-weather feeds",
		tone: solarTone,
		metric: solar ? `${solar.attention}` : "—"
	}, seismicDomain];
	let headline = "Continuum quiet";
	if (solarTone === "storm" || seismic?.separated) headline = solarTone === "storm" ? `Solar elevated · ${seismic?.separated ? "Earth timing non-null" : "Earth timing null"}` : `Earth timing non-null · Solar ${solar?.impact.level ?? "—"}`;
	else if (solarTone === "watch") headline = `Solar watch · Earth ${seismic?.separated ? "non-null" : "null"}`;
	else if (seismic?.separated) headline = "Earth catalog structure · solar calm";
	else headline = "Both domains near null / quiet";
	return {
		generatedAt: Date.now(),
		domains,
		headline,
		plain: "Same frozen SUPT probe on ordered gaps (quakes · flares · CMEs · X-ray peaks). Null is valid. Amplitude scales (R/S/G, mag) are separate from timing structure.",
		attentionMax: Math.max(solarAtt, seismic?.separated ? 55 : seismic?.d_ij != null ? 25 : 0)
	};
}
var TONE_CLASS$1 = {
	none: "border-border bg-panel text-dim",
	chance: "border-primary/25 bg-primary/5 text-primary",
	ordered: "border-gold/35 bg-gold/10 text-gold",
	mixed: "border-warn/30 bg-warn/10 text-warn",
	sparse: "border-border bg-elevated/50 text-muted",
	watch: "border-warn/40 bg-warn/10 text-warn",
	storm: "border-danger/40 bg-danger/10 text-danger"
};
/** Compact attention history sparkline from store attentionHistory. */
function AttentionSparkline({ height = 28, className = "", showLabel = true }) {
	const hist = useObservatory((s) => s.attentionHistory);
	const pts = (0, import_react.useMemo)(() => {
		return hist.slice(-24).map((p) => ({
			t: p.t,
			a: Math.max(0, Math.min(100, Number(p.attention) || 0))
		}));
	}, [hist]);
	if (pts.length < 2) return showLabel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: `text-[0.65rem] text-dim ${className}`,
		children: "Attention history builds after a few refreshes."
	}) : null;
	const w = 120;
	const h = height;
	const pad = 2;
	const maxA = Math.max(10, ...pts.map((p) => p.a));
	const minA = 0;
	const span = Math.max(1, maxA - minA);
	const pairs = pts.map((p, i) => {
		return [pad + i / (pts.length - 1) * (w - pad * 2), h - pad - (p.a - minA) / span * (h - pad * 2)];
	});
	const last = pts[pts.length - 1];
	const stroke = last.a >= 70 ? "var(--color-danger)" : last.a >= 40 ? "var(--color-warn)" : "var(--color-primary)";
	const d = pairs.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
	const lx = pairs[pairs.length - 1][0];
	const ly = pairs[pairs.length - 1][1];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `flex items-center gap-2 ${className}`,
		children: [
			showLabel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "shrink-0 text-[0.65rem] uppercase tracking-wide text-dim",
				children: "Attn"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				width: w,
				height: h,
				viewBox: `0 0 ${w} ${h}`,
				className: "overflow-visible",
				"aria-label": `Attention trend, latest ${Math.round(last.a)}`,
				role: "img",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d,
					fill: "none",
					stroke,
					strokeWidth: "1.5",
					strokeLinejoin: "round",
					strokeLinecap: "round"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: lx,
					cy: ly,
					r: "2.5",
					fill: stroke
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-mono text-[0.7rem] tabular-nums text-fg",
				children: Math.round(last.a)
			})
		]
	});
}
/**
* Shared SUPT continuum — uses store-cached solar assessment (no re-probe).
*/
function SuptContinuumStrip({ compact = false, showNav = true }) {
	const resonance = useObservatory((s) => s.resonance);
	const solar = useObservatory((s) => s.solarAssessment);
	const setTab = useObservatory((s) => s.setTab);
	const mobile = useIsMobile();
	const snap = (0, import_react.useMemo)(() => buildContinuum({
		seismic: resonance,
		solar
	}), [resonance, solar]);
	if (compact || mobile) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-accent/25 bg-accent/5 px-2.5 py-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-1 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-accent",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3" }), "SUPT continuum"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[0.72rem] font-medium leading-snug text-fg",
				children: snap.headline
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttentionSparkline, {
				height: 22,
				className: "mt-1.5"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-1.5 flex flex-wrap gap-1",
				children: snap.domains.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setTab(d.id === "solar" ? "solar" : "resonance"),
					className: `rounded-md border px-1.5 py-0.5 text-[0.62rem] ${TONE_CLASS$1[d.tone]}`,
					children: [
						d.label,
						": ",
						d.metric
					]
				}, d.id))
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl border border-accent/30 bg-gradient-to-b from-accent/10 to-panel p-3 sm:p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-2 flex flex-wrap items-start justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
					className: "flex items-center gap-1.5 text-sm font-semibold text-accent",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4" }), "SUPT continuum"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-0.5 text-[0.68rem] text-dim",
					children: "Same probe · solar + seismic · null is valid · not a forecast"
				})] }), showNav && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ww-btn min-h-9 text-[0.68rem]",
						onClick: () => setTab("solar"),
						children: "Solar"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ww-btn min-h-9 text-[0.68rem]",
						onClick: () => setTab("resonance"),
						children: "Rhythm"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-medium leading-snug text-fg",
				children: snap.headline
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-[0.72rem] leading-relaxed text-muted",
				children: snap.plain
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid gap-2 sm:grid-cols-2",
				children: snap.domains.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setTab(d.id === "solar" ? "solar" : "resonance"),
					className: `rounded-lg border px-3 py-2.5 text-left transition hover:brightness-110 ${TONE_CLASS$1[d.tone]}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[0.65rem] font-semibold uppercase tracking-wide opacity-90",
								children: d.label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-sm font-bold tabular-nums text-fg",
								children: d.metric
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm font-medium text-fg",
							children: d.status
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-0.5 text-[0.65rem] text-dim",
							children: d.detail
						})
					]
				}, d.id))
			})
		]
	});
}
function scaleLine(scales) {
	if (!scales) return "R— S— G—";
	return `R${scales.R} · S${scales.S} · G${scales.G}`;
}
function buildTodayBrief(opts) {
	const solar = opts.solar;
	const seismic = opts.seismic;
	const attn = solar?.attention ?? 0;
	const level = solar?.impact.level ?? "quiet";
	const earthD = seismic?.d_ij != null ? `d=${seismic.d_ij.toFixed(3)}` : "d=—";
	const earthSep = !!(seismic?.separated && seismic.d_ij != null);
	const next = earthDirectedCmes(opts.cmes).map((c) => cmeImpactSummary(c)).filter((x) => x.eta).sort((a, b) => (a.eta || "").localeCompare(b.eta || ""))[0];
	const cmeEta = next?.eta ? new Date(next.eta).toISOString().slice(0, 16).replace("T", " ") + "Z" : null;
	const parts = [
		`Solar attn ${attn}`,
		scaleLine(opts.scales),
		cmeEta ? `CME ETA ${cmeEta}` : "No Earth CME ETA",
		`Earth ${earthD}${earthSep ? " sep" : " null"}`
	];
	const recs = [];
	const R = parseInt(String(opts.scales?.R ?? "0"), 10) || 0;
	const S = parseInt(String(opts.scales?.S ?? "0"), 10) || 0;
	const G = parseInt(String(opts.scales?.G ?? "0"), 10) || 0;
	if (S >= 1 || solar?.protons.sLike) recs.push({
		id: "protons",
		priority: S >= 2 ? "now" : "watch",
		title: "Radiation (S-scale / protons)",
		detail: "Elevated energetic protons — polar HF and high-latitude aviation risk context. Check Solar proton gauges + SWPC S scale.",
		tab: "solar"
	});
	if (R >= 1) recs.push({
		id: "radio",
		priority: R >= 3 ? "now" : "watch",
		title: "Radio blackout context",
		detail: `R${R} — HF on the dayside can fade during flares. Watch GOES X-ray class on Solar.`,
		tab: "solar"
	});
	if (G >= 1) recs.push({
		id: "geo",
		priority: G >= 3 ? "now" : "watch",
		title: "Geomagnetic activity",
		detail: `G${G} — aurora / GNSS / grid context at higher latitudes. Cross-check Kp and Bz on Solar.`,
		tab: "solar"
	});
	if (cmeEta) {
		const hours = (new Date(next.eta).getTime() - Date.now()) / 36e5;
		recs.push({
			id: "cme",
			priority: hours >= 0 && hours < 36 ? "now" : "watch",
			title: hours >= 0 && hours < 36 ? "CME arrival window open" : "Earth-directed CME on board",
			detail: `Modeled ETA ~${cmeEta}${next?.kpHint != null ? ` · model Kp~${next.kpHint}` : ""}. ENLIL ±6–12 h typical. Open Solar → Arrival models.`,
			tab: "solar"
		});
	}
	if (solar?.channels.some((c) => c.score.separated)) recs.push({
		id: "solar-supt",
		priority: "context",
		title: "Solar SUPT non-null channel",
		detail: "At least one solar timing channel (flares/CMEs/X-ray peaks) is separated from shuffle — rhythm, not arrival. See SUPT Interpreter.",
		tab: "solar"
	});
	else if (solar) recs.push({
		id: "solar-null",
		priority: "ok",
		title: "Solar SUPT timing null",
		detail: "Catalog gap structure looks like shuffle. Any elevated impact is from amplitude/geometry (scales, L1, Earth CMEs), not timing order.",
		tab: "solar"
	});
	if (earthSep) recs.push({
		id: "earth-supt",
		priority: "context",
		title: "Earth catalog timing non-null",
		detail: "Seismic inter-event spacing shows structure vs chance for this window — not a mag forecast. Open Rhythm for the read.",
		tab: "resonance"
	});
	else if (seismic?.d_ij != null) recs.push({
		id: "earth-null",
		priority: "ok",
		title: "Earth catalog timing null",
		detail: "Quake gaps look like normal scatter for this filter window. Valid null.",
		tab: "resonance"
	});
	if (attn >= 45 && !recs.some((r) => r.priority === "now" || r.priority === "watch")) recs.unshift({
		id: "attn",
		priority: "watch",
		title: "Elevated solar attention",
		detail: `Composite attention ${attn}/100 — skim Solar gauges, DONKI, and SWPC alerts.`,
		tab: "solar"
	});
	if (!recs.length) recs.push({
		id: "quiet",
		priority: "ok",
		title: "Quiet stack",
		detail: "No elevated scales, Earth CME ETA, or SUPT separations. Keep map + Solar on a long refresh.",
		tab: "live"
	});
	const seen = /* @__PURE__ */ new Set();
	const recommendations = recs.filter((r) => seen.has(r.id) ? false : (seen.add(r.id), true)).slice(0, 6);
	const rank = {
		now: 0,
		watch: 1,
		context: 2,
		ok: 3
	};
	recommendations.sort((a, b) => rank[a.priority] - rank[b.priority]);
	return {
		line: parts.join(" · "),
		solarAttn: attn,
		scales: scaleLine(opts.scales),
		earthD,
		earthSep,
		cmeEta,
		level,
		recommendations
	};
}
/**
* Lightweight SUPT probe backtests — synthetic + optional live-shaped sequences.
* Validates frozen operator behavior without network in pure unit cases.
*/
function mulberry(seed) {
	let s = seed >>> 0;
	return () => {
		s = s + 1831565813 >>> 0;
		let t = s;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
/** Nearly periodic gaps → should tend toward lower d / more structure than pure noise. */
function periodicGaps(n, base = 3600, jitter = .02, seed = 1) {
	const rng = mulberry(seed);
	const out = [];
	for (let i = 0; i < n; i++) out.push(base * (1 + (rng() - .5) * 2 * jitter));
	return out;
}
/** Heavy-tailed random gaps (lognormal-ish). */
function noiseGaps(n, seed = 2) {
	const rng = mulberry(seed);
	const out = [];
	for (let i = 0; i < n; i++) {
		const u = Math.max(1e-9, rng());
		const v = Math.max(1e-9, rng());
		const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
		out.push(Math.exp(7 + z * .8));
	}
	return out;
}
function defaultBacktestCases() {
	return [
		{
			id: "too-short",
			name: "n < 4 → null",
			expect: "short-null",
			values: [
				1,
				2,
				3
			]
		},
		{
			id: "periodic-80",
			name: "Near-periodic gaps (n=80)",
			expect: "coherence-ish",
			values: periodicGaps(80, 3600, .01, 11)
		},
		{
			id: "noise-80",
			name: "Heavy-tailed noise (n=80)",
			expect: "null-or-high-d",
			values: noiseGaps(80, 22)
		},
		{
			id: "periodic-20-short",
			name: "Periodic short window (n=20)",
			expect: "any",
			values: periodicGaps(20, 1800, .02, 33)
		},
		{
			id: "shuffle-invariant-mass",
			name: "Same multiset as periodic (shuffled once)",
			expect: "null-or-high-d",
			values: (() => {
				const p = periodicGaps(80, 3600, .01, 11);
				const rng = mulberry(99);
				const a = p.slice();
				for (let i = a.length - 1; i > 0; i--) {
					const j = Math.floor(rng() * (i + 1));
					[a[i], a[j]] = [a[j], a[i]];
				}
				return a;
			})()
		},
		{
			id: "event-times-derived",
			name: "From event epochs via interEventSeconds",
			expect: "coherence-ish",
			values: (() => {
				const gaps = periodicGaps(60, 7200, .015, 44);
				let t = 17e11;
				const times = [t];
				for (const g of gaps) {
					t += g * 1e3;
					times.push(t);
				}
				return interEventSeconds(times);
			})()
		}
	];
}
function runBacktestCase(c, shuffleN = 40) {
	const score = resonanceScore(c.values, shuffleN);
	const d = score.d_ij;
	let pass = true;
	let note = score.note || "";
	if (c.expect === "short-null") {
		pass = d === null;
		note = pass ? "Correct null for short series" : "Expected null for n<4";
	} else if (c.expect === "coherence-ish") {
		pass = d != null && (d < SUPT_ANCHORS.zetaFloor || score.separated && d < 2.5 || d < 2);
		if (!pass && d != null) pass = score.z != null && score.z < -1.5;
		note = pass ? `Structure-friendly: d=${d?.toFixed(3)} z=${score.z}` : `Expected more structure: d=${d} z=${score.z}`;
	} else if (c.expect === "null-or-high-d") {
		pass = d == null || !score.separated || d >= 1.5 || score.z != null && Math.abs(score.z) < 3;
		note = pass ? `Noise-like or non-sep: d=${d?.toFixed(3)} sep=${score.separated}` : `Unexpected strong sep: d=${d} z=${score.z}`;
	} else {
		pass = true;
		note = `d=${d?.toFixed(3) ?? "null"} band=${score.band}`;
	}
	if (c.values.filter(Number.isFinite).length >= 4) {
		const raw = probe(c.values);
		if (raw == null || !Number.isFinite(raw)) {
			pass = false;
			note = "probe returned non-finite for n>=4";
		}
	}
	return {
		id: c.id,
		name: c.name,
		expect: c.expect,
		d_ij: d,
		band: score.band,
		z: score.z,
		separated: score.separated,
		n: score.n,
		pass,
		note
	};
}
function runFullBacktest(shuffleN = 40) {
	const results = defaultBacktestCases().map((c) => runBacktestCase(c, shuffleN));
	const passed = results.filter((r) => r.pass).length;
	const total = results.length;
	const ok = passed === total;
	return {
		results,
		passed,
		total,
		ok,
		summary: ok ? `All ${total} backtests passed` : `${passed}/${total} passed — review failures`
	};
}
var PRI_STYLE = {
	now: "border-danger/40 bg-danger/10 text-danger",
	watch: "border-warn/35 bg-warn/10 text-warn",
	context: "border-primary/30 bg-primary/5 text-primary",
	ok: "border-border bg-panel text-muted"
};
function RecommendationsPanel({ showBacktest = true }) {
	const resonance = useObservatory((s) => s.resonance);
	const scales = useObservatory((s) => s.scales);
	const donki = useObservatory((s) => s.donki);
	const solar = useObservatory((s) => s.solarAssessment);
	const mode = useObservatory((s) => s.mode);
	const setTab = useObservatory((s) => s.setTab);
	const [openBt, setOpenBt] = (0, import_react.useState)(false);
	const brief = (0, import_react.useMemo)(() => buildTodayBrief({
		solar,
		seismic: resonance,
		scales,
		cmes: donki?.cmes ?? []
	}), [
		solar,
		resonance,
		scales,
		donki
	]);
	const bt = (0, import_react.useMemo)(() => openBt ? runFullBacktest(mode === "lite" ? 24 : 36) : null, [openBt, mode]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
				className: "mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListChecks, { className: "h-4 w-4" }), "Recommendations"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-3 text-[0.68rem] text-dim",
				children: ["Deterministic triage from scales · L1 · DONKI · SUPT — not official SWPC watches.", mode === "lite" && " Lite mode: catalogs off until you switch Standard/Full."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-2",
				children: brief.recommendations.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: `rounded-lg border px-2.5 py-2 text-xs ${PRI_STYLE[r.priority]}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-semibold text-fg",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mr-1.5 text-[0.58rem] uppercase tracking-wide opacity-80",
								children: r.priority
							}), r.title]
						}), r.tab && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "ww-btn min-h-8 px-2 text-[0.62rem]",
							onClick: () => setTab(r.tab),
							children: "Go"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[0.72rem] leading-snug text-muted",
						children: r.detail
					})]
				}, r.id))
			}),
			showBacktest && mode !== "lite" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 border-t border-border/70 pt-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setOpenBt((v) => !v),
					className: "flex min-h-9 w-full items-center gap-1.5 text-left text-[0.72rem] font-medium text-primary",
					"aria-expanded": openBt,
					children: [
						openBt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-3.5 w-3.5" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlaskConical, { className: "h-3.5 w-3.5" }),
						"SUPT probe backtest"
					]
				}), bt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 space-y-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: `text-xs font-medium ${bt.ok ? "text-ok" : "text-warn"}`,
						children: bt.summary
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "scroll-thin max-h-48 space-y-1 overflow-y-auto text-[0.65rem]",
						children: bt.results.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `rounded border px-2 py-1.5 ${r.pass ? "border-border/80 bg-bg/40" : "border-warn/40 bg-warn/10"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between gap-2 font-medium text-fg",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									r.pass ? "PASS" : "FAIL",
									" · ",
									r.name
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono text-dim",
									children: [
										"d=",
										r.d_ij?.toFixed(3) ?? "—",
										" z=",
										r.z ?? "—"
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-dim",
								children: r.note
							})]
						}, r.id))
					})]
				})]
			})
		]
	});
}
/** Discoverability: Lite hides catalogs/imagery — offer one-tap upgrade. */
function LiteModeChip({ className = "" }) {
	const mode = useObservatory((s) => s.mode);
	const setMode = useObservatory((s) => s.setMode);
	if (mode !== "lite") return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[0.7rem] text-fg ${className}`,
		role: "status",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge, {
				className: "h-3.5 w-3.5 text-primary",
				"aria-hidden": true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
					className: "text-primary",
					children: "Lite"
				}), " — data saver on. Catalogs, SDO movies & heavy charts off."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "ww-btn min-h-8 px-2 text-[0.62rem]",
				onClick: () => setMode("standard"),
				children: "Standard"
			})
		]
	});
}
/** Curated global + Pacific-relevant set (Cordaro X posts often cite Pacific IMOs). */
var MAG_STATIONS = [
	{
		code: "HYB",
		name: "Hyderabad, India",
		lat: 17.417,
		lon: 78.553,
		region: "India",
		priority: true
	},
	{
		code: "IZN",
		name: "Iznik, Turkey",
		lat: 40.43,
		lon: 29.72,
		region: "Europe",
		priority: true
	},
	{
		code: "BOU",
		name: "Boulder, USA",
		lat: 40.137,
		lon: -105.237,
		region: "N America",
		priority: true
	},
	{
		code: "FRD",
		name: "Fredericksburg, USA",
		lat: 38.205,
		lon: -77.373,
		region: "N America"
	},
	{
		code: "TUC",
		name: "Tucson, USA",
		lat: 32.174,
		lon: -110.733,
		region: "N America"
	},
	{
		code: "HON",
		name: "Honolulu, USA",
		lat: 21.32,
		lon: -158,
		region: "Pacific",
		priority: true
	},
	{
		code: "GUA",
		name: "Guam, USA",
		lat: 13.59,
		lon: 144.87,
		region: "Pacific",
		priority: true
	},
	{
		code: "CTA",
		name: "Charters Towers, Australia",
		lat: -20.09,
		lon: 146.26,
		region: "Australia",
		priority: true
	},
	{
		code: "CNB",
		name: "Canberra, Australia",
		lat: -35.32,
		lon: 149.36,
		region: "Australia",
		priority: true
	},
	{
		code: "ASP",
		name: "Alice Springs, Australia",
		lat: -23.76,
		lon: 133.88,
		region: "Australia"
	},
	{
		code: "KNY",
		name: "Kanoya, Japan",
		lat: 31.42,
		lon: 130.88,
		region: "Japan",
		priority: true
	},
	{
		code: "KAK",
		name: "Kakioka, Japan",
		lat: 36.23,
		lon: 140.19,
		region: "Japan",
		priority: true
	},
	{
		code: "PPT",
		name: "Pamatai, French Polynesia",
		lat: -17.57,
		lon: -149.58,
		region: "Pacific",
		priority: true
	},
	{
		code: "API",
		name: "Apia, Samoa",
		lat: -13.81,
		lon: -171.78,
		region: "Pacific"
	},
	{
		code: "EYR",
		name: "Eyrewell, New Zealand",
		lat: -43.41,
		lon: 172.35,
		region: "NZ",
		priority: true
	},
	{
		code: "IPM",
		name: "Isla de Pascua, Chile",
		lat: -27.17,
		lon: -109.42,
		region: "Pacific"
	},
	{
		code: "PHU",
		name: "Phuthuy, Vietnam",
		lat: 21.03,
		lon: 105.95,
		region: "SE Asia"
	},
	{
		code: "TAM",
		name: "Tamanrasset, Algeria",
		lat: 22.79,
		lon: 5.53,
		region: "Africa"
	},
	{
		code: "ABK",
		name: "Abisko, Sweden",
		lat: 68.36,
		lon: 18.82,
		region: "Arctic"
	},
	{
		code: "BRW",
		name: "Barrow, USA",
		lat: 71.32,
		lon: -156.62,
		region: "Arctic"
	},
	{
		code: "CMO",
		name: "College, USA",
		lat: 64.87,
		lon: -147.86,
		region: "Alaska"
	},
	{
		code: "BEL",
		name: "Belsk, Poland",
		lat: 51.84,
		lon: 20.79,
		region: "Europe"
	},
	{
		code: "CLF",
		name: "Chambon-la-Forêt, France",
		lat: 48.02,
		lon: 2.26,
		region: "Europe"
	},
	{
		code: "HAD",
		name: "Hartland, UK",
		lat: 51,
		lon: -4.48,
		region: "Europe"
	}
];
function getStation(code) {
	return MAG_STATIONS.find((s) => s.code === code.toUpperCase());
}
function haversineKm(lat1, lon1, lat2, lon2) {
	const R = 6371;
	const toR = (d) => d * Math.PI / 180;
	const dLat = toR(lat2 - lat1);
	const dLon = toR(lon2 - lon1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
/**
* Magnetic anomaly series analysis + quake time-distance matching.
* Exploratory only — Cordaro-style relative probability, NOT a forecast product.
*/
/** drmagneto samples ~every 30s for ~24h */
var STEP_MS = 3e4;
function seriesFromProcessed(processed, raw, dayStartMs) {
	return processed.map((v, i) => ({
		t: dayStartMs + i * STEP_MS,
		v: Number(v) || 0,
		raw: raw?.[i] != null ? Number(raw[i]) : void 0
	}));
}
function findPeaks(series, threshold) {
	const peaks = [];
	let i = 0;
	while (i < series.length) {
		if (series[i].v < threshold) {
			i++;
			continue;
		}
		let j = i;
		let maxV = series[i].v;
		let maxT = series[i].t;
		while (j < series.length && series[j].v >= threshold) {
			if (series[j].v > maxV) {
				maxV = series[j].v;
				maxT = series[j].t;
			}
			j++;
		}
		peaks.push({
			t: maxT,
			v: maxV,
			durationSec: (j - i) * STEP_MS / 1e3
		});
		i = j;
	}
	return peaks.sort((a, b) => b.v - a.v).slice(0, 24);
}
function matchPeaksToQuakes(opts) {
	const pre = (opts.preMin ?? 60) * 6e4;
	const post = (opts.postMin ?? 360) * 6e4;
	const maxD = opts.maxDistKm ?? 8e3;
	const minMag = opts.minMag ?? 4;
	const matches = [];
	for (const peak of opts.peaks) for (const f of opts.features) {
		const mag = f.properties.mag ?? 0;
		if (mag < minMag) continue;
		const time = f.properties.time;
		if (typeof time !== "number") continue;
		const lag = time - peak.t;
		if (lag < -pre || lag > post) continue;
		const [lon, lat, depth] = f.geometry.coordinates;
		const distKm = haversineKm(opts.station.lat, opts.station.lon, lat, lon);
		if (distKm > maxD) continue;
		const lagMin = lag / 6e4;
		const lagFactor = lagMin >= 0 ? 1 / (1 + lagMin / 120) : .4 / (1 + Math.abs(lagMin) / 60);
		const distFactor = 1 / (1 + distKm / 2e3);
		const score = peak.v * mag * lagFactor * distFactor;
		matches.push({
			peak,
			quake: {
				id: String(f.id ?? `${lat},${lon},${time}`),
				mag,
				place: f.properties.place || "Event",
				time,
				lat,
				lon,
				depth: depth ?? 0
			},
			lagMin,
			distKm,
			score
		});
	}
	return matches.sort((a, b) => b.score - a.score).slice(0, 20);
}
function assessMagneto(opts) {
	const vals = opts.series.map((p) => p.v);
	const peak = vals.length ? Math.max(...vals) : 0;
	const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
	const aboveCount = vals.filter((v) => v >= opts.threshold).length;
	const peaks = findPeaks(opts.series, opts.threshold);
	const matches = matchPeaksToQuakes({
		peaks,
		station: opts.station,
		features: opts.features
	});
	let plain;
	if (!vals.length) plain = "No magneto series for this station today.";
	else if (peak < opts.threshold) plain = `Quiet on ${opts.station.code}: peak relative level ${peak.toFixed(2)} below threshold ${opts.threshold}.`;
	else plain = `${opts.station.code} shows ${peaks.length} interval(s) ≥ ${opts.threshold} (peak ${peak.toFixed(2)}). ${matches.length ? `${matches.length} catalog quake(s) within time/distance window of peaks (exploratory match only).` : "No M4+ catalog quakes fall in the match window — null is valid."}`;
	return {
		station: opts.station,
		threshold: opts.threshold,
		n: vals.length,
		peak,
		mean,
		aboveCount,
		peaks,
		matches,
		plain,
		caveat: "Exploratory overlay inspired by Richard Cordaro’s public INTERMAGNET processing (drmagneto). Relative probability is not a proven precursor and is not an official warning. Space weather (Kp/Dst) also moves ground magnetometers — always cross-check SWPC scales."
	};
}
/**
* Server proxy → Richard Cordaro public tool (drmagneto.appspot.com).
* Browser CORS / rate limits make direct calls unreliable.
*/
var fetchDrmagnetoChart = createServerFn({ method: "POST" }).inputValidator((input) => ({
	station: String(input.station || "HYB").toUpperCase().slice(0, 6),
	threshold: typeof input.threshold === "number" ? input.threshold : .4,
	date: input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : null
})).handler(createSsrRpc("741e55f7d66b43aabecab66a3098a5c3d8116009a23c5bdeca3f968e5d11f7b9"));
/**
* Scan evenly-ish sampled series for sudden steps.
* @param series t ascending ms, v in nT (or relative units for drmagneto)
* @param opts.stepSec window for delta (default 3 min)
* @param opts.minAbs step threshold (nT or relative)
*/
function scanSuddenSteps(series, opts) {
	const stepSec = opts?.stepSec ?? 180;
	const minAbs = opts?.minAbs ?? 15;
	const source = opts?.source ?? "ground-H";
	const unit = opts?.unit ?? "nT";
	const candidates = [];
	if (series.length < 4) return {
		candidates: [],
		plain: "Not enough samples for SSC/SI step scan.",
		method: `Δ over ${stepSec}s · thr ${minAbs} ${unit}`
	};
	let j = 0;
	for (let i = 0; i < series.length; i++) {
		const t0 = series[i].t;
		const target = t0 + stepSec * 1e3;
		while (j < series.length - 1 && series[j].t < target) j++;
		if (j <= i) continue;
		const dB = series[j].v - series[i].v;
		if (Math.abs(dB) >= minAbs) {
			const last = candidates[candidates.length - 1];
			if (last && Math.abs(last.t - t0) < 10 * 6e4) {
				if (Math.abs(dB) > Math.abs(last.dB)) candidates[candidates.length - 1] = {
					t: t0,
					dB,
					windowSec: stepSec,
					source,
					note: `${dB >= 0 ? "+" : ""}${dB.toFixed(1)} ${unit} in ${stepSec}s`
				};
			} else candidates.push({
				t: t0,
				dB,
				windowSec: stepSec,
				source,
				note: `${dB >= 0 ? "+" : ""}${dB.toFixed(1)} ${unit} in ${stepSec}s`
			});
		}
	}
	candidates.sort((a, b) => Math.abs(b.dB) - Math.abs(a.dB));
	const top = candidates.slice(0, 12);
	let plain;
	if (!top.length) plain = `No SSC/SI-like steps ≥ ${minAbs} ${unit} over ${stepSec}s windows.`;
	else {
		const best = top[0];
		plain = `${top.length} candidate step(s); largest ${best.note} at ${new Date(best.t).toISOString().slice(11, 19)}Z (${source}). Correlate with SWPC scales / solar wind — not an official SSC list.`;
	}
	return {
		candidates: top,
		plain,
		method: `Δ over ${stepSec}s · thr ${minAbs} ${unit} · source ${source}`
	};
}
/** Relative drmagneto series: lower absolute threshold, same shape. */
function scanDrmagnetoSteps(series, minAbs = .35) {
	return scanSuddenSteps(series, {
		stepSec: 300,
		minAbs,
		source: "drmagneto-raw",
		unit: "rel"
	});
}
var URL$1 = "https://services.swpc.noaa.gov/json/goes/primary/magnetometers-1-day.json";
async function fetchGoesMagnetometer() {
	try {
		const res = await fetch(URL$1);
		if (!res.ok) return [];
		const raw = await res.json();
		if (!Array.isArray(raw)) return [];
		return raw.map((r) => {
			const t = Date.parse(r.time_tag);
			return {
				time_tag: r.time_tag,
				t: Number.isFinite(t) ? t : 0,
				satellite: r.satellite ?? 0,
				He: Number(r.He) || 0,
				Hp: Number(r.Hp) || 0,
				Hn: Number(r.Hn) || 0,
				total: Number(r.total) || 0,
				arcjet_flag: Boolean(r.arcjet_flag)
			};
		}).filter((r) => r.t > 0);
	} catch {
		return [];
	}
}
var INTERMAGNET_FORMATS = [
	{
		id: "iaga-2002",
		name: "IAGA-2002",
		cadence: "ms → monthly (common: 1s, 1min)",
		use: "ASCII exchange between observatories, WDCs, and analysis software",
		notes: "70-char records + header. Four elements per line (XYZF, DHZF, …). Missing often 99999.00.",
		credit: "IAGA / NCEI / Kyoto WDC documentation"
	},
	{
		id: "imagcdf",
		name: "ImagCDF",
		cadence: "1s / 1min definitive",
		use: "INTERMAGNET official CDF packaging from ~2015",
		notes: "Filename: [IAGA]_[datetime]_[cadence]_[level].cdf — needs CDF libs to read.",
		credit: "INTERMAGNET Technical Notes / GitHub INTERMAGNET"
	},
	{
		id: "iaf",
		name: "IAF (archive)",
		cadence: "1-minute means",
		use: "Legacy INTERMAGNET archive bundles",
		notes: "View/convert via BGS IMCDview / gm_convert.",
		credit: "INTERMAGNET / BGS"
	},
	{
		id: "imf",
		name: "IMF (minute mean)",
		cadence: "1-minute",
		use: "Classic INTERMAGNET minute-mean exchange",
		notes: "Often converted to IAGA-2002 for modern pipelines.",
		credit: "INTERMAGNET"
	},
	{
		id: "wdc",
		name: "WDC classic",
		cadence: "hourly / minute variants",
		use: "World Data Centre historical archives",
		notes: "Still appears in conversion toolchains (WDC ↔ IAGA).",
		credit: "WDC Geomagnetism (e.g. Kyoto, Edinburgh)"
	},
	{
		id: "drmagneto-processed",
		name: "drmagneto processed H",
		cadence: "~30s relative series (public tool)",
		use: "Cordaro relative-probability / anomaly desk (this app’s live magneto path)",
		notes: "JSON: processed_data[], raw_data[], data_source (often H). Not an official INTERMAGNET product.",
		credit: "Richard Cordaro @rrichcord · data provider INTERMAGNET"
	}
];
/**
* Magnetic anomaly desk — data via Richard Cordaro’s public INTERMAGNET tool
* (drmagneto.appspot.com). Quake matches are exploratory time/distance co-incidence only.
*/
function MagnetoPanel({ compact = false }) {
	const eq = useObservatory((s) => s.eq);
	const flyMapTo = useObservatory((s) => s.flyMapTo);
	const setTab = useObservatory((s) => s.setTab);
	const pickEvent = useObservatory((s) => s.pickEvent);
	const [station, setStation] = (0, import_react.useState)("HYB");
	const [threshold, setThreshold] = (0, import_react.useState)(.4);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [rawSeries, setRawSeries] = (0, import_react.useState)([]);
	const [fullSeries, setFullSeries] = (0, import_react.useState)([]);
	const [meta, setMeta] = (0, import_react.useState)(null);
	const [assessment, setAssessment] = (0, import_react.useState)(null);
	const [sscResult, setSscResult] = (0, import_react.useState)(null);
	const [goesSsc, setGoesSsc] = (0, import_react.useState)(null);
	const [showFormats, setShowFormats] = (0, import_react.useState)(false);
	const stMeta = getStation(station) ?? MAG_STATIONS[0];
	const load = async (code = station, thr = threshold) => {
		setLoading(true);
		setError(null);
		try {
			const d = await fetchDrmagnetoChart({ data: {
				station: code,
				threshold: thr
			} });
			if (d.error || !d.processed_data.length) {
				setRawSeries([]);
				setAssessment(null);
				setMeta(null);
				setError(d.error || "No data for this station right now");
				return;
			}
			const dayStart = /* @__PURE__ */ new Date();
			dayStart.setUTCHours(0, 0, 0, 0);
			const series = seriesFromProcessed(d.processed_data, d.raw_data, dayStart.getTime());
			const step = Math.max(1, Math.floor(series.length / 288));
			const chart = series.filter((_, i) => i % step === 0);
			setFullSeries(series);
			setRawSeries(chart);
			setMeta({
				name: d.station_name,
				source: d.data_source
			});
			const st = getStation(code) ?? {
				code,
				name: d.station_name,
				lat: 0,
				lon: 0,
				region: "?"
			};
			setAssessment(assessMagneto({
				station: st,
				series,
				threshold: thr,
				features: eq?.features ?? []
			}));
			const stepSeries = series[0]?.raw != null ? series.map((p) => ({
				t: p.t,
				v: p.raw ?? p.v
			})) : series.map((p) => ({
				t: p.t,
				v: p.v
			}));
			setSscResult(series[0]?.raw != null ? scanSuddenSteps(stepSeries, {
				stepSec: 180,
				minAbs: 8,
				source: "ground-H",
				unit: "nT-ish"
			}) : scanDrmagnetoSteps(stepSeries, Math.max(.25, thr * .8)));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Magneto fetch failed");
			setRawSeries([]);
			setAssessment(null);
		} finally {
			setLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		load();
		(async () => {
			const goes = await fetchGoesMagnetometer();
			if (!goes.length) {
				setGoesSsc(null);
				return;
			}
			const cut = Date.now() - 12 * 36e5;
			const series = goes.filter((g) => g.t >= cut && !g.arcjet_flag).map((g) => ({
				t: g.t,
				v: g.Hp
			}));
			setGoesSsc(scanSuddenSteps(series, {
				stepSec: 180,
				minAbs: 12,
				source: "goes-Hp",
				unit: "nT"
			}));
		})();
	}, []);
	(0, import_react.useEffect)(() => {
		if (!fullSeries.length) return;
		const st = getStation(station);
		if (!st) return;
		setAssessment(assessMagneto({
			station: st,
			series: fullSeries,
			threshold,
			features: eq?.features ?? []
		}));
	}, [
		eq?.features,
		fullSeries,
		station,
		threshold
	]);
	const chartData = (0, import_react.useMemo)(() => rawSeries.map((p) => ({
		t: p.t,
		v: p.v,
		label: new Date(p.t).toISOString().slice(11, 16)
	})), [rawSeries]);
	if (compact) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-accent/30 bg-accent/5 p-2.5 text-[0.72rem]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-1 flex items-center justify-between gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "inline-flex items-center gap-1 font-semibold text-accent",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Magnet, { className: "h-3.5 w-3.5" }), " Magneto"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "ww-btn min-h-8 px-2 text-[0.62rem]",
				onClick: () => setTab("solar"),
				children: "Open"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-dim",
			children: "Cordaro-style INTERMAGNET relative probability · quake match exploratory"
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-3 rounded-xl border border-accent/30 bg-panel p-3 sm:p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
					className: "flex items-center gap-1.5 text-sm font-semibold text-accent",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Magnet, { className: "h-4 w-4" }), "Magnetic anomalies"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-0.5 text-[0.68rem] text-dim",
					children: [
						"INTERMAGNET via",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "https://drmagneto.appspot.com/",
							target: "_blank",
							rel: "noopener noreferrer",
							className: "text-primary hover:underline",
							children: "drmagneto.appspot.com"
						}),
						" ",
						"· method & public tool by",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XHandle, { profile: "cordaro" }),
						" · data matching to catalog quakes is exploratory only"
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: "https://drmagneto.appspot.com/",
					target: "_blank",
					rel: "noopener noreferrer",
					className: "ww-btn min-h-9 text-[0.68rem]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3.5 w-3.5" }), "Full tool"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-end gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-[0.65rem] text-dim",
						children: ["Station", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: "mt-0.5 block min-h-9 rounded-md border border-border bg-bg px-2 text-sm text-fg",
							value: station,
							onChange: (e) => setStation(e.target.value),
							children: MAG_STATIONS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: s.code,
								children: [
									s.code,
									" — ",
									s.name,
									s.priority ? " ★" : ""
								]
							}, s.code))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-[0.65rem] text-dim",
						children: [
							"Threshold",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "range",
								min: .1,
								max: 2,
								step: .05,
								value: threshold,
								onChange: (e) => setThreshold(Number(e.target.value)),
								className: "mt-1 block w-36 accent-violet-400"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-fg",
								children: threshold.toFixed(2)
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "ww-btn min-h-9 text-[0.68rem]",
						disabled: loading,
						onClick: () => void load(station, threshold),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `h-3.5 w-3.5 ${loading ? "animate-spin" : ""}` }), "Load / match"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ww-btn min-h-9 text-[0.68rem]",
						onClick: () => flyMapTo(stMeta.lat, stMeta.lon, 4),
						children: "Show station"
					})
				]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "rounded-md border border-warn/40 bg-warn/10 px-2.5 py-1.5 text-xs text-warn",
				children: [error, /e1|No valid|400/i.test(error) ? " — try HYB, IZN, or another star station; drmagneto availability varies by day." : ""]
			}),
			meta && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-[0.68rem] text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-fg",
						children: meta.name
					}),
					" (",
					station,
					") · component",
					" ",
					meta.source || "H",
					" · ",
					stMeta.region,
					" · ",
					chartData.length,
					" chart pts"
				]
			}),
			assessment && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-border bg-bg/40 px-3 py-2 text-xs text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium text-fg",
						children: assessment.plain
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[0.65rem] text-dim",
						children: assessment.caveat
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex flex-wrap gap-3 font-mono text-[0.7rem]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["peak ", assessment.peak.toFixed(2)] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["mean ", assessment.mean.toFixed(3)] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								"≥thr ",
								assessment.aboveCount,
								"/",
								assessment.n
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["peaks ", assessment.peaks.length] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["matches ", assessment.matches.length] })
						]
					})
				]
			}),
			chartData.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-48 w-full sm:h-56",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
						data: chartData,
						margin: {
							top: 8,
							right: 8,
							left: 0,
							bottom: 0
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								dataKey: "label",
								tick: {
									fontSize: 10,
									fill: "#64748b"
								},
								interval: "preserveStartEnd",
								minTickGap: 24
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								tick: {
									fontSize: 10,
									fill: "#64748b"
								},
								width: 32,
								domain: [0, "auto"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								contentStyle: {
									background: "#0f172a",
									border: "1px solid #1e293b",
									fontSize: 12
								},
								labelFormatter: (_, payload) => {
									const p = payload?.[0]?.payload;
									return p?.t ? new Date(p.t).toUTCString() : "";
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
								y: threshold,
								stroke: "#a78bfa",
								strokeDasharray: "4 4",
								label: {
									value: "thr",
									fill: "#a78bfa",
									fontSize: 10
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								type: "monotone",
								dataKey: "v",
								name: "Relative",
								stroke: "#a78bfa",
								dot: false,
								strokeWidth: 1.5,
								isAnimationActive: false
							})
						]
					})
				})
			}),
			(sscResult || goesSsc) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-border bg-bg/40 px-3 py-2 text-xs text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
						className: "mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-primary",
						children: "Sudden commencement / SI watch"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[0.65rem] text-dim",
						children: "Heuristic step scan (not Kyoto/ISGI official SSC lists). Pressure pulses → step in H / GOES Hp; if a storm follows, archives call it SSC."
					}),
					sscResult && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1.5 text-fg",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-accent",
								children: "Ground/tool:"
							}),
							" ",
							sscResult.plain
						]
					}),
					goesSsc && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-fg",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-primary",
								children: "GOES Hp (SWPC):"
							}),
							" ",
							goesSsc.plain
						]
					}),
					goesSsc && goesSsc.candidates[0] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 font-mono text-[0.65rem] text-dim",
						children: [
							"Largest GOES step: ",
							goesSsc.candidates[0].note,
							" ·",
							" ",
							new Date(goesSsc.candidates[0].t).toISOString()
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-border/80 bg-bg/30 px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "text-[0.7rem] font-semibold text-primary hover:underline",
					onClick: () => setShowFormats((v) => !v),
					children: [showFormats ? "Hide" : "Show", " INTERMAGNET data formats"]
				}), showFormats && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 space-y-1.5 text-[0.65rem] text-muted",
					children: INTERMAGNET_FORMATS.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-md border border-border/60 bg-panel/50 px-2 py-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold text-fg",
								children: f.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-dim",
								children: [" · ", f.cadence]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: f.use }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-dim",
								children: f.notes
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[0.6rem] text-dim",
								children: ["Credit: ", f.credit]
							})
						]
					}, f.id))
				})]
			}),
			assessment && assessment.matches.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
				className: "mb-1.5 flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wider text-primary",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "h-3.5 w-3.5" }), "Peak ↔ quake matches"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "scroll-thin max-h-48 space-y-1 overflow-y-auto",
				children: assessment.matches.slice(0, 12).map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border border-border/70 bg-bg/50 px-2 py-1.5 text-left text-[0.7rem] hover:bg-elevated",
					onClick: () => {
						pickEvent({
							id: m.quake.id,
							lat: m.quake.lat,
							lon: m.quake.lon,
							mag: m.quake.mag,
							place: m.quake.place,
							depth: m.quake.depth,
							time: m.quake.time
						});
						flyMapTo(m.quake.lat, m.quake.lon, 5, m.quake.id);
						setTab("live");
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-semibold text-fg",
							children: ["M", m.quake.mag.toFixed(1)]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "min-w-0 flex-1 truncate text-muted",
							children: m.quake.place
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono text-dim",
							children: [
								"lag ",
								m.lagMin >= 0 ? "+" : "",
								m.lagMin.toFixed(0),
								"m · ",
								Math.round(m.distKm),
								" km · peak",
								" ",
								m.peak.v.toFixed(2)
							]
						})
					]
				}) }, `${m.quake.id}-${m.peak.t}`))
			})] })
		]
	});
}
function SpaceWeatherPanel({ compact = false }) {
	const kp = useObservatory((s) => s.kp);
	const xray = useObservatory((s) => s.xray);
	const solarWind = useObservatory((s) => s.solarWind);
	const scales = useObservatory((s) => s.scales);
	const alerts = useObservatory((s) => s.alerts);
	const flux10cm = useObservatory((s) => s.flux10cm);
	const forecast = useObservatory((s) => s.forecast);
	const enlil = useObservatory((s) => s.enlil);
	const ovation = useObservatory((s) => s.ovation);
	const donki = useObservatory((s) => s.donki);
	useObservatory((s) => s.protons);
	const solarAssessment = useObservatory((s) => s.solarAssessment);
	const mode = useObservatory((s) => s.mode);
	const lastUpdate = useObservatory((s) => s.lastUpdate);
	const kpForecast = useObservatory((s) => s.kpForecast);
	const [channel, setChannel] = (0, import_react.useState)("0193");
	const [mediaTab, setMediaTab] = (0, import_react.useState)("disk");
	const [imgBroken, setImgBroken] = (0, import_react.useState)(false);
	const [playSdo, setPlaySdo] = (0, import_react.useState)(false);
	const [playLasco, setPlayLasco] = (0, import_react.useState)(null);
	const [soloUrl, setSoloUrl] = (0, import_react.useState)(null);
	const [soloMeta, setSoloMeta] = (0, import_react.useState)(null);
	const [soloLoading, setSoloLoading] = (0, import_react.useState)(false);
	const [deepOpen, setDeepOpen] = (0, import_react.useState)(() => {
		const base = {
			farside: false,
			models: false,
			alerts: false,
			catalogs: !(typeof window !== "undefined" && isMobileViewport())
		};
		if (typeof window === "undefined") return base;
		try {
			const raw = localStorage.getItem("wolfwatch_solar_deep");
			if (raw) return {
				...base,
				...JSON.parse(raw)
			};
		} catch {}
		return base;
	});
	const toggleDeep = (key) => {
		setDeepOpen((prev) => {
			const next = {
				...prev,
				[key]: !prev[key]
			};
			try {
				localStorage.setItem("wolfwatch_solar_deep", JSON.stringify(next));
			} catch {}
			return next;
		});
	};
	const latestKp = kp.length ? kp[kp.length - 1] : null;
	const kpVal = latestKp ? Number(latestKp.Kp) : null;
	const long = longChannelXrays(xray);
	const latestX = long.length ? long[long.length - 1] : null;
	const flux = latestX ? latestX.flux || latestX.observed_flux || 0 : 0;
	const xClass = latestX ? fluxToClass(flux) : "—";
	const kpUpcoming = (0, import_react.useMemo)(() => upcomingKpForecast(kpForecast, 8), [kpForecast]);
	const peak = long.length ? peakFlare(long) : null;
	const highKp = kpVal !== null && kpVal >= 5;
	const highX = xClass.startsWith("M") || xClass.startsWith("X");
	const southBz = solarWind?.bz != null && solarWind.bz <= -5;
	const showImages = MODES[mode].loadImage && !compact;
	const bust = lastUpdate ?? 0;
	const cmes = donki?.cmes ?? [];
	const flares = donki?.flares ?? [];
	const earthCmes = (0, import_react.useMemo)(() => earthDirectedCmes(cmes), [cmes]);
	const impact = (0, import_react.useMemo)(() => buildImpactBrief({
		scales,
		wind: solarWind,
		kp: kpVal,
		xClass,
		cmes
	}), [
		scales,
		solarWind,
		kpVal,
		xClass,
		cmes
	]);
	const assessment = (0, import_react.useMemo)(() => {
		if (solarAssessment) return solarAssessment;
		return {
			generatedAt: 0,
			impact,
			channels: [],
			headline: impact.title,
			observations: [],
			interpretation: [impact.summary],
			watchItems: impact.bullets,
			caveats: [],
			attention: 0,
			protons: {
				p10: null,
				p50: null,
				p100: null,
				time: null,
				sLike: false
			},
			enlilNote: ""
		};
	}, [solarAssessment, impact]);
	const highlights = (0, import_react.useMemo)(() => forecastHighlights(forecast?.threeDay ?? ""), [forecast?.threeDay]);
	const heroSrc = (0, import_react.useMemo)(() => sdoStill(channel, 512, bust), [channel, bust]);
	(0, import_react.useEffect)(() => {
		if (!showImages || mediaTab !== "farside" || soloUrl || soloLoading) return;
		let cancelled = false;
		setSoloLoading(true);
		(async () => {
			try {
				const frame = await fetchSoloFrame();
				if (cancelled) return;
				setSoloUrl(frame.url);
				setSoloMeta(frame.meta);
			} finally {
				if (!cancelled) setSoloLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [
		showImages,
		mediaTab,
		soloUrl,
		soloLoading
	]);
	if (compact) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge$1, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "h-3 w-3" }),
						label: "Kp",
						value: kpVal != null ? kpVal.toFixed(1) : "—",
						alert: highKp
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge$1, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "h-3 w-3" }),
						label: "X-ray",
						value: xClass,
						alert: highX
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge$1, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wind, { className: "h-3 w-3" }),
						label: "SW",
						value: solarWind?.speed != null ? String(Math.round(solarWind.speed)) : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge$1, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-3 w-3" }),
						label: "Bz",
						value: solarWind?.bz != null ? solarWind.bz.toFixed(1) : "—",
						alert: southBz
					})
				]
			}),
			scales && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-center text-[0.65rem] text-muted",
				children: [
					"R",
					scales.R,
					" · S",
					scales.S,
					" · G",
					scales.G,
					earthCmes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-warn",
						children: [
							" · ",
							earthCmes.length,
							" Earth CME"
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: `text-[0.65rem] leading-snug ${impact.color === "danger" ? "text-danger" : impact.color === "warn" ? "text-warn" : impact.color === "gold" ? "text-gold" : "text-dim"}`,
				children: [
					impact.title,
					": ",
					impact.summary
				]
			})
		]
	});
	const levelBorder = impact.color === "danger" ? "border-danger/40 bg-danger/10" : impact.color === "warn" ? "border-warn/35 bg-warn/10" : impact.color === "gold" ? "border-gold/35 bg-gold/10" : impact.color === "primary" ? "border-primary/30 bg-primary/5" : "border-border bg-panel";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-5xl space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-end justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold text-primary sm:text-xl",
					children: "SunWolf Solar Observatory"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-dim",
					children: "Storm watch · Earth impact · disk → corona → far side · free public feeds only"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-1.5 text-[0.62rem] text-dim",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full border border-border px-2 py-0.5",
							children: "NOAA SWPC"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full border border-border px-2 py-0.5",
							children: "NASA SDO"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full border border-border px-2 py-0.5",
							children: "SOHO LASCO"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full border border-border px-2 py-0.5",
							children: "STEREO-A"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full border border-border px-2 py-0.5",
							children: "Solar Orbiter"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full border border-border px-2 py-0.5",
							children: "DONKI"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiteModeChip, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-panel/80 px-2.5 py-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttentionSparkline, {}), kpUpcoming.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-1 text-[0.62rem] text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold uppercase tracking-wide text-dim",
						children: "Kp fc"
					}), kpUpcoming.slice(0, 6).map((p) => {
						const k = p.kp;
						const tone = k >= 5 ? "text-danger" : k >= 4 ? "text-warn" : "text-fg";
						const lab = p.time_tag.slice(5, 13).replace("T", " ");
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: `font-mono tabular-nums ${tone}`,
							title: p.time_tag,
							children: [
								lab,
								"·",
								k.toFixed(1)
							]
						}, p.time_tag);
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuptContinuumStrip, { compact: true }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MagnetoPanel, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ladder, {
				title: "1 · Ops brief",
				hint: "Scales · wind · CME impact (not SUPT)"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: `rounded-xl border p-4 ${levelBorder}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex flex-wrap items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-4 w-4 text-primary" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-sm font-semibold text-fg",
								children: impact.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full border border-border bg-bg/50 px-2 py-0.5 text-[0.62rem] uppercase tracking-wide text-dim",
								children: impact.level
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: impact.summary
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-2 space-y-1.5 text-xs leading-relaxed text-muted",
						children: impact.bullets.map((b, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: b })]
						}, i))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ladder, {
				title: "2 · Live instruments",
				hint: "Gauges · protons · scales · forecast"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge$1, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "h-3.5 w-3.5" }),
						label: "Kp now",
						value: kpVal != null ? kpVal.toFixed(1) : "—",
						alert: highKp
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge$1, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "h-3.5 w-3.5" }),
						label: "X-ray",
						value: xClass,
						alert: highX
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge$1, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wind, { className: "h-3.5 w-3.5" }),
						label: "SW km/s",
						value: solarWind?.speed != null ? String(Math.round(solarWind.speed)) : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge$1, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-3.5 w-3.5" }),
						label: "Bz nT",
						value: solarWind?.bz != null ? solarWind.bz.toFixed(1) : "—",
						alert: southBz
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge$1, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "h-3.5 w-3.5" }),
						label: "10.7 cm",
						value: flux10cm?.flux != null ? String(Math.round(flux10cm.flux)) : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge$1, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Orbit, { className: "h-3.5 w-3.5" }),
						label: "Bt nT",
						value: solarWind?.bt != null ? solarWind.bt.toFixed(1) : "—"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-3 gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge$1, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Atom, { className: "h-3.5 w-3.5" }),
						label: "p ≥10 MeV",
						value: assessment.protons.p10 != null ? assessment.protons.p10 >= 10 ? assessment.protons.p10.toFixed(1) : assessment.protons.p10.toFixed(2) : "—",
						alert: assessment.protons.sLike
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge$1, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Atom, { className: "h-3.5 w-3.5" }),
						label: "p ≥50 MeV",
						value: assessment.protons.p50 != null ? assessment.protons.p50.toFixed(3) : "—",
						alert: assessment.protons.p50 != null && assessment.protons.p50 >= 1
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge$1, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Atom, { className: "h-3.5 w-3.5" }),
						label: "p ≥100 MeV",
						value: assessment.protons.p100 != null ? assessment.protons.p100.toFixed(3) : "—",
						alert: assessment.protons.p100 != null && assessment.protons.p100 >= 1
					})
				]
			}),
			assessment.protons.time && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-center text-[0.62rem] text-dim",
				children: [
					"GOES integral protons (pfu) · ",
					new Date(assessment.protons.time).toUTCString().replace("GMT", "UTC"),
					assessment.protons.sLike ? " · ≥10 MeV in S1-class range" : ""
				]
			}),
			peak && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-center text-xs text-muted",
				children: [
					"24 h flare peak:",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: peak.class.startsWith("M") || peak.class.startsWith("X") ? "text-danger" : "text-gold",
						children: peak.class
					}),
					peak.time && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-dim",
						children: [
							" ",
							"· ",
							new Date(peak.time).toLocaleString(void 0, {
								month: "short",
								day: "numeric",
								hour: "2-digit",
								minute: "2-digit"
							}),
							" UTC"
						]
					})
				]
			}),
			scales && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScaleCard, {
						letter: "R",
						name: "Radio blackout",
						value: scales.R,
						text: scales.RText
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScaleCard, {
						letter: "S",
						name: "Solar radiation",
						value: scales.S,
						text: scales.SText
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScaleCard, {
						letter: "G",
						name: "Geomagnetic",
						value: scales.G,
						text: scales.GText
					})
				]
			}),
			(highlights.length > 0 || forecast?.issued) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-[0.7rem] font-medium uppercase tracking-wider text-primary",
							children: "SWPC 3-day outlook"
						}), forecast?.issued && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[0.62rem] text-dim",
							children: ["Issued ", forecast.issued]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-1.5 text-xs text-muted",
						children: highlights.map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: h }, i))
					}),
					scales?.RMinorProb && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-[0.68rem] text-dim",
						children: [
							"Day-1 probs · R minor ",
							scales.RMinorProb,
							"% · R major ",
							scales.RMajorProb ?? "—",
							"% · S",
							" ",
							scales.SProb ?? "—",
							"% · G ",
							scales.G1 ?? "—"
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ladder, {
				title: "3 · Catalogs",
				hint: "DONKI CME / flares",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "ww-btn min-h-8 text-[0.62rem]",
					onClick: () => toggleDeep("catalogs"),
					children: deepOpen.catalogs ? "Collapse" : "Expand"
				})
			}),
			mode === "lite" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-md border border-dashed border-border px-3 py-2 text-center text-[0.7rem] text-dim",
				children: "Lite mode: DONKI catalogs & imagery off for data saver. Switch to Standard for full Solar stack."
			}),
			deepOpen.catalogs && mode !== "lite" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid gap-3 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
							className: "mb-2 flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-primary",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-3.5 w-3.5" }), "Incoming CME watch (DONKI)"]
						}),
						donki?.error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mb-2 text-xs text-warn",
							children: ["Catalog: ", donki.error]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "scroll-thin max-h-56 space-y-2 overflow-y-auto",
							children: [(earthCmes.length ? earthCmes : cmes).slice(0, 8).map((c) => {
								const imp = cmeImpactSummary(c);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: c.link || "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
									target: "_blank",
									rel: "noopener noreferrer",
									className: "block rounded-lg border border-border/80 bg-bg/40 px-2.5 py-2 text-xs hover:border-primary/40",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-1.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono text-fg",
													children: c.startTime?.replace("Z", " UTC") ?? "—"
												}),
												imp.earth && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "rounded bg-warn/20 px-1.5 py-0.5 text-[0.58rem] font-semibold uppercase text-warn",
													children: "Earth"
												}),
												imp.speed != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-dim",
													children: [Math.round(imp.speed), " km/s"]
												})
											]
										}),
										imp.eta && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-0.5 text-primary",
											children: [
												"ETA ",
												new Date(imp.eta).toUTCString().replace("GMT", "UTC"),
												imp.kpHint != null ? ` · Kp~${imp.kpHint}` : ""
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-0.5 line-clamp-2 text-dim",
											children: [c.sourceLocation ? `${c.sourceLocation} · ` : "", (c.note || "CME").slice(0, 140)]
										})
									]
								}, c.activityID);
							}), !cmes.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-dim",
								children: "No CMEs in the 7-day DONKI window (or still loading)."
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "mb-2 flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-primary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-3.5 w-3.5" }), "Recent flares (DONKI)"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "scroll-thin max-h-56 space-y-2 overflow-y-auto",
						children: [flares.slice(0, 10).map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: f.link || "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
							target: "_blank",
							rel: "noopener noreferrer",
							className: "flex items-start justify-between gap-2 rounded-lg border border-border/80 bg-bg/40 px-2.5 py-2 text-xs hover:border-primary/40",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `font-mono font-semibold ${(f.classType || "").startsWith("X") || (f.classType || "").startsWith("M") ? "text-danger" : "text-fg"}`,
										children: f.classType || "—"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-dim",
										children: [
											" ",
											"· ",
											f.sourceLocation || "—",
											f.activeRegionNum ? ` · AR${f.activeRegionNum}` : ""
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-dim",
										children: (f.peakTime || f.beginTime || "").replace("Z", " UTC")
									})
								]
							}), f.linkedEvents && f.linkedEvents.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "shrink-0 text-[0.58rem] text-gold",
								children: [
									"+",
									f.linkedEvents.length,
									" linked"
								]
							})]
						}, f.flrID)), !flares.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-dim",
							children: "No cataloged flares in window (or still loading)."
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ladder, {
				title: "4 · Look",
				hint: "Disk · corona · far side · models"
			}),
			showImages ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-1",
						role: "tablist",
						"aria-label": "Solar media",
						children: [
							{
								id: "disk",
								label: "Earth-facing disk",
								Icon: Sun
							},
							{
								id: "corona",
								label: "Corona / CME",
								Icon: Eye
							},
							{
								id: "farside",
								label: "Far side / off-Earth",
								Icon: Satellite
							},
							{
								id: "models",
								label: "Arrival models",
								Icon: Orbit
							}
						].map(({ id, label, Icon }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							role: "tab",
							"aria-selected": mediaTab === id,
							onClick: () => setMediaTab(id),
							className: `inline-flex min-h-10 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[0.7rem] font-medium ${mediaTab === id ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-panel text-muted hover:bg-elevated"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-3.5 w-3.5" }), label]
						}, id))
					}),
					mediaTab === "disk" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1",
							role: "tablist",
							"aria-label": "SDO channel",
							children: SDO_CHANNELS.map((ch) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								title: ch.hint,
								onClick: () => {
									setChannel(ch.id);
									setImgBroken(false);
									setPlaySdo(false);
								},
								className: `rounded-md border px-2 py-1 text-[0.65rem] font-medium ${channel === ch.id ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-panel text-muted hover:bg-elevated"}`,
								children: ch.label
							}, ch.id))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mx-auto w-full max-w-[min(100%,28rem)]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-[#0a0a0c]",
								children: playSdo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
									className: "absolute inset-0 h-full w-full object-contain",
									src: sdoMovie(channel, 512, bust),
									controls: true,
									playsInline: true,
									autoPlay: true,
									poster: heroSrc
								}, sdoMovie(channel, 512, bust)) : !imgBroken ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: heroSrc,
									alt: `SDO ${channel}`,
									className: "absolute inset-0 h-full w-full object-contain",
									loading: "lazy",
									decoding: "async",
									onError: () => setImgBroken(true)
								}, heroSrc) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "absolute inset-0 flex items-center justify-center text-xs text-dim",
									children: "SDO image unavailable"
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[0.65rem] text-dim",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["NASA SDO · ", SDO_CHANNELS.find((c) => c.id === channel)?.hint] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "ww-btn min-h-9 text-[0.68rem]",
									onClick: () => setPlaySdo((v) => !v),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "h-3 w-3" }), playSdo ? "Show still" : "Play 48h movie"]
								})]
							})]
						})]
					}),
					mediaTab === "corona" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: ["c2", "c3"].map((cam) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-lg border border-border bg-panel p-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mb-1.5 flex items-center justify-between text-[0.68rem]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-medium text-fg",
										children: ["SOHO LASCO ", cam.toUpperCase()]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "ww-btn min-h-8 px-2 text-[0.62rem]",
										onClick: () => setPlayLasco((p) => p === cam ? null : cam),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "h-3 w-3" }), playLasco === cam ? "Still" : cam === "c2" ? "Movie ~1 MB" : "Movie ~9 MB"]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "relative aspect-square overflow-hidden rounded-md bg-[#0a0a0c]",
									children: playLasco === cam ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
										className: "h-full w-full object-contain",
										src: lascoMovie(cam, true, bust),
										controls: true,
										playsInline: true,
										autoPlay: true,
										poster: lascoStill(cam, 512, bust)
									}, lascoMovie(cam, true, bust)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: lascoStill(cam, 512, bust),
										alt: `LASCO ${cam}`,
										className: "h-full w-full object-contain",
										loading: "lazy"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-[0.62rem] text-dim",
									children: cam === "c2" ? "Near corona — CME launch structure" : "Wide corona — CME expansion toward planets"
								})
							]
						}, cam))
					}),
					mediaTab === "farside" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted",
								children: [
									"Earth only sees half the Sun. ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-fg",
										children: "STEREO-A"
									}),
									" gives a different heliolongitude (beacon EUV + coronagraph).",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-fg",
										children: "Solar Orbiter EUI"
									}),
									" is the true far-side / out-of- ecliptic view when data is downlinked (often laggy — we always show the newest frame Helioviewer has)."
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-3 sm:grid-cols-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaTile, {
										title: "STEREO-A EUVI 195",
										caption: "Off-Earth EUV beacon",
										src: stereoEuvi("195", 512, bust)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaTile, {
										title: "STEREO-A EUVI 304",
										caption: "Chromosphere / prominences",
										src: stereoEuvi("304", 512, bust)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaTile, {
										title: "STEREO-A COR2",
										caption: "Coronagraph from A",
										src: stereoCor2(512, bust)
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-3 lg:grid-cols-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-lg border border-border bg-panel p-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mb-1 text-[0.68rem] font-medium text-fg",
											children: "STEREO heliographic map"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: stereoHeliographic(bust),
											alt: "STEREO heliographic",
											className: "w-full rounded-md border border-border",
											loading: "lazy"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-[0.62rem] text-dim",
											children: "Where STEREO-A sits in longitude vs Earth — context for “far side.”"
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-lg border border-border bg-panel p-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mb-1 flex items-center justify-between gap-2 text-[0.68rem]",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-medium text-fg",
												children: "Solar Orbiter · EUI FSI 174"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
												href: "https://www.esa.int/Science_Exploration/Space_Science/Solar_Orbiter",
												target: "_blank",
												rel: "noopener noreferrer",
												className: "inline-flex items-center gap-0.5 text-dim hover:text-primary",
												children: ["ESA", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3 w-3" })]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "relative aspect-square overflow-hidden rounded-md bg-[#0a0a0c]",
											children: [
												soloLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "absolute inset-0 flex items-center justify-center text-xs text-dim",
													children: "Fetching newest Solo frame…"
												}),
												soloUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
													src: soloUrl,
													alt: "Solar Orbiter EUI",
													className: "h-full w-full object-contain",
													loading: "lazy"
												}),
												!soloLoading && !soloUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-dim",
													children: soloMeta || "Unavailable"
												})
											]
										}),
										soloMeta && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-[0.62rem] text-dim",
											children: soloMeta
										})
									]
								})]
							})
						]
					}),
					mediaTab === "models" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 lg:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-lg border border-border bg-panel p-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mb-1 flex items-center justify-between text-[0.68rem]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-medium text-fg",
											children: "WSA-ENLIL (SWPC)"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: "https://www.swpc.noaa.gov/products/wsa-enlil-solar-wind-prediction",
											target: "_blank",
											rel: "noopener noreferrer",
											className: "inline-flex items-center gap-0.5 text-dim hover:text-primary",
											children: ["About", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3 w-3" })]
										})]
									}),
									enlil?.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: enlil.url,
										alt: "WSA-ENLIL latest",
										className: "w-full rounded-md border border-border",
										loading: "lazy"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "py-8 text-center text-xs text-dim",
										children: "ENLIL frame loading…"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-[0.62rem] text-dim",
										children: [
											"Heliospheric density / CME propagation toward Earth",
											enlil?.timeHint ? ` · model ${enlil.timeHint}` : "",
											". Latest frame only (~100 KB)."
										]
									})
								]
							}),
							mode === "full" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-lg border border-border bg-panel p-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mb-1 text-[0.68rem] font-medium text-fg",
										children: "OVATION aurora (north)"
									}),
									ovation?.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: ovation.url,
										alt: "OVATION north",
										className: "w-full rounded-md border border-border",
										loading: "lazy"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "py-8 text-center text-xs text-dim",
										children: "Aurora model loading…"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-[0.62rem] text-dim",
										children: ["Short-term aurora oval estimate", ovation?.time_tag ? ` · ${new Date(ovation.time_tag).toUTCString().replace("GMT", "UTC")}` : ""]
									})
								]
							}),
							mode !== "full" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center rounded-lg border border-dashed border-border p-4 text-xs text-dim",
								children: [
									"Switch to ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "mx-1 text-fg",
										children: "Full"
									}),
									" mode for OVATION aurora frames + proton time series."
								]
							})
						]
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-md border border-dashed border-border px-3 py-2 text-center text-xs text-dim",
				children: "Imagery off in Lite (data saver). Gauges, scales, forecast & DONKI still run. Use Standard or Full for SDO / LASCO / STEREO / Solo."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ladder, {
				title: "5 · SUPT read",
				hint: "Multi-channel interpreter after instruments + look"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuptSolarAgent, { assessment }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ladder, {
				title: "6 · Recommendations",
				hint: "What to watch next"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecommendationsPanel, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ladder, {
				title: "7 · SWPC alerts",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "ww-btn min-h-8 text-[0.62rem]",
					onClick: () => toggleDeep("alerts"),
					children: deepOpen.alerts ? "Collapse" : "Expand"
				})
			}),
			deepOpen.alerts ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-2 text-[0.7rem] font-medium uppercase tracking-wider text-primary",
					children: "SWPC alerts & watches"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "scroll-thin max-h-40 space-y-1.5 overflow-y-auto text-[0.75rem] text-muted",
					children: [alerts.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No active high-level alerts or feed quiet." }), alerts.slice(0, 8).map((a, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "border-b border-border/60 pb-1.5 last:border-0",
						children: [(a.message || a.issue_datetime || "Alert").slice(0, 220), (a.message || "").length > 220 ? "…" : ""]
					}, i))]
				})]
			}) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-center text-[0.68rem] text-dim",
				children: "Alerts collapsed — expand to read SWPC text."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "pb-2 text-[0.62rem] leading-relaxed text-dim",
				children: [
					"Free stack: NOAA SWPC (scales, L1 wind, GOES X-ray, 10.7 cm, 3-day forecast, ENLIL, OVATION, alerts) · NASA SDO stills/MPEG · SOHO LASCO · STEREO-A beacons · Solar Orbiter EUI via Helioviewer · NASA CCMC DONKI (server proxy). Not an official forecast product — always verify with",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "https://www.swpc.noaa.gov/",
						target: "_blank",
						rel: "noopener noreferrer",
						className: "text-primary hover:underline",
						children: "SWPC"
					}),
					"."
				]
			})
		]
	});
}
function Ladder({ title, hint, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-center justify-between gap-2 pt-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "text-[0.7rem] font-semibold uppercase tracking-wider text-primary",
			children: title
		}), hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[0.62rem] text-dim",
			children: hint
		})] }), children]
	});
}
function Gauge$1({ icon, label, value, alert }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md border border-border bg-panel px-2.5 py-2 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-0.5 flex items-center justify-center gap-1 text-[0.65rem] uppercase tracking-wide text-dim",
			children: [icon, label]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `font-mono text-lg font-semibold tabular-nums ${alert ? "text-danger" : "text-fg"}`,
			children: value
		})]
	});
}
function ScaleCard({ letter, name, value, text }) {
	const n = parseInt(value, 10) || 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `rounded-lg border bg-panel px-3 py-2.5 ${n >= 3 ? "text-danger border-danger/40" : n >= 1 ? "text-warn border-warn/35" : "text-fg border-border"}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-baseline gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "font-mono text-2xl font-bold",
				children: [letter, value]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-[0.7rem] text-dim",
				children: name
			})]
		}), text && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-0.5 text-[0.65rem] capitalize text-muted",
			children: text
		})]
	});
}
function MediaTile({ title, caption, src }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-border bg-panel p-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-1 text-[0.68rem] font-medium text-fg",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "aspect-square overflow-hidden rounded-md bg-[#0a0a0c]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src,
					alt: title,
					className: "h-full w-full object-contain",
					loading: "lazy"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-[0.62rem] text-dim",
				children: caption
			})
		]
	});
}
/** Render children only after mount — keeps browser-only libs (Leaflet) off SSR. */
function ClientOnly({ children, fallback = null }) {
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setReady(true);
	}, []);
	if (!ready) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: fallback });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
/**
* Fixed Omori–Utsu / productivity control params (not MLE-fitted live).
* Not L-BFGS-B — no bound-pin from a fit. Reliability is gated by sample size
* and residual health instead.
*/
var OMORI_CONTROL = {
	K: .28,
	/** Omori c in days */
	cDay: .02,
	p: 1.15,
	/** Productivity α_e (log10-mag style scale in this lite form) */
	alphaE: 1.8,
	/** Fraction of catalog rate attributed to background μ */
	muFraction: .35,
	/**
	* Minimum events before residual control may emit a positive verdict.
	* Below this → Insufficient (event-count), not Survives.
	*/
	minEventsForVerdict: 12,
	/** Minimum residual gaps after transform for a positive verdict */
	minResidualGaps: 8
};
var K = OMORI_CONTROL.K;
var C_DAY = OMORI_CONTROL.cDay;
var P = OMORI_CONTROL.p;
var ALPHA_E = OMORI_CONTROL.alphaE;
function interEventGapsSec(timesMs) {
	const t = timesMs.filter(Number.isFinite).sort((a, b) => a - b);
	const out = [];
	for (let i = 1; i < t.length; i++) {
		const dt = (t[i] - t[i - 1]) / 1e3;
		if (dt > 0) out.push(dt);
	}
	return out;
}
function residualHealth(gaps) {
	if (gaps.length < OMORI_CONTROL.minResidualGaps) return {
		ok: false,
		note: "Residual series too short after transform."
	};
	const finite = gaps.filter((g) => Number.isFinite(g) && g > 0);
	if (finite.length < OMORI_CONTROL.minResidualGaps) return {
		ok: false,
		note: "Non-finite or non-positive residual gaps."
	};
	const mean = finite.reduce((s, g) => s + g, 0) / finite.length;
	if (!(mean > 0) || !Number.isFinite(mean)) return {
		ok: false,
		note: "Residual mean collapsed (numerical)."
	};
	let varSum = 0;
	for (const g of finite) varSum += (g - mean) ** 2;
	const cv = Math.sqrt(varSum / Math.max(1, finite.length - 1)) / (mean + 1e-12);
	const max = Math.max(...finite);
	const min = Math.min(...finite);
	if (cv < .05) return {
		ok: false,
		note: "Residual gaps nearly constant after transform — unreliable whitening (numerical)."
	};
	if (max / (min + 1e-12) > 1e6) return {
		ok: false,
		note: "Residual dynamic range exploded — unreliable whitening (numerical)."
	};
	return {
		ok: true,
		note: "Residual health OK."
	};
}
/**
* Build compensator residual gaps for SUPT control.
* ok=false → Insufficient (never interpret as Survives).
*/
function etasWhitenResiduals(events) {
	const cleaned = events.filter((e) => Number.isFinite(e.tMs) && Number.isFinite(e.mag)).sort((a, b) => a.tMs - b.tMs);
	const rawGapsSec = interEventGapsSec(cleaned.map((e) => e.tMs));
	const baseParams = {
		muPerSec: 0,
		K,
		cSec: C_DAY * 86400,
		p: P,
		alpha: ALPHA_E,
		m0: 0
	};
	if (cleaned.length < OMORI_CONTROL.minEventsForVerdict) return {
		ok: false,
		nEvents: cleaned.length,
		residualGaps: [],
		rawGapsSec,
		params: baseParams,
		reason: "event-count",
		note: `Need ≥ ${OMORI_CONTROL.minEventsForVerdict} events with magnitude for a reliable ETAS residual control (got ${cleaned.length}). Insufficient — not Survives.`
	};
	const t0 = cleaned[0].tMs / 1e3;
	const times = cleaned.map((e) => e.tMs / 1e3 - t0);
	const mags = cleaned.map((e) => e.mag);
	const m0 = Math.min(...mags);
	const T = times[times.length - 1] || 1;
	if (T < C_DAY * 86400 * 2) return {
		ok: false,
		nEvents: cleaned.length,
		residualGaps: [],
		rawGapsSec,
		params: {
			...baseParams,
			m0
		},
		reason: "numerical",
		note: "Catalog span too short relative to Omori c — residual control unreliable. Insufficient."
	};
	const muPerSec = Math.max(1e-8, cleaned.length * OMORI_CONTROL.muFraction / T);
	const cSec = C_DAY * 86400;
	function lambda(t, uptoExclusive) {
		let s = muPerSec;
		for (let i = 0; i < uptoExclusive; i++) {
			const ti = times[i];
			if (ti >= t) break;
			const dt = t - ti + cSec;
			if (dt <= 0) continue;
			const prod = K * Math.exp(ALPHA_E * (mags[i] - m0));
			s += prod * Math.pow(dt, -P);
		}
		return s;
	}
	function integrate(a, b, histEnd) {
		if (b <= a) return 0;
		const span = b - a;
		const steps = Math.min(80, Math.max(8, Math.ceil(span / (cSec * 2))));
		const h = span / steps;
		let acc = 0;
		for (let k = 0; k < steps; k++) {
			const t1 = a + k * h;
			const t2 = t1 + h;
			const l1 = lambda(t1, histEnd);
			const l2 = lambda(t2, histEnd);
			acc += .5 * (l1 + l2) * h;
		}
		return acc;
	}
	const tau = [0];
	let tauAcc = 0;
	for (let k = 1; k < times.length; k++) {
		const step = integrate(times[k - 1], times[k], k);
		if (!Number.isFinite(step) || step < 0) return {
			ok: false,
			nEvents: cleaned.length,
			residualGaps: [],
			rawGapsSec,
			params: {
				muPerSec,
				K,
				cSec,
				p: P,
				alpha: ALPHA_E,
				m0
			},
			reason: "numerical",
			note: "Compensator integral non-finite — residual control unreliable. Insufficient."
		};
		tauAcc += step;
		tau.push(tauAcc);
	}
	for (let k = 1; k < tau.length; k++) if (!(tau[k] >= tau[k - 1])) return {
		ok: false,
		nEvents: cleaned.length,
		residualGaps: [],
		rawGapsSec,
		params: {
			muPerSec,
			K,
			cSec,
			p: P,
			alpha: ALPHA_E,
			m0
		},
		reason: "numerical",
		note: "Compensator not monotone — residual control unreliable. Insufficient."
	};
	const residualGaps = [];
	for (let k = 1; k < tau.length; k++) {
		const d = tau[k] - tau[k - 1];
		if (d > 0 && Number.isFinite(d)) residualGaps.push(d);
	}
	const health = residualHealth(residualGaps);
	if (!health.ok) return {
		ok: false,
		nEvents: cleaned.length,
		residualGaps,
		rawGapsSec,
		params: {
			muPerSec,
			K,
			cSec,
			p: P,
			alpha: ALPHA_E,
			m0
		},
		reason: residualGaps.length < OMORI_CONTROL.minResidualGaps ? "residual-short" : "numerical",
		note: `${health.note} Insufficient — not Survives.`
	};
	return {
		ok: true,
		nEvents: cleaned.length,
		residualGaps,
		rawGapsSec,
		params: {
			muPerSec,
			K,
			cSec,
			p: P,
			alpha: ALPHA_E,
			m0
		},
		reason: "none",
		note: "Lite ETAS residual gaps ready — same frozen probe as raw. Fixed Omori params (not MLE / not L-BFGS-B), data-driven μ. Temporal only."
	};
}
/**
* Four-way control reading. Insufficient is a first-class fourth verdict —
* never promote unreliable whitening to Survives.
*/
function interpretEtasControl(raw, white, opts) {
	if (opts?.forceInsufficient) return {
		rawSeparated: raw.d_ij == null ? null : raw.separated,
		whiteSeparated: white.d_ij == null ? null : white.separated,
		rawD: raw.d_ij,
		whiteD: white.d_ij,
		verdict: "insufficient",
		reason: opts.reason ?? "numerical",
		plain: opts.note ?? "Insufficient — residual control not reliable enough for Survives / Vanishes / Both-null."
	};
	if (raw.d_ij == null || white.d_ij == null) return {
		rawSeparated: raw.d_ij == null ? null : raw.separated,
		whiteSeparated: white.d_ij == null ? null : white.separated,
		rawD: raw.d_ij,
		whiteD: white.d_ij,
		verdict: "insufficient",
		reason: white.d_ij == null ? "probe-null" : "probe-null",
		plain: raw.d_ij == null ? "Insufficient — raw probe null (need more events)." : "Insufficient — whitened probe null after residual transform."
	};
	const rs = raw.separated;
	const ws = white.separated;
	if (!rs && ws) return {
		rawSeparated: rs,
		whiteSeparated: ws,
		rawD: raw.d_ij,
		whiteD: white.d_ij,
		verdict: "insufficient",
		reason: "suspicious-residual",
		plain: "Insufficient — structure appears only after whitening (suspicious residual). Not reported as Survives."
	};
	if (rs && ws) return {
		rawSeparated: rs,
		whiteSeparated: ws,
		rawD: raw.d_ij,
		whiteD: white.d_ij,
		verdict: "survives",
		reason: "none",
		plain: "Structure survives whitening — not fully explained by background + Omori-style triggering (temporal only)."
	};
	if (rs && !ws) return {
		rawSeparated: rs,
		whiteSeparated: ws,
		rawD: raw.d_ij,
		whiteD: white.d_ij,
		verdict: "vanishes",
		reason: "none",
		plain: "Structure vanishes after whitening — raw d_ij was largely reading clustering ETAS already describes. Still a useful fast proxy."
	};
	return {
		rawSeparated: rs,
		whiteSeparated: ws,
		rawD: raw.d_ij,
		whiteD: white.d_ij,
		verdict: "both-null",
		reason: "none",
		plain: "Both null — no timing structure either way vs shuffle. First-class result, not a failure."
	};
}
/** Frozen probe as shipped in this app (TypeScript port). */
var PROBE_SNIPPET = `// src/lib/supt/probe.ts — frozen α = ${SUPT_ALPHA}, seed ${SUPT_SEED}
// Paul Sheppard SUPT probe · DO NOT retune

export const SUPT_ALPHA = ${SUPT_ALPHA};

export function probe(values: number[]): number | null {
  const x0 = values.filter((v) => Number.isFinite(v));
  if (x0.length < 4) return null;

  const sorted = x0.slice().sort((a, b) => a - b);
  const med = median(sorted);              // even-N: average of two middles
  const m = mad(x0, med);                  // median |x − med|
  const x = x0.map((v) => (v - med) / (m + 1e-12));

  const phi: number[] = [];
  let acc = 0;
  for (const v of x) { acc += v; phi.push(acc); }

  const g: number[] = [];
  for (let i = 1; i < phi.length; i++) g.push(phi[i]! - phi[i - 1]!);
  const meanAbs = g.reduce((s, v) => s + Math.abs(v), 0) / (g.length || 1);
  const gn = g.map((v) => v / (meanAbs + 1e-12));

  const C = new Array(gn.length);
  C[0] = Math.cos(2 * Math.PI * gn[0]!);
  for (let i = 1; i < gn.length; i++) {
    C[i] = SUPT_ALPHA * Math.cos(2 * Math.PI * gn[i]!)
         + (1 - SUPT_ALPHA) * C[i - 1]!;
  }

  // tail rule — Math.floor, never Math.round
  const tail = Math.max(50, Math.floor(0.2 * C.length));
  const slice = C.slice(-tail);
  const meanAbsC = slice.reduce((s, v) => s + Math.abs(v), 0) / (slice.length || 1);
  return -Math.log(meanAbsC + 1e-12);      // ← d_ij
}

// Null test (UI): shuffle sequence, re-probe, z = (d − null_mean) / null_sd
// separated ⇔ |z| ≥ 3 · null is a permitted outcome`;
/**
* SUPT mathematical derivation — shared UI for About / Rhythm.
* Frozen probe only; no free-form LLM narrative.
*/
function SuptMathSection({ compact = false, defaultOpen = true }) {
	const [open, setOpen] = (0, import_react.useState)(defaultOpen);
	if (compact) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl border border-accent/30 bg-panel p-3 sm:p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => setOpen((v) => !v),
			className: "flex min-h-10 w-full items-center gap-2 text-left",
			"aria-expanded": open,
			children: [
				open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4 shrink-0 text-accent" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4 shrink-0 text-accent" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareFunction, { className: "h-4 w-4 shrink-0 text-accent" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-semibold text-accent",
						children: "SUPT math"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[0.65rem] text-dim",
						children: [
							"Frozen probe · α = ",
							SUPT_ALPHA,
							" · how d",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "ij" }),
							" is built"
						]
					})]
				})
			]
		}), open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3 border-t border-border/70 pt-3",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MathBody, { dense: true })
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl border border-accent/35 bg-gradient-to-b from-accent/10 to-panel p-3 sm:p-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "mb-3 sm:mb-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
				className: "flex items-center gap-2 text-lg font-semibold text-accent sm:text-xl",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareFunction, { className: "h-5 w-5" }), "SUPT math"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-xs text-muted sm:text-sm",
				children: [
					"Derivation of the live operator used across Map, Solar, Rhythm, and Charts. Probe by",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XPerson, { profile: "sheppard" }),
					" · α = ",
					SUPT_ALPHA,
					" · seed ",
					SUPT_SEED,
					" (do not retune). Copyright effective date on TXu is not an operator-freeze claim."
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MathBody, {})]
	});
}
function MathBody({ dense = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: dense ? "space-y-3" : "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Block, {
				title: "1. Theory (Sheppard’s Equation)",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[0.78rem] leading-relaxed text-muted sm:text-sm",
						children: [
							"Observables are treated as resonance-collapsed ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "proxies"
							}),
							" ",
							"of a source field — not the field itself:"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Formula, { children: [
						"ψ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "i" }),
						"(Δt, Δφ, Δx) = ∇Φ ∘ R",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sup", { children: "−1" }),
						"(𝒫)"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[0.72rem] leading-relaxed text-dim",
						children: [
							"ψ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "i" }),
							" = observed proxy · Δt,Δφ,Δx = mismeasurement · ∇Φ = source potential gradient · R",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sup", { children: "−1" }),
							" = inverse resonance collapse on measured parameters 𝒫."
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Block, {
				title: "2. Input sequence",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[0.78rem] leading-relaxed text-muted sm:text-sm",
					children: "Any ordered positive series with n ≥ 4 finite values — e.g. quake inter-event gaps, flare/CME/X-ray-peak gaps. Order is load-bearing."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Formula, { children: "x₀ = (x₁, …, xₙ), n ≥ 4" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Block, {
				title: "3. Robust standardize",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Formula, { children: [
					"med = median(x₀) · MAD = median(|x₀ − med|)",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
					"x = (x₀ − med) / (MAD + ε) · ε = 10",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sup", { children: "−12" })
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[0.72rem] text-dim",
					children: "Scale-free, heavy-tail robust. Even-n median averages the two central values (port lock)."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Block, {
				title: "4. Path → phase → EMA",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Formula, { children: [
					"φ = cumsum(x) · g = diff(φ) · g̃ = g / mean(|g|)",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
					"uₖ = cos(2π g̃ₖ)",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
					"C₀ = u₀ · Cₖ = α uₖ + (1 − α) Cₖ₋₁ · α = ",
					SUPT_ALPHA
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[0.72rem] leading-relaxed text-dim",
					children: "Normalized steps map onto a circle; a long-memory EMA (α = 0.01) accumulates phase coherence. Ordered structure keeps |C| larger; shuffle wanders."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Block, {
				title: "5. Scalar address dᵢⱼ",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Formula, { children: [
					"T = max(50, ⌊0.2 |C|⌋) · μ_|C| = mean(|C| over last T)",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-gold",
						children: "dᵢⱼ = −log(μ_|C| + ε)"
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[0.72rem] text-dim",
					children: "Tail uses Math.floor, never round. Large late |C| → small d (coherence). Small |C| → large d (vacuum)."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Block, {
				title: "6. Bands & corpus anchors",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full min-w-[16rem] text-left text-[0.72rem] sm:text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-border text-dim",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-1.5 pr-2 font-medium",
									children: "Band"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-1.5 pr-2 font-medium",
									children: "dᵢⱼ"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-1.5 font-medium",
									children: "Reading"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", {
							className: "text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-b border-border/50",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5 pr-2 text-fg",
											children: "COHERENCE"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5 pr-2 font-mono",
											children: `d < 1`
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5",
											children: "More ordered than chance"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-b border-border/50",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5 pr-2 text-fg",
											children: "CLUTCH"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5 pr-2 font-mono",
											children: `1 ≤ d < 2`
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5",
											children: "Transitional (cusp ~1.88–1.96)"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-b border-border/50",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5 pr-2 text-fg",
											children: "SUB-FLOOR"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5 pr-2 font-mono",
											children: `2 ≤ d < ${SUPT_ANCHORS.zetaFloor}`
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5",
											children: "Weak structure"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-1.5 pr-2 text-fg",
										children: "VACUUM"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-1.5 pr-2 font-mono",
										children: `d ≥ ${SUPT_ANCHORS.zetaFloor}`
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-1.5",
										children: "ζ floor / sparse"
									})
								] })
							]
						})]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-[0.72rem] text-dim",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Corpus anchors (context only — never fitted live)"
						}),
						": ribosome ≈ ",
						SUPT_ANCHORS.ribosome,
						" · tokamak ≈ ",
						SUPT_ANCHORS.tokamak,
						" · CLASH ≈",
						" ",
						SUPT_ANCHORS.clash,
						" · ζ floor = ",
						SUPT_ANCHORS.zetaFloor,
						". Same number line across domains; a live d is not scored against these anchors as targets."
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Block, {
				title: "7. Shuffle null method",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[0.78rem] leading-relaxed text-muted sm:text-sm",
						children: [
							"A number alone means nothing. Every score ships with a shuffle null: same gaps, random order, fixed seed, Fisher–Yates. The Layer asks:",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "is this address far from a shuffle of itself?"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Formula, { children: [
						"d⁽ˢ⁾ = probe(shuffleₛ(x₀)) · z = (dᵢⱼ − d̄_null) / (σ_null + ε)",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						"separated ⇔ |z| ≥ 3 · seed = ",
						SUPT_SEED,
						" · mulberry32 + Fisher–Yates"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full min-w-[16rem] text-left text-[0.72rem] sm:text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-b border-border text-dim",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-1.5 pr-2 font-medium",
									children: "Outcome"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-1.5 font-medium",
									children: "Reading"
								})]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", {
								className: "text-muted",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-b border-border/50",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5 pr-2 font-medium text-fg",
											children: "Not separated"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5",
											children: "Null. Timing looks like a random reordering of the same gaps. Valid and informative — displayed, never hidden."
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-b border-border/50",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5 pr-2 font-medium text-fg",
											children: "Separated, low d"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5",
											children: "Ordered structure beyond shuffle (timing only)."
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-b border-border/50",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5 pr-2 font-medium text-fg",
											children: "Separated, cusp"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5",
											children: "Landing in 1.88–1.96 alone is not evidence — heavy-tailed noise reaches it ~12% of the time. Check the tails."
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-1.5 pr-2 font-medium text-fg",
										children: "Short window"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-1.5",
										children: "N < 50: tail can span most of the accumulator. Regime-valid; Layer flags lower precision."
									})] })
								]
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[0.72rem] font-medium text-fg",
						children: "Fisher–Yates implementation"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Formula, { children: [
						"for i = n−1 … 1: j = ⌊U·(i+1)⌋ · swap(aᵢ, aⱼ)",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						"U ← mulberry32(seed=",
						SUPT_SEED,
						") · copy first (never mutates input)"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "list-disc space-y-0.5 pl-4 text-[0.68rem] text-dim",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-muted",
								children: "Same multiset"
							}), " — only order is destroyed. Null asks whether order carried structure, not whether the gap sizes themselves are unusual."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-muted",
								children: "Reproducible"
							}), " — fixed seed → same null cloud every refresh for the same window multiset (plus floating noise only from n-shuffle count)."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-muted",
									children: "Uniform j"
								}),
								" — j ∈ ",
								"{0…i}",
								" so every permutation is equally likely (Durstenfeld form)."
							] })
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Block, {
				title: "8. ETAS aftershock whitening (control)",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[0.78rem] leading-relaxed text-muted sm:text-sm",
						children: [
							"Objection: seismic structure is “just aftershocks.” Control: temporal ETAS-style intensity with Omori–Utsu kernel → compensator residual times →",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: "identical" }),
							" frozen probe on whitened gaps."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Formula, { children: [
						"λ(t) = μ + Σ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "tᵢ < t" }),
						" K exp(αₑ(mᵢ−m₀)) (t − tᵢ + c)",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sup", { children: "−p" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						"τₖ = ∫₀",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sup", { children: "tₖ" }),
						" λ · residual gaps Δτ → probe(Δτ)"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-1 list-disc space-y-1 pl-4 text-[0.72rem] text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Survives whitening"
							}), " — not fully explained by background + Omori triggering (temporal only)."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Vanishes"
							}), " — raw dᵢⱼ was reading clustering ETAS already describes. Still a useful fast proxy."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Both null"
							}), " — no timing structure either way. First-class result."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Insufficient"
							}), " — fourth verdict / data guard: too few events, residual probe null, numerical residual health fail, or suspicious structure-only-after-whitening. Never promoted to Survives. (Lite control is fixed Omori params, not L-BFGS-B; bound-pin of a full MLE is out of scope here and would also route to Insufficient.)"] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[0.72rem] font-medium text-fg",
						children: "Omori–Utsu control parameters"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full min-w-[18rem] text-left text-[0.68rem] sm:text-[0.72rem]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-b border-border text-dim",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-1 pr-2 font-medium",
										children: "Param"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-1 pr-2 font-medium",
										children: "Value"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-1 font-medium",
										children: "Role"
									})
								]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", {
								className: "text-muted",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-b border-border/40",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-1 pr-2 font-mono text-fg",
												children: "c"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
												className: "py-1 pr-2 font-mono",
												children: [OMORI_CONTROL.cDay, " d"]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-1",
												children: "Time offset — finite rate at the parent shock (Utsu)"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-b border-border/40",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-1 pr-2 font-mono text-fg",
												children: "p"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-1 pr-2 font-mono",
												children: OMORI_CONTROL.p
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-1",
												children: "Power-law decay of aftershock rate"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-b border-border/40",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-1 pr-2 font-mono text-fg",
												children: "K"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-1 pr-2 font-mono",
												children: OMORI_CONTROL.K
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-1",
												children: "Productivity scale per trigger"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-b border-border/40",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-1 pr-2 font-mono text-fg",
												children: "αₑ"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-1 pr-2 font-mono",
												children: OMORI_CONTROL.alphaE
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-1",
												children: "Larger parents spawn more children"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1 pr-2 font-mono text-fg",
											children: "μ"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-1 pr-2 font-mono",
											children: [OMORI_CONTROL.muFraction, "×n/T"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1",
											children: "Background rate from the window (data-driven)"
										})
									] })
								]
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1.5 text-[0.65rem] text-dim",
						children: "Ballpark regional-ETAS values (c ~ 0.01–0.05 d, p ~ 1.0–1.3). Not fitted live — retuning would change the control, not the frozen SUPT probe."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-[0.72rem] font-medium text-fg",
						children: "Raw d vs whitened d"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full min-w-[18rem] text-left text-[0.68rem] sm:text-[0.72rem]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-b border-border text-dim",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-1 pr-2 font-medium",
									children: "Quantity"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-1 font-medium",
									children: "What it is"
								})]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", {
								className: "text-muted",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-b border-border/40",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5 pr-2 font-medium text-fg",
											children: "Raw dᵢⱼ"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-1.5",
											children: [
												"Frozen probe on ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "text-fg",
													children: "observed"
												}),
												" inter-event gaps. Live headline / continuum / Today bar. Includes aftershock clustering if present."
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-b border-border/40",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5 pr-2 font-medium text-fg",
											children: "Whitened dᵢⱼ"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-1.5",
											children: [
												"Same probe on ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "text-fg",
													children: "compensator residual"
												}),
												" gaps Δτ after removing a temporal ETAS/Omori intensity. Diagnostic only."
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-1.5 pr-2 font-medium text-fg",
										children: "How to read both"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-1.5",
										children: "Raw sep + white sep → structure beyond Omori-like clustering. Raw sep + white null → raw was mostly aftershock cadence. Both null → no timing order either way."
									})] })
								]
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1.5 text-[0.65rem] text-dim",
						children: [
							"Live Rhythm default = ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "raw"
							}),
							". Whitened never replaces raw in alerts or the hero card. Spatial clustering is out of scope."
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Block, {
				title: "9. UI implementation (frozen TypeScript)",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mb-2 text-[0.78rem] leading-relaxed text-muted sm:text-sm",
					children: [
						"Exact operator used by Rhythm, Solar Interpreter, continuum, and Charts — path",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "text-primary",
							children: "src/lib/supt/probe.ts"
						}),
						" · whitening control",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "text-primary",
							children: "src/lib/supt/etasWhiten.ts"
						}),
						"."
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeSnippet, { code: PROBE_SNIPPET })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-border/80 bg-bg/50 px-3 py-2.5 text-[0.68rem] leading-relaxed text-dim",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-1.5 font-semibold text-fg",
						children: "Bottom line — what this is not"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "list-disc space-y-0.5 pl-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Not a magnitude, CME-arrival, or Kp forecast." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Not a language model — deterministic function of the window numbers." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Not tunable — α, seed, tail rule, and band edges are frozen (do not retune)." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								"Not a claim that dᵢⱼ is ψᵢ — it is a fixed proxy ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: "address" }),
								" on the corpus axis."
							] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2",
						children: [
							"Timing and amplitude are separate stacks. Same operator on seismic gaps and solar catalog gaps; M and R/S/G never fold into dᵢⱼ. Null is displayed, not buried. Anchors are context-only, never fitted live.",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: SUPT_COPYRIGHT.notice
							}),
							"."
						]
					})
				]
			})
		]
	});
}
function Block({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
		className: "mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary",
		children: title
	}), children] });
}
function Formula({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "my-2 overflow-x-auto rounded-md border border-border bg-bg/60 px-3 py-2.5 font-mono text-[0.72rem] leading-relaxed text-primary sm:text-[0.78rem]",
		children
	});
}
function CodeSnippet({ code }) {
	const [copied, setCopied] = (0, import_react.useState)(false);
	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1800);
		} catch {}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative overflow-hidden rounded-lg border border-border bg-[#0a0c10]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-2 border-b border-border/80 px-2.5 py-1.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "truncate font-mono text-[0.62rem] text-dim",
				children: [
					"probe.ts · α = ",
					SUPT_ALPHA,
					" · frozen"
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => void copy(),
				className: "inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-border bg-panel px-2.5 text-[0.65rem] font-medium text-fg hover:bg-elevated",
				children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5 text-ok" }), "Copied"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3.5 w-3.5" }), "Copy"] })
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: "scroll-thin max-h-72 overflow-auto p-3 text-[0.65rem] leading-relaxed text-muted sm:max-h-80 sm:text-[0.7rem]",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
				className: "font-mono text-[0.65rem] text-[#c8d0e0] sm:text-[0.7rem]",
				children: code
			})
		})]
	});
}
var STATUS_STYLE = {
	quiet: "bg-primary/30 border-primary",
	elevated: "bg-gold/40 border-gold",
	active: "bg-warn/50 border-warn",
	watch: "bg-danger/60 border-danger animate-pulse-soft"
};
var STATUS_PLAIN = {
	quiet: "Quiet",
	elevated: "Elevated",
	active: "Active",
	watch: "Watch"
};
var TONE_CLASS = {
	none: "border-border bg-panel",
	chance: "border-primary/30 bg-primary/5",
	ordered: "border-gold/40 bg-gold/10",
	mixed: "border-warn/35 bg-warn/10",
	sparse: "border-border bg-elevated/40",
	null: "border-border bg-panel"
};
function ResonancePanel() {
	const resonance = useObservatory((s) => s.resonance);
	const reading = useObservatory((s) => s.reading);
	const eq = useObservatory((s) => s.eq);
	const minMag = useObservatory((s) => s.minMag);
	const maxMag = useObservatory((s) => s.maxMag);
	const timeWindow = useObservatory((s) => s.timeWindow);
	const refresh = useObservatory((s) => s.refresh);
	const loading = useObservatory((s) => s.loading);
	const setFocusNode = useObservatory((s) => s.setFocusNode);
	const setTab = useObservatory((s) => s.setTab);
	const focusNodeId = useObservatory((s) => s.focusNodeId);
	const mode = useObservatory((s) => s.mode);
	const [showTech, setShowTech] = (0, import_react.useState)(false);
	const [showEtas, setShowEtas] = (0, import_react.useState)(false);
	const features = filteredEq(eq?.features, minMag, maxMag);
	const verdict = resonanceVerdict(resonance);
	const etasControl = (0, import_react.useMemo)(() => {
		const wh = etasWhitenResiduals(filteredEq(eq?.features, minMag, maxMag).map((f) => ({
			tMs: f.properties.time ?? 0,
			mag: f.properties.mag ?? minMag
		})).filter((e) => e.tMs > 0));
		const raw = {
			d_ij: resonance?.d_ij ?? null,
			separated: resonance?.separated ?? false
		};
		if (!wh.ok) return {
			...interpretEtasControl(raw, {
				d_ij: null,
				separated: false
			}, {
				forceInsufficient: true,
				reason: wh.reason,
				note: wh.note
			}),
			n: wh.nEvents,
			reason: wh.reason
		};
		const whiteScore = resonanceScore(wh.residualGaps, mode === "lite" ? 40 : 60);
		const white = {
			d_ij: whiteScore.d_ij,
			separated: whiteScore.separated
		};
		if (whiteScore.d_ij == null) return {
			...interpretEtasControl(raw, white, {
				forceInsufficient: true,
				reason: "probe-null",
				note: "Insufficient — whitened probe null after residual transform."
			}),
			n: wh.nEvents,
			reason: "probe-null",
			whiteScore
		};
		const reading = interpretEtasControl(raw, white);
		return {
			...reading,
			n: wh.nEvents,
			reason: reading.reason,
			whiteScore
		};
	}, [
		eq?.features,
		minMag,
		maxMag,
		resonance,
		mode
	]);
	const windowLabel = timeWindow === "hour" ? "past hour" : timeWindow === "day" ? "past day" : timeWindow === "week" ? "past week" : "past month";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-3xl space-y-3 p-3 sm:space-y-4 sm:p-4 md:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuptContinuumStrip, { compact: true }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-lg font-semibold text-accent sm:text-xl",
				children: "Catalog rhythm"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-xs text-muted sm:text-sm",
				children: [
					"Spacing of recent quakes in time — not a forecast. (SUPT ·",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XHandle, { profile: "sheppard" }),
					")"
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-lg border border-border bg-panel px-3 py-2 text-xs text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-0.5 font-semibold text-fg",
						children: "What this does"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"Compares gaps between quakes (",
						windowLabel,
						") to a shuffled “random” version of the same times."
					] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-xs text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mb-0.5 flex items-center gap-1 font-semibold text-danger",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, { className: "h-3.5 w-3.5 shrink-0" }), "Not a prediction"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Not magnitude/location forecast, ShakeMap, or EEW. Check USGS / local agencies for alerts." })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `rounded-xl border p-4 text-center sm:p-6 ${TONE_CLASS[verdict.tone]}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-[0.65rem] uppercase tracking-widest text-dim sm:text-[0.7rem]",
						children: ["Current window · ", windowLabel]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-lg font-semibold leading-snug text-fg sm:text-2xl",
						children: verdict.title
					}),
					resonance?.band && resonance.band !== "N/A" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-xs text-muted sm:text-sm",
						children: [bandPlainLabel(resonance.band), resonance.separated ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-dim",
							children: " · stronger than random"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-dim",
							children: " · within chance"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mx-auto mt-2 max-w-lg text-xs leading-relaxed text-muted sm:mt-3 sm:text-sm",
						children: reading || "Load live data to get a reading."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap items-center justify-center gap-2 sm:mt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => void refresh(true),
							className: "ww-btn min-h-10 text-[0.7rem]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `h-3.5 w-3.5 ${loading ? "animate-spin" : ""}` }), "Refresh"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setTab("live"),
							className: "ww-btn ww-btn--ghost min-h-10 text-[0.7rem]",
							children: "Live map"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "mx-auto mt-4 grid max-w-md grid-cols-3 gap-1.5 text-center text-[0.65rem] sm:mt-5 sm:gap-2 sm:text-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-md border border-border/80 bg-bg/50 px-1.5 py-1.5 sm:px-2 sm:py-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-dim",
									children: "Gaps used"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "mt-0.5 font-mono text-sm font-semibold text-fg",
									children: resonance?.n ?? "—"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-md border border-border/80 bg-bg/50 px-1.5 py-1.5 sm:px-2 sm:py-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-dim",
									children: "Vs random"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "mt-0.5 text-sm font-semibold text-fg",
									children: resonance == null ? "—" : resonance.separated ? "Unusual" : "Typical"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-md border border-border/80 bg-bg/50 px-1.5 py-1.5 sm:px-2 sm:py-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-dim",
									children: "Sample"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "mt-0.5 text-sm font-semibold text-fg",
									children: resonance?.short_window ? "Short" : "OK"
								})]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-1 text-xs font-medium uppercase tracking-wider text-primary",
						children: "Watch zones"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-2 text-[0.65rem] text-dim sm:mb-3 sm:text-xs",
						children: "Focus a zone to zoom the map. Independent of the rhythm score."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-2 text-sm",
						children: DRAGON_NODES.map((node) => {
							const st = nodeStatus(features, node);
							const stats = nodeEventStats(features, node);
							const active = focusNodeId === node.id;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex items-start gap-2 rounded-md border border-border/60 bg-bg/40 px-2 py-2 sm:px-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border ${STATUS_STYLE[st]}`,
									title: STATUS_PLAIN[st]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[0.85rem] font-medium text-fg sm:text-sm",
												children: node.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[0.65rem] text-dim",
												children: STATUS_PLAIN[st]
											})]
										}),
										stats.count > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-0.5 text-[0.65rem] text-muted",
											children: [
												stats.count,
												" eq · max M",
												stats.maxMag.toFixed(1)
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-1.5 flex flex-wrap gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => {
													setFocusNode(active ? null : node.id);
													setTab("live");
												},
												className: `inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-2 text-[0.72rem] font-medium ${active ? "border-primary/40 bg-primary/10 text-primary" : "text-muted hover:text-fg"}`,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crosshair, { className: "h-3 w-3" }), active ? "Clear" : "Focus map"]
											}), node.monitorUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
												href: node.monitorUrl,
												target: "_blank",
												rel: "noopener noreferrer",
												className: "inline-flex min-h-9 items-center gap-1 text-[0.72rem] font-medium text-gold hover:underline",
												children: ["Board", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3 w-3" })]
											})]
										})
									]
								})]
							}, node.id);
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setShowTech((v) => !v),
					className: "flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2.5 text-left sm:px-4 sm:py-3",
					"aria-expanded": showTech,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, { className: "h-3.5 w-3.5" }), "How it works"]
					}), showTech ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4 text-dim" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4 text-dim" })]
				}), showTech && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3 border-t border-border px-3 py-3 text-xs leading-relaxed text-muted sm:px-4 sm:text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							"Gaps between consecutive quakes feed a fixed probe from",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XPerson, { profile: "sheppard" }),
							" (SUPT, α = 0.01). Score d",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "ij" }),
							" is compared to shuffled copies. Far from shuffle (|z| ≥ 3) → unusual vs chance for this window."
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "overflow-x-auto rounded-md border border-border bg-bg/50 p-2.5 font-mono text-[0.65rem]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									"live d",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "ij" }),
									" =",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-fg",
										children: resonance?.d_ij != null ? resonance.d_ij.toFixed(4) : "—"
									}),
									" · ",
									"band = ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-fg",
										children: resonance?.band ?? "—"
									}),
									" · ",
									"z = ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-fg",
										children: resonance?.z ?? "—"
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1 text-dim",
									children: [
										"Band edges (operator): COHERENCE ",
										"(<1)",
										" · CLUTCH (1–2) · SUB-FLOOR (2–",
										SUPT_ANCHORS.zetaFloor,
										") · VACUUM (≥",
										SUPT_ANCHORS.zetaFloor,
										")"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1 text-[0.6rem] text-dim",
									children: [
										"Corpus anchors (context only — never fitted to this live d): ribosome ≈",
										" ",
										SUPT_ANCHORS.ribosome,
										" · tokamak ≈ ",
										SUPT_ANCHORS.tokamak,
										" · CLASH ≈",
										" ",
										SUPT_ANCHORS.clash,
										" · ζ floor = ",
										SUPT_ANCHORS.zetaFloor
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[0.65rem] text-dim",
							children: "“Normal scatter” is valid — no excess order in this sample, not “all clear.”"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setShowEtas((v) => !v),
							className: "flex min-h-9 w-full items-center gap-1 text-left text-xs font-medium text-primary",
							"aria-expanded": showEtas,
							children: [showEtas ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-3.5 w-3.5" }), "Aftershock models (ETAS)"]
						}),
						showEtas && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2 rounded-md border border-border/80 bg-bg/40 px-3 py-2 text-[0.7rem]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
									"Temporal whitening control (lite ETAS / Omori). Same frozen probe on residual gaps. Scope: time only. Method sheet from ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XHandle, { profile: "sheppard" }),
									"."
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-[0.62rem] text-dim",
									children: [
										"Omori control: c=",
										OMORI_CONTROL.cDay,
										"d · p=",
										OMORI_CONTROL.p,
										" · K=",
										OMORI_CONTROL.K,
										" · αₑ=",
										OMORI_CONTROL.alphaE,
										" · μ=",
										OMORI_CONTROL.muFraction,
										"×n/T (fixed; not MLE)."
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1 overflow-x-auto font-mono text-[0.65rem] text-muted",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-dim",
											children: "raw "
										}),
										"d =",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-fg",
											children: etasControl.rawD != null ? etasControl.rawD.toFixed(3) : "—"
										}),
										etasControl.rawSeparated != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-dim",
											children: [
												" ",
												"· ",
												etasControl.rawSeparated ? "separated" : "null"
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "ml-1 text-[0.58rem] text-dim",
											children: "← live headline (observed gaps)"
										})
									] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-dim",
											children: "white "
										}),
										"d =",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-fg",
											children: etasControl.whiteD != null ? etasControl.whiteD.toFixed(3) : "—"
										}),
										etasControl.whiteSeparated != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-dim",
											children: [
												" ",
												"· ",
												etasControl.whiteSeparated ? "separated" : "null"
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-dim",
											children: [" · n=", etasControl.n]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "ml-1 text-[0.58rem] text-dim",
											children: "← after Omori residual (diagnostic)"
										})
									] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-[0.68rem] leading-snug text-muted",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
											className: "text-fg",
											children: etasControl.verdict === "survives" ? "Survives" : etasControl.verdict === "vanishes" ? "Vanishes" : etasControl.verdict === "both-null" ? "Both null" : "Insufficient"
										}),
										etasControl.verdict === "insufficient" && etasControl.reason && etasControl.reason !== "none" ? ` (${etasControl.reason})` : "",
										" — ",
										etasControl.plain
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-[0.62rem] text-dim",
									children: [
										"Four outcomes: Survives · Vanishes · Both null ·",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
											className: "text-fg",
											children: "Insufficient"
										}),
										" (data guard — never promoted to Survives). Live headline uses ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
											className: "text-fg",
											children: "raw"
										}),
										" gaps; whitened is diagnostic only."
									]
								})
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuptMathSection, {
				compact: true,
				defaultOpen: false
			})
		]
	});
}
/**
* Analytics = charts AFTER live data/visuals tabs.
* Leads with shared SUPT continuum (same numbers as Solar / Rhythm), then time series.
*/
function AnalyticsCharts() {
	const kp = useObservatory((s) => s.kp);
	const xray = useObservatory((s) => s.xray);
	const dijHistory = useObservatory((s) => s.dijHistory);
	const eq = useObservatory((s) => s.eq);
	const minMag = useObservatory((s) => s.minMag);
	const maxMag = useObservatory((s) => s.maxMag);
	const mode = useObservatory((s) => s.mode);
	const setTab = useObservatory((s) => s.setTab);
	const kpData = kp.slice(-48).map((p) => ({
		t: p.time_tag?.slice(5, 16) ?? "",
		Kp: Number(p.Kp) || 0
	}));
	const xrayData = longChannelXrays(xray).slice(-90).map((p) => ({
		t: new Date(p.time_tag).toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit"
		}),
		flux: Math.log10(Math.max(p.flux || p.observed_flux || 1e-12, 1e-12))
	}));
	const dijData = dijHistory.map((p) => ({
		t: new Date(p.t).toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit"
		}),
		d_ij: p.d_ij,
		z: p.z
	}));
	const features = filteredEq(eq?.features, minMag, maxMag);
	const buckets = /* @__PURE__ */ new Map();
	for (const f of features) {
		if (!f.properties.time) continue;
		const d = new Date(f.properties.time);
		const key = `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, "0")}h`;
		buckets.set(key, (buckets.get(key) ?? 0) + 1);
	}
	const rateData = [...buckets.entries()].slice(-24).map(([t, count]) => ({
		t,
		count
	}));
	const tipStyle = {
		background: "#0f172a",
		border: "1px solid #334155",
		borderRadius: 8,
		fontSize: 12
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-5xl space-y-4 p-3 sm:space-y-5 sm:p-4 md:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold text-primary sm:text-xl",
					children: "Charts & continuum"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs text-muted sm:text-sm",
					children: "After Map · Solar · Rhythm — shared SUPT read first, then time series. Same probe, same vocabulary."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex flex-wrap gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "ww-btn min-h-9 text-[0.68rem]",
							onClick: () => setTab("live"),
							children: "Map"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "ww-btn min-h-9 text-[0.68rem]",
							onClick: () => setTab("solar"),
							children: "Solar"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "ww-btn min-h-9 text-[0.68rem]",
							onClick: () => setTab("resonance"),
							children: "Rhythm"
						})
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuptContinuumStrip, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecommendationsPanel, {}),
			mode === "lite" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted",
				children: "Detailed charts off in Lite. Continuum above still updates. Switch to Standard or Full for Kp / X-ray / rate plots."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[0.7rem] font-medium uppercase tracking-wider text-dim",
				children: "Time series (supporting visuals)"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCard, {
						title: "Planetary K-index",
						hint: "Geomagnetic · SWPC",
						children: kpData.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: 180,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
								data: kpData,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
										stroke: "#1e293b",
										strokeDasharray: "3 3"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
										dataKey: "t",
										tick: {
											fill: "#64748b",
											fontSize: 10
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
										domain: [0, 9],
										tick: {
											fill: "#64748b",
											fontSize: 10
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { contentStyle: tipStyle }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
										y: 5,
										stroke: "#f43f5e",
										strokeDasharray: "4 4"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
										type: "monotone",
										dataKey: "Kp",
										stroke: "#22d3ee",
										fill: "#22d3ee33",
										strokeWidth: 2
									})
								]
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCard, {
						title: "GOES X-ray (log₁₀)",
						hint: "Long channel · flare context",
						children: xrayData.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: 180,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
								data: xrayData,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
										stroke: "#1e293b",
										strokeDasharray: "3 3"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
										dataKey: "t",
										tick: {
											fill: "#64748b",
											fontSize: 10
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, { tick: {
										fill: "#64748b",
										fontSize: 10
									} }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { contentStyle: tipStyle }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
										y: -5,
										stroke: "#fb923c",
										strokeDasharray: "4 4",
										label: {
											value: "M",
											fill: "#fb923c",
											fontSize: 10
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
										type: "monotone",
										dataKey: "flux",
										stroke: "#a78bfa",
										strokeWidth: 2,
										dot: false
									})
								]
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCard, {
						title: "Quake rate (hourly)",
						hint: "Filtered catalog",
						children: rateData.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: 180,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
								data: rateData,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
										stroke: "#1e293b",
										strokeDasharray: "3 3"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
										dataKey: "t",
										tick: {
											fill: "#64748b",
											fontSize: 10
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
										allowDecimals: false,
										tick: {
											fill: "#64748b",
											fontSize: 10
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { contentStyle: tipStyle }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
										type: "monotone",
										dataKey: "count",
										stroke: "#34d399",
										fill: "#34d39933",
										strokeWidth: 2
									})
								]
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCard, {
						title: "Rolling seismic dᵢⱼ",
						hint: "Live address · band edges + ζ line are context, not fitted targets",
						children: dijData.filter((d) => d.d_ij != null).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { msg: "History builds as the probe runs on each refresh." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: 180,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
								data: dijData,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
										stroke: "#1e293b",
										strokeDasharray: "3 3"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
										dataKey: "t",
										tick: {
											fill: "#64748b",
											fontSize: 10
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, { tick: {
										fill: "#64748b",
										fontSize: 10
									} }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { contentStyle: tipStyle }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
										y: SUPT_ANCHORS.zetaFloor,
										stroke: "#64748b",
										strokeDasharray: "4 4",
										label: {
											value: "ζ floor (context only)",
											position: "insideTopRight",
											fill: "#64748b",
											fontSize: 10
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
										y: 1,
										stroke: "#22d3ee",
										strokeDasharray: "2 4"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
										y: 2,
										stroke: "#a78bfa",
										strokeDasharray: "2 4"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
										type: "monotone",
										dataKey: "d_ij",
										stroke: "#fbbf24",
										strokeWidth: 2,
										connectNulls: true,
										dot: true
									})
								]
							})
						})
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[0.65rem] leading-relaxed text-dim",
				children: "Charts support the continuum — they do not replace SWPC or USGS. SUPT timing structure is independent of R/S/G scales and magnitude filters."
			})
		]
	});
}
function ChartCard({ title, hint, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-2 flex flex-wrap items-baseline justify-between gap-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-xs font-medium uppercase tracking-wider text-primary",
				children: title
			}), hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-[0.62rem] text-dim",
				children: hint
			})]
		}), children]
	});
}
function Empty({ msg = "No data yet — waiting for feed." }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-8 text-center text-sm text-dim",
		children: msg
	});
}
var PERF_TIPS = [
	{
		id: "instancing",
		title: "WebGL instancing techniques",
		body: "Unit-quad + per-instance center/size/mag via WebGL2 or ANGLE_instanced_arrays; POINTS fallback; 800-cap; rAF upload.",
		snippet: `// WebGL instancing for heat blobs
// Base mesh: 1 unit quad (6 verts). Per instance: center, size, mag-t.
// Prefer WebGL2 drawArraysInstanced; else ANGLE_instanced_arrays; else gl.POINTS.

// Per-instance buffer layout (stride 4 floats):
// [x_px, y_px, size_px, t] * N   // t = (mag-3)/4 clamped

attribute vec2  a_corner; // divisor 0 — unit quad
attribute vec2  a_pos;    // divisor 1
attribute float a_size;   // divisor 1
attribute float a_t;      // divisor 1

// WebGL2:
vertexAttribDivisor(locPos, 1);
drawArraysInstanced(TRIANGLES, 0, 6, instanceCount);

// WebGL1:
const ext = gl.getExtension('ANGLE_instanced_arrays');
ext.vertexAttribDivisorANGLE(locPos, 1);
ext.drawArraysInstancedANGLE(TRIANGLES, 0, 6, instanceCount);

// Why quads > gl.POINTS when available?
// - No ALIASED_POINT_SIZE_RANGE clamp (mobile often caps ~64–256px)
// - Same soft disc in fragment via v_local (no gl_PointCoord)
// Cap N≈800 strongest mags; rAF-coalesce; one DYNAMIC_DRAW upload/frame
`
	},
	{
		id: "webgpu",
		title: "WebGPU for future maps",
		body: "Probe-only today. Keep Leaflet basemap; optional WebGPU heat/compute later in Full mode — not a full basemap rewrite yet.",
		snippet: `// WebGPU — investigate for future maps (not shipping in Sentinel yet)
// Why later: Leaflet tiles/SVG/canvas path still DOM-centric; WebGPU wins when
// you own the full frame (custom globe, dense particle fields, compute).

async function probeWebGPU() {
  if (!navigator.gpu) return null;
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'high-performance',
  });
  if (!adapter) return null;
  const device = await adapter.requestDevice();
  // Heat path sketch: storage buffer of {lat,lon,mag} → compute pass projects
  // to screen → render pass instanced quads (same math as WebGL2).
  // Keep Leaflet for basemap tiles until a full custom basemap exists.
  return { adapter, device };
}

// Recommended timeline for WolfWatch:
// 1) Keep Leaflet 1.9.x + WebGL2 heat (now)
// 2) Optional WebGPU heat behind feature detect (Full mode)
// 3) Only then consider WebGPU basemap / 3D earth replacement
`
	},
	{
		id: "leaflet",
		title: "Leaflet version details",
		body: "Shipping leaflet@1.9.4 with preferCanvas, L.canvas renderer, idle tiles. Stay on 1.9.x for ecosystem stability.",
		snippet: `// Stack (shipping)
// leaflet@1.9.4  (package.json: "^1.9.4", resolved 1.9.4)
// three@0.185.x  (Full-mode globe only, lazy)

import L from 'leaflet'; // 1.9.4

const map = L.map(el, {
  preferCanvas: true,       // 1.x: paths use Canvas when true
  fadeAnimation: false,
  markerZoomAnimation: false,
});

// 1.9.x Canvas renderer for dense circleMarkers
const canvasRenderer = L.canvas({ padding: 0.5 });

L.tileLayer(url, {
  updateWhenIdle: true,     // stable since 1.0+
  updateWhenZooming: false,
  keepBuffer: 2,
}).addTo(map);

L.circleMarker(ll, { renderer: canvasRenderer, radius: 6 });

// Note: Leaflet 2.x is still evolving; stay on 1.9.4 for Vercel SSR +
// plugin ecosystem (no Mapbox token required for our free basemaps).
`
	}
];
var LEAFLET_VERSION = "1.9.4";
function probeGpu() {
	const notes = [];
	let webgl = false;
	let webgl2 = false;
	let instancing = false;
	let maxPointSize = null;
	if (typeof document === "undefined") return {
		webgl: false,
		webgl2: false,
		instancing: false,
		maxPointSize: null,
		webgpu: false,
		leafletVersion: LEAFLET_VERSION,
		notes: ["SSR / non-browser"]
	};
	try {
		const c = document.createElement("canvas");
		const gl2 = c.getContext("webgl2");
		if (gl2) {
			webgl2 = true;
			webgl = true;
			instancing = true;
			maxPointSize = gl2.getParameter(gl2.ALIASED_POINT_SIZE_RANGE)?.[1] ?? null;
			notes.push("WebGL2: native instancing (drawArraysInstanced)");
		} else {
			const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
			if (gl) {
				webgl = true;
				const ext = gl.getExtension("ANGLE_instanced_arrays");
				instancing = !!ext;
				maxPointSize = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)?.[1] ?? null;
				notes.push(ext ? "WebGL1 + ANGLE_instanced_arrays" : "WebGL1 points path (no instancing ext)");
			}
		}
	} catch {
		notes.push("WebGL probe failed");
	}
	const webgpu = typeof navigator !== "undefined" && "gpu" in navigator && !!navigator.gpu;
	if (webgpu) notes.push("WebGPU present — future path only (not used for live map yet)");
	else notes.push("WebGPU not available in this browser");
	notes.push(`Leaflet ${LEAFLET_VERSION}: preferCanvas + L.canvas renderer, idle tiles, WebGL heat overlay`);
	return {
		webgl,
		webgl2,
		instancing,
		maxPointSize,
		webgpu,
		leafletVersion: LEAFLET_VERSION,
		notes
	};
}
/**
* MORVEL / NNR-MORVEL56 notes + Euler-pole calculator helpers.
* Educational layer for Sentinel — not a substitute for published tables.
*
* Primary refs:
* - DeMets, Gordon & Argus (2010) Geochem. Geophys. Geosyst. — MORVEL
* - Argus, Gordon & DeMets (2011) G³ — NNR-MORVEL56 no-net-rotation frame
* - Bird (2003) G³ — PB2002 plate polygons/boundaries used on the map
*/
var MORVEL_NOTES = {
	title: "MORVEL plate motion model",
	oneLiner: "MORVEL is a digital set of angular velocities describing how tectonic plates move relative to each other; NNR-MORVEL56 places that motion in a no-net-rotation mantle frame.",
	points: [
		"MORVEL estimates relative plate motions from mid-ocean ridge spreading rates, transform azimuths, and earthquake slip vectors.",
		"NNR-MORVEL56 adds a no-net-rotation constraint so each plate gets an absolute Euler pole (lat, lon, ω) in a global frame.",
		"Surface velocity at any point is v = ω × r — the cross product of the plate’s angular-velocity vector with the position vector.",
		"Relative motion across a boundary is v_A − v_B at that location (what our map arrows show).",
		"Sentinel ships rounded poles for viz; for research use the official MORVEL / NNR-MORVEL56 tables."
	],
	citations: [
		{
			label: "MORVEL (DeMets et al. 2010)",
			url: "https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2009GC002892"
		},
		{
			label: "NNR-MORVEL56 (Argus et al. 2011)",
			url: "https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2011GC003751"
		},
		{
			label: "PB2002 plates (Bird 2003)",
			url: "https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2001GC000252"
		}
	]
};
var EULER_CALC_NOTES = {
	title: "Euler pole calculations",
	formula: [
		"ω⃗ = ω · [cos φ_p cos λ_p, cos φ_p sin λ_p, sin φ_p]  (rad / Myr)",
		"r̂ = [cos φ cos λ, cos φ sin λ, sin φ]",
		"v⃗ ∝ ω⃗ × r̂   →   east & north components at the surface",
		"speed (mm/yr) ≈ |ω⃗ × r̂| · R_earth(km)   (numerically km/Myr ≡ mm/yr)",
		"bearing = atan2(v_east, v_north)  (degrees clockwise from north)"
	],
	steps: [
		"1. Look up the plate’s Euler pole (φ_p, λ_p, ω) in the NNR frame.",
		"2. Convert pole + site to unit vectors / angular-velocity vector.",
		"3. Cross product → local east/north velocity.",
		"4. For boundaries, subtract plate B from plate A at the same site.",
		"5. Compare the relative vector to the boundary tangent → convergent / divergent / transform."
	]
};
/** Major plates with short labels for UI tables */
var MAJOR_PLATES = [
	{
		code: "PA",
		name: "Pacific"
	},
	{
		code: "NA",
		name: "North America"
	},
	{
		code: "SA",
		name: "South America"
	},
	{
		code: "EU",
		name: "Eurasia"
	},
	{
		code: "AF",
		name: "Africa"
	},
	{
		code: "AU",
		name: "Australia"
	},
	{
		code: "AN",
		name: "Antarctica"
	},
	{
		code: "IN",
		name: "India"
	},
	{
		code: "AR",
		name: "Arabia"
	},
	{
		code: "NZ",
		name: "Nazca"
	},
	{
		code: "CO",
		name: "Cocos"
	},
	{
		code: "PS",
		name: "Philippine Sea"
	},
	{
		code: "SO",
		name: "Somalia"
	},
	{
		code: "CA",
		name: "Caribbean"
	},
	{
		code: "JF",
		name: "Juan de Fuca"
	},
	{
		code: "SC",
		name: "Scotia"
	}
];
function listKnownPoles() {
	const nameOf = Object.fromEntries(MAJOR_PLATES.map((p) => [p.code, p.name]));
	return Object.entries(EULER_POLES).filter(([code]) => nameOf[code]).map(([code, pole]) => ({
		code,
		name: nameOf[code] || code,
		pole
	})).sort((a, b) => a.name.localeCompare(b.name));
}
/** Pacific absolute motion near Tonga trench (demo point). */
function tongaPacificDemo() {
	const lat = -25.5;
	const lon = -176;
	return {
		lat,
		lon,
		v: plateVelocity("PA", lat, lon)
	};
}
var SWPC_BASE = "https://services.swpc.noaa.gov";
var SWPC_ENDPOINTS = [
	{
		id: "kp",
		path: "/products/noaa-planetary-k-index.json",
		role: "Planetary K-index time series",
		usedInApp: true
	},
	{
		id: "scales",
		path: "/products/noaa-scales.json",
		role: "R / S / G scales now + day forecasts",
		usedInApp: true
	},
	{
		id: "sw-speed",
		path: "/products/summary/solar-wind-speed.json",
		role: "L1 solar wind speed summary",
		usedInApp: true
	},
	{
		id: "sw-mag",
		path: "/products/summary/solar-wind-mag-field.json",
		role: "L1 Bz / Bt summary",
		usedInApp: true
	},
	{
		id: "xrays",
		path: "/json/goes/primary/xrays-1-day.json",
		role: "GOES X-ray flux (1 day)",
		usedInApp: true,
		heavy: true
	},
	{
		id: "protons",
		path: "/json/goes/primary/integral-protons-1-day.json",
		role: "GOES integral protons",
		usedInApp: true,
		heavy: true
	},
	{
		id: "10cm",
		path: "/products/summary/10cm-flux.json",
		role: "10.7 cm radio flux",
		usedInApp: true
	},
	{
		id: "alerts",
		path: "/products/alerts.json",
		role: "SWPC watches / warnings text",
		usedInApp: true
	},
	{
		id: "3day",
		path: "/text/3-day-forecast.txt",
		role: "Official 3-day forecast text",
		usedInApp: true
	},
	{
		id: "discussion",
		path: "/text/discussion.txt",
		role: "Forecast discussion",
		usedInApp: true
	},
	{
		id: "enlil",
		path: "/products/animations/enlil.json",
		role: "WSA-ENLIL frame list",
		usedInApp: true,
		heavy: true
	},
	{
		id: "ovation",
		path: "/products/animations/ovation_north_24h.json",
		role: "OVATION aurora frames (north)",
		usedInApp: true,
		heavy: true
	},
	{
		id: "rtsw-mag",
		path: "/json/rtsw/rtsw_mag_1m.json",
		role: "High-cadence RTSW magnetometer (large)",
		usedInApp: false,
		heavy: true
	},
	{
		id: "rtsw-wind",
		path: "/json/rtsw/rtsw_wind_1m.json",
		role: "High-cadence RTSW plasma (large)",
		usedInApp: false,
		heavy: true
	},
	{
		id: "kp-forecast",
		path: "/products/noaa-planetary-k-index-forecast.json",
		role: "Kp forecast product",
		usedInApp: true
	}
];
/** Copyable snippets — keep in sync with sw.js / lru.ts / httpCache.ts / cacheQuota.ts */
var CACHE_SNIPPETS = {
	localCacheCore: `// localStorage feed cache (short TTL) — separate from Cache Storage
export function getCache<T>(key: string, maxAgeMs = 4 * 60_000): T | null {
  const raw = localStorage.getItem("ww_" + key);
  if (!raw) return null;
  const { ts, data } = JSON.parse(raw);
  if (Date.now() - ts < maxAgeMs) return data;
  localStorage.removeItem("ww_" + key);
  return null;
}`,
	history: `// pushHistory — cap + 30s d_ij dedupe (mobile 24 / desktop 48)`,
	serviceWorkerPolicy: `// SW v6: ww-shell-v6 · ww-runtime-v6
// Eviction: soft 48 · pressure 24 · prefer stale mutable · never live APIs
// HTTP: honor no-store / no-cache / immutable / max-age / SWR / ETag`,
	swInstallHandler: `// install parallel PRECACHE + skipWaiting; activate drops legacy caches`,
	swLruEviction: `// True LRU + secondary prefer-evict stale mutable
function pickEvictionVictims({ orderOldestFirst, overBy, isImmutable, ageMs }) {
  const scored = orderOldestFirst.map((url, idx) => {
    const imm = isImmutable?.(url) ?? false;
    const staleMutable = !imm && (ageMs?.(url) ?? 0) > 7 * 864e5;
    return { url, score: idx + (staleMutable ? -0.5 : 0) + (imm ? 1000 : 0) };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, overBy).map((s) => s.url);
}
// QuotaExceededError → hardTrim(24)
// npm run test:lru`,
	swPerf: `// in-memory LRU · debounced meta · classed SWR · live early-return`,
	swrInvalidation: `// Classed SWR (v6)
// immutable-hash → cache-first, no revalidate
// shell → network-first
// mutable-static → SWR + If-None-Match; honor max-age / no-cache
// bypass-live → never intercept`,
	cacheQuota: `// navigator.storage.estimate() — origin usage/quota
// WolfWatch keeps Cache Storage tiny; live JSON never stored`,
	httpCacheControl: `// HTTP Cache-Control (src/lib/sw/httpCache.ts)
parseCacheControl("max-age=3600, stale-while-revalidate=600, immutable")
// → { maxAge: 3600, staleWhileRevalidate: 600, immutable: true }

decideStore({ cacheControl, status, contentHashed })
// no-store → mayStore false
// no-cache / must-revalidate → revalidateBeforeServe true
// immutable || contentHashed → preferImmutable true

// SW putRuntime: if (!mayStoreResponse(res)) return
// SW fetch mutable: if (no-cache && !fresh) await revalidateConditional`,
	evictionPolicy: `// Cache Storage eviction policy (EVICTION_POLICY)
maxRuntimeEntries: 48       // soft cap
pressureTargetEntries: 24   // TRIM / QuotaExceeded
mutableMaxAgeMs: 7d         // secondary eviction preference
shellPrecacheOnly: true     // shell never unbounded
neverHosts: swpc, usgs, donki, sdo, soho, helioviewer
// Primary order: LRU. Secondary: stale mutable before immutable-hash.`,
	shortcutsImpl: `// Manifest shortcuts → ?tab= → syncTabToUrl`,
	solarCoreHeavy: `// Lite: heavy:false skips X-ray / protons / ENLIL / OVATION`
};
var MANIFEST_FIELD_NOTES = [
	{
		field: "id",
		value: "/",
		why: "Stable identity for install updates (not tied to query strings)."
	},
	{
		field: "name / short_name",
		value: "Sol-Earth WolfWatch Sentinel / WolfWatch",
		why: "Home-screen label (short_name under ~12 chars preferred)."
	},
	{
		field: "start_url",
		value: "/?source=pwa",
		why: "Launch into app; source=pwa for analytics-free install attribution."
	},
	{
		field: "scope",
		value: "/",
		why: "All same-origin routes stay in the PWA window."
	},
	{
		field: "display",
		value: "standalone",
		why: "Chrome-less shell on install; display_override allows browser fallback."
	},
	{
		field: "theme_color / background_color",
		value: "#14b8a6 / #0b0b0f",
		why: "Matches status bar + splash with the dark observatory UI."
	},
	{
		field: "icons",
		value: "favicon.svg (any + maskable) · og.png",
		why: "SVG any-size for modern installers; PNG for legacy / rich install UI."
	},
	{
		field: "shortcuts",
		value: "Live Map · Solar",
		why: "Long-press app icon → jump to primary tabs without re-nav."
	},
	{
		field: "launch_handler.client_mode",
		value: "navigate-existing",
		why: "Re-use open PWA window when possible (less multi-instance clutter)."
	},
	{
		field: "categories",
		value: "education, news, utilities, weather",
		why: "Store / install surfaces classification (not App Store)."
	}
];
var TAB_IDS = [
	"live",
	"solar",
	"resonance",
	"analytics",
	"about"
];
var APP_SHORTCUTS = [
	{
		name: "Live Map",
		short_name: "Map",
		description: "Seismic live map + nodes",
		tab: "live",
		url: "/?tab=live&source=pwa-shortcut"
	},
	{
		name: "Solar Observatory",
		short_name: "Solar",
		description: "Space weather command center",
		tab: "solar",
		url: "/?tab=solar&source=pwa-shortcut"
	},
	{
		name: "Catalog Rhythm",
		short_name: "Rhythm",
		description: "SUPT seismic timing read",
		tab: "resonance",
		url: "/?tab=resonance&source=pwa-shortcut"
	},
	{
		name: "Charts",
		short_name: "Charts",
		description: "Supporting time series",
		tab: "analytics",
		url: "/?tab=analytics&source=pwa-shortcut"
	}
];
function parseTabParam(raw) {
	if (!raw) return null;
	const t = raw.toLowerCase();
	if (t === "map") return "live";
	if (t === "rhythm") return "resonance";
	if (t === "charts") return "analytics";
	if (TAB_IDS.includes(t)) return t;
	return null;
}
/** Read tab from location search (and optional hash #solar). */
function tabFromLocation(loc) {
	if (typeof window === "undefined" && !loc) return null;
	const L = loc ?? window.location;
	try {
		const fromQ = parseTabParam(new URLSearchParams(L.search).get("tab"));
		if (fromQ) return fromQ;
		return parseTabParam((L.hash || "").replace(/^#/, ""));
	} catch {
		return null;
	}
}
/** Keep ?tab= in the address bar without reload (PWA + share links). */
function syncTabToUrl(tab) {
	if (typeof window === "undefined") return;
	try {
		const url = new URL(window.location.href);
		if (url.searchParams.get("tab") === tab) return;
		url.searchParams.set("tab", tab);
		url.searchParams.delete("source");
		window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
	} catch {}
}
function formatBytes(n) {
	if (n == null || !Number.isFinite(n)) return "—";
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
	return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
async function probeCacheQuota() {
	if (typeof navigator === "undefined" || !("storage" in navigator)) return {
		supported: false,
		usage: null,
		quota: null,
		usageDetails: null,
		persisted: null,
		cacheNames: [],
		approxCacheEntries: 0,
		note: "StorageManager not available in this environment."
	};
	let usage = null;
	let quota = null;
	let usageDetails = null;
	let persisted = null;
	try {
		const est = await navigator.storage.estimate();
		usage = est.usage ?? null;
		quota = est.quota ?? null;
		const details = est.usageDetails;
		if (details) usageDetails = details;
	} catch {}
	try {
		if (navigator.storage.persisted) persisted = await navigator.storage.persisted();
	} catch {
		persisted = null;
	}
	let cacheNames = [];
	let approxCacheEntries = 0;
	try {
		if ("caches" in globalThis) {
			cacheNames = (await caches.keys()).filter((k) => k.startsWith("ww-shell") || k.startsWith("ww-runtime"));
			for (const name of cacheNames) {
				const keys = await (await caches.open(name)).keys();
				approxCacheEntries += keys.length;
			}
		}
	} catch {}
	const pctStr = usage != null && quota != null && quota > 0 ? ` · ${(100 * usage / quota).toFixed(1)}% of estimate quota` : "";
	return {
		supported: true,
		usage,
		quota,
		usageDetails,
		persisted,
		cacheNames,
		approxCacheEntries,
		note: `Origin storage ~${formatBytes(usage)} / ${formatBytes(quota)}${pctStr}. WolfWatch caches: ${cacheNames.join(", ") || "none"} (${approxCacheEntries} entries). Live feeds never use Cache Storage.`
	};
}
function classifyAssetUrl(pathname) {
	if (pathname.startsWith("/_server") || pathname.includes("DONKI")) return "bypass-live";
	if (/\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(js|css|woff2?)$/i.test(pathname)) return "immutable-hash";
	if (pathname === "/" || pathname.endsWith(".html") || pathname.endsWith("manifest.webmanifest")) return "shell";
	if (/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ico)$/i.test(pathname)) return "mutable-static";
	return "mutable-static";
}
function swrStrategyFor(kind) {
	switch (kind) {
		case "immutable-hash": return {
			kind,
			serveCacheFirst: true,
			revalidateInBackground: false,
			conditional: false,
			skipRevalidate: true,
			note: "Content-hashed URL change = new key; old key LRU-evicted. No revalidate needed."
		};
		case "shell": return {
			kind,
			serveCacheFirst: false,
			revalidateInBackground: false,
			conditional: true,
			skipRevalidate: false,
			note: "Network-first; shell snapshot is fallback only. Conditional GET when possible."
		};
		case "mutable-static": return {
			kind,
			serveCacheFirst: true,
			revalidateInBackground: true,
			conditional: true,
			skipRevalidate: false,
			note: "SWR: serve cache, revalidate with If-None-Match when ETag known."
		};
		case "bypass-live": return {
			kind,
			serveCacheFirst: false,
			revalidateInBackground: false,
			conditional: false,
			skipRevalidate: true,
			note: "Never cache live space-weather / seismic JSON."
		};
	}
}
function CacheAndSwpcDocs() {
	const [sw, setSw] = (0, import_react.useState)("idle");
	const [swErr, setSwErr] = (0, import_react.useState)(null);
	const [quotaSnap, setQuotaSnap] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		registerShellServiceWorker().then((r) => {
			setSw(r.status);
			setSwErr(r.error ?? null);
		});
		probeCacheQuota().then(setQuotaSnap);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HardDrive, { className: "h-4 w-4" }), "Service worker (shell)"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mb-2 text-[0.72rem] leading-relaxed text-muted",
						children: [
							"Shell SW v6 — true LRU + classed SWR + Cache-Control + eviction policies. Precaches shell only. ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Never"
							}),
							" caches live SWPC / USGS / DONKI JSON — stale storm data is worse than offline. Status:",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-fg",
								children: sw
							}),
							swErr && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-warn",
								children: [" · ", swErr]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "ww-btn min-h-9 text-[0.68rem]",
								onClick: () => void registerShellServiceWorker({ allowDev: true }).then((r) => {
									setSw(r.status);
									setSwErr(r.error ?? null);
								}),
								children: "Register / update SW"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "ww-btn min-h-9 text-[0.68rem]",
								onClick: () => void unregisterShellServiceWorker().then(() => {
									setSw("skipped");
									setSwErr(null);
								}),
								children: "Unregister SW"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "ww-btn min-h-9 text-[0.68rem]",
								onClick: () => {
									navigator.serviceWorker?.controller?.postMessage({ type: "TRIM" });
								},
								children: "TRIM runtime cache"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "ww-btn min-h-9 text-[0.68rem]",
								onClick: () => {
									navigator.serviceWorker?.controller?.postMessage({ type: "FLUSH_LRU" });
								},
								children: "Flush LRU meta"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						title: "install + activate handlers",
						code: CACHE_SNIPPETS.swInstallHandler
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						title: "True LRU (Map + debounce)",
						code: CACHE_SNIPPETS.swLruEviction
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						title: "SW performance tactics",
						code: CACHE_SNIPPETS.swPerf
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						title: "SW policy summary",
						code: CACHE_SNIPPETS.serviceWorkerPolicy
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { className: "h-4 w-4" }), "Cache eviction strategies"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mb-2 list-disc space-y-1.5 pl-4 text-[0.72rem] leading-relaxed text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: "True LRU (runtime, max 48)"
								}),
								" — in-memory",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "text-primary",
									children: "Map"
								}),
								" (insertion order = LRU→MRU); delete+set moves to MRU. Overflow deletes oldest key. Meta flushed debounced (800 ms) to",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "text-primary",
									children: "/__ww_lru_meta__"
								}),
								". Static assets use SWR (cache-first + background revalidate)."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: "Versioned FIFO"
								}),
								" — bump",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "text-primary",
									children: "ww-shell-vN"
								}),
								" /",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "text-primary",
									children: "ww-runtime-vN"
								}),
								"; activate hard-deletes unknown names."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Not LFU"
							}), " — least-frequently-used needs hit counters and cold-start thrash; worse for hashed immutable assets."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Not TTL on assets"
							}), " — content-hashed files are immutable; shell uses network-first instead of time expiry."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Bypass list"
							}), " — SWPC/USGS/DONKI/SDO never enter Cache Storage (stale storm data is unsafe)."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "localStorage soft limit"
							}), " — separate layer (~1.2 MB mobile / ~3.5 MB desktop) with age prune on feed keys."] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						title: "True LRU + algorithm notes",
						code: CACHE_SNIPPETS.swLruEviction
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-1 text-sm font-semibold text-primary",
						children: "SWR invalidation strategies"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-2 text-[0.72rem] text-muted",
						children: "Stale-while-revalidate is not one policy — WolfWatch picks by URL class (SW v6)."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mb-2 space-y-1.5 text-[0.72rem] text-muted",
						children: [
							"/assets/app-Ab12Cd.js",
							"/",
							"/favicon.svg",
							"/_server/fn"
						].map((path) => {
							const kind = classifyAssetUrl(path);
							const s = swrStrategyFor(kind);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "rounded-md border border-border/70 bg-bg/40 px-2.5 py-1.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-[0.65rem] text-primary",
										children: path
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-2 text-fg",
										children: kind
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[0.65rem] text-dim",
										children: s.note
									})
								]
							}, path);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						title: "SWR strategy matrix",
						code: CACHE_SNIPPETS.swrInvalidation
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-1 text-sm font-semibold text-primary",
						children: "HTTP Cache-Control"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-2 text-[0.72rem] text-muted",
						children: "SW honors response headers when deciding store vs revalidate (RFC 9111 subset)."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mb-2 list-disc space-y-1 pl-4 text-[0.72rem] text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "text-primary",
								children: "no-store"
							}), " — never write to Cache Storage"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "text-primary",
									children: "no-cache"
								}),
								" /",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "text-primary",
									children: "must-revalidate"
								}),
								" — revalidate before trust"
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "text-primary",
								children: "immutable"
							}), " / content-hash — cache-first, no revalidate"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "text-primary",
									children: "max-age"
								}),
								" +",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "text-primary",
									children: "stale-while-revalidate"
								}),
								" — freshness windows"
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "text-primary",
									children: "ETag"
								}),
								" — conditional",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "text-primary",
									children: "If-None-Match"
								}),
								" (304 keeps body)"
							] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						title: "parseCacheControl + decideStore",
						code: CACHE_SNIPPETS.httpCacheControl
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-1 text-sm font-semibold text-primary",
						children: "Cache Storage eviction policies"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mb-2 list-disc space-y-1.5 pl-4 text-[0.72rem] text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Soft cap 48"
							}), " — runtime entries; LRU primary"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Pressure 24"
							}), " — TRIM / QuotaExceededError hard trim"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Prefer victims"
							}), " — stale mutable (over 7d) before content-hashed immutables"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Shell precache-only"
							}), " — single '/' snapshot + icons/manifest"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Never hosts"
							}), " — SWPC, USGS, DONKI, SDO, SOHO, Helioviewer"] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						title: "EVICTION_POLICY",
						code: CACHE_SNIPPETS.evictionPolicy
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-1 text-sm font-semibold text-primary",
						children: "Cache Storage quotas"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mb-2 text-[0.72rem] text-muted",
						children: [
							"Browser origin quota via ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "text-primary",
								children: "navigator.storage.estimate()"
							}),
							". Live space-weather JSON is never stored in Cache Storage."
						]
					}),
					quotaSnap ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-2 space-y-1 rounded-md border border-border/70 bg-bg/40 px-2.5 py-2 text-[0.72rem] text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								"Usage ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: formatBytes(quotaSnap.usage)
								}),
								" / ",
								"quota ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: formatBytes(quotaSnap.quota)
								}),
								quotaSnap.persisted != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-dim",
									children: [" · persisted=", String(quotaSnap.persisted)]
								})
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[0.65rem] text-dim",
								children: quotaSnap.note
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "ww-btn min-h-8 text-[0.65rem]",
								onClick: () => void probeCacheQuota().then(setQuotaSnap),
								children: "Refresh estimate"
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[0.72rem] text-dim",
						children: "Probing storage…"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						title: "Quota probe notes",
						code: CACHE_SNIPPETS.cacheQuota
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-1 text-sm font-semibold text-primary",
						children: "LRU unit tests"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-2 text-[0.72rem] text-muted",
						children: "Pure Map-order LRU + URL classifier — no browser required."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "mb-2 overflow-x-auto rounded-md border border-border bg-[#0a0c10] p-2.5 font-mono text-[0.65rem] text-[#c8d0e0]",
						children: `npm run test:lru
# → node scripts/lru-unit-test.mjs  (20 assertions)`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						title: "TrueLru.touch example",
						code: CACHE_SNIPPETS.swLruEviction
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary",
						children: "Web App shortcuts"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mb-2 text-[0.72rem] text-muted",
						children: [
							"Long-press the installed icon (Android / supported desktop) for jump targets. Each shortcut opens ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "text-primary",
								children: "?tab=…"
							}),
							"; the app syncs the address bar when you change tabs so links stay shareable."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mb-2 space-y-1.5",
						children: APP_SHORTCUTS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-bg/40 px-2.5 py-1.5 text-[0.72rem]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: s.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-dim",
								children: [" — ", s.description]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: s.url,
								className: "font-mono text-[0.62rem] text-primary hover:underline",
								children: s.url
							})]
						}, s.tab))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						title: "Shortcuts implementation",
						code: CACHE_SNIPPETS.shortcutsImpl
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "h-4 w-4" }), "Web App Manifest"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mb-2 text-[0.72rem] text-muted",
						children: [
							"Served at",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: "text-primary hover:underline",
								href: "/manifest.webmanifest",
								target: "_blank",
								rel: "noopener noreferrer",
								children: "/manifest.webmanifest"
							}),
							". Installable shell; live data still needs network."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "scroll-thin max-h-56 space-y-2 overflow-y-auto",
						children: MANIFEST_FIELD_NOTES.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-md border border-border/70 bg-bg/40 px-2.5 py-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-mono text-[0.65rem] text-primary",
									children: n.field
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[0.68rem] font-medium text-fg",
									children: n.value
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-0.5 text-[0.65rem] text-dim",
									children: n.why
								})
							]
						}, n.field))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary",
						children: "localStorage cache"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mb-2 text-[0.72rem] text-muted",
						children: [
							"Versioned ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "text-primary",
								children: "ww_*"
							}),
							" keys, soft size prune, mobile-tighter history (24 vs 48). Feed JSON is short-TTL; prefs use",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "text-primary",
								children: "wolfwatch_*"
							}),
							"."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						title: "getCache / setCache / prune",
						code: CACHE_SNIPPETS.localCacheCore
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						title: "pushHistory (dedupe + cap)",
						code: CACHE_SNIPPETS.history
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-1 text-sm font-semibold text-primary",
						children: "Offline banner"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mb-2 text-[0.72rem] text-muted",
						children: [
							"When ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "text-primary",
								children: "refresh"
							}),
							" fails but scales or quakes remain in memory/cache, ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "text-primary",
								children: "OfflineBanner"
							}),
							" shows age + Retry. Hard errors without cache still use the red alert strip."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "scroll-thin overflow-x-auto rounded-md border border-border bg-[#0a0c10] p-2.5 font-mono text-[0.62rem] text-[#c8d0e0]",
						children: `// components/ops/OfflineBanner.tsx
if (!error) return null;
if (!(scales || eq?.features?.length)) return null; // need cached ops data
// show warn strip: "showing last known data (~Nm old)" + Retry → refresh(true)`
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-1 text-sm font-semibold text-primary",
						children: "INTERMAGNET formats & SSC"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-2 text-[0.72rem] text-muted",
						children: "Formats: IAGA-2002 (ASCII exchange), ImagCDF (definitive CDF), IAF/IMF (legacy), WDC classic. Live path uses Cordaro drmagneto processed H (~30s). SSC/SI watch = step scan on ground/tool series + GOES Hp (SWPC) — not an official Kyoto/ISGI SSC list."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[0.65rem] text-dim",
						children: [
							"Credits: INTERMAGNET · IAGA/NCEI · ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-primary",
								children: "@rrichcord"
							}),
							" · NOAA SWPC GOES"
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-1 text-sm font-semibold text-primary",
					children: "SWPC Kp forecast sources"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "mb-2 list-disc space-y-1 pl-4 text-[0.72rem] text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "text-primary",
							children: "/products/noaa-planetary-k-index.json"
						}), " — observed Kp"] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "text-primary",
							children: "/products/noaa-planetary-k-index-forecast.json"
						}), " — 3h observed + forecast steps (wired as Kp fc strip)"] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "text-primary",
							children: "/text/3-day-forecast.txt"
						}), " — narrative + greatest expected Kp"] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "text-primary",
							children: "/products/noaa-scales.json"
						}), " — G scale now / day+1 / day+2"] })
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-1 text-sm font-semibold text-primary",
						children: "Seismic visualization stack"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mb-2 text-[0.72rem] text-muted",
						children: [
							"We stay on ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Leaflet"
							}),
							" (2D) +",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Three.js"
							}),
							" (3D globe) — free tiles, full control, no Mapbox token. Alternatives considered:"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "list-disc space-y-1 pl-4 text-[0.72rem] text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "MapLibre GL"
							}), " — great vector style, heavier bundle, more WebGL battery cost on mobile Lite"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "deck.gl"
							}), " — excellent for huge point clouds; overkill for capped USGS feeds"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Cesium"
							}), " — full globe terrain; large payload vs our focused hex/stem globe"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "kepler.gl"
							}), " — analytics notebook vibe, not ops HUD"] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[0.68rem] text-dim",
						children: "Decision: keep Leaflet + Three; invest in magneto/SUPT layers rather than re-platforming the map."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "h-4 w-4" }), "NOAA SWPC data APIs"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mb-2 text-[0.72rem] text-muted",
						children: [
							"Base:",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: "text-primary hover:underline",
								href: SWPC_BASE,
								target: "_blank",
								rel: "noopener noreferrer",
								children: SWPC_BASE
							}),
							" ",
							"· free · no key. App uses a server batch for reliability; Lite skips heavy products."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "scroll-thin max-h-64 overflow-y-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full min-w-[18rem] text-left text-[0.68rem]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-b border-border text-dim",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-1 pr-2",
										children: "Product"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-1 pr-2",
										children: "In app"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-1",
										children: "Role"
									})
								]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
								className: "text-muted",
								children: SWPC_ENDPOINTS.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-b border-border/50",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-1.5 pr-2 font-mono text-[0.62rem] text-fg",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
												href: `${SWPC_BASE}${e.path}`,
												target: "_blank",
												rel: "noopener noreferrer",
												className: "hover:text-primary",
												children: e.path.replace("/products/", "").replace("/json/", "")
											}), e.heavy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "ml-1 text-dim",
												children: "· heavy"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5 pr-2",
											children: e.usedInApp ? "yes" : "—"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-1.5",
											children: e.role
										})
									]
								}, e.id))
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						title: "Lite vs heavy solar core",
						code: CACHE_SNIPPETS.solarCoreHeavy
					})
				]
			})
		]
	});
}
function CodeBlock({ title, code }) {
	const [copied, setCopied] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative mt-2 overflow-hidden rounded-lg border border-border bg-[#0a0c10]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-2 border-b border-border/80 px-2.5 py-1.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "truncate font-mono text-[0.62rem] text-dim",
				children: title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "inline-flex min-h-8 items-center gap-1 rounded-md border border-border bg-panel px-2 text-[0.62rem] text-fg",
				onClick: async () => {
					try {
						await navigator.clipboard.writeText(code);
						setCopied(true);
						window.setTimeout(() => setCopied(false), 1600);
					} catch {}
				},
				children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3 w-3 text-ok" }), " Copied"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3 w-3" }), " Copy"] })
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: "scroll-thin max-h-48 overflow-auto p-2.5 text-[0.62rem] leading-relaxed text-[#c8d0e0] sm:text-[0.68rem]",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: code })
		})]
	});
}
function AboutPanel() {
	const [gpu, setGpu] = (0, import_react.useState)(null);
	const [showTechDocs, setShowTechDocs] = (0, import_react.useState)(false);
	const poles = listKnownPoles();
	const demo = tongaPacificDemo();
	const card = xCardDebugReport();
	(0, import_react.useEffect)(() => {
		setGpu(probeGpu());
	}, []);
	const dayRows = timeDecayLegendRows("day");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-3xl space-y-5 p-4 text-sm leading-relaxed text-muted md:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-xl font-semibold text-gold",
					children: "Sol-Earth WolfWatch Sentinel"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2",
					children: [
						"Living digital expression of the",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "SUPT SolWatch → WolfWatch / Sentinel Mode"
						}),
						" architecture by ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XPerson, { profile: "sunwolf" }),
						". Grounded in",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Sheppard's Universal Proxy Theory (SUPT)"
						}),
						" by",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XPerson, { profile: "sheppard" }),
						". Free, browser-native Sol-Earth observatory — original work of this continuum."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-1.5 text-[0.65rem] font-medium uppercase tracking-wider text-dim",
						children: "On X"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(XProfileChips, {})]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "SUPT continuum (app-wide)",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"The same frozen SUPT probe reads ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-fg",
						children: "ordered gaps"
					}),
					" across domains: earthquake inter-event times (Rhythm), and solar flare / CME / X-ray-peak gaps (Solar Interpreter). A shared ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-fg",
						children: "continuum strip"
					}),
					" on Map, Solar, Rhythm, and Charts keeps the vocabulary identical — null is valid, timing structure is not amplitude (R/S/G or magnitude). Charts tab holds supporting time series after the live data and imagery tabs."
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuptMathSection, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "USGS volcano alerts (HANS)",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [
						"Elevated volcanoes from the",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "text-primary hover:underline",
							href: "https://volcanoes.usgs.gov/hans-public/",
							target: "_blank",
							rel: "noopener noreferrer",
							children: "USGS HANS public API"
						}),
						" ",
						"(AVO, HVO, CVO, CALVO, NMI, …). Aviation color + ground alert level on the live map (Volcanoes layer) and compact list. Official notices remain authoritative — not a forecast."
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
				title: "Magnetic anomalies — Cordaro + INTERMAGNET",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [
						"Ground magnetometer relative-probability processing follows the public INTERMAGNET tool by",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XPerson, {
							profile: "cordaro",
							children: "Richard Cordaro"
						}),
						" ",
						"(",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XHandle, { profile: "cordaro" }),
						") at",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "text-primary hover:underline",
							href: "https://drmagneto.appspot.com/",
							target: "_blank",
							rel: "noopener noreferrer",
							children: "drmagneto.appspot.com"
						}),
						". WolfWatch proxies his endpoints, charts the series, runs exploratory peak↔quake matching, and a sudden-commencement / SI step watch. This is",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "not"
						}),
						" a proven earthquake warning system — space weather also drives magnetometers."
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "mt-2 list-disc space-y-1 pl-4 text-sm text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "INTERMAGNET"
						}), " — observatory network & formats (IAGA-2002, ImagCDF, IAF/IMF); we do not re-host raw files"] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "NOAA SWPC GOES magnetometer"
						}), " — free Hp series for space-side SI/SSC context"] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Official SSC lists"
						}), " — Kyoto WDC / ISGI style catalogues remain authoritative; our scan is heuristic only"] })
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Realtime pulse (no public USGS WebSocket)",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [
						"USGS GeoJSON is pull-only. WolfWatch uses an adaptive multi-feed HTTP pulse (",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "text-primary",
							children: "all_hour"
						}),
						" + periodic",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "text-primary",
							children: "significant_hour"
						}),
						"), visibility-aware, with network-quality pacing. Optional self-hosted relay via",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "text-primary",
							children: "VITE_REALTIME_WS"
						}),
						" enables true push (heartbeat + reconnect + GeoJSON frames). LIVE badge = healthy pulse, not a private feed."
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Cache · service worker · SWPC APIs",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CacheAndSwpcDocs, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
				title: "Share on X — card preview",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mb-2 text-xs",
						children: [
							"Link previews use Open Graph +",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "text-primary",
								children: "twitter:card=summary_large_image"
							}),
							". X caches per",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "exact URL"
							}),
							" at first scrape — editing the site does",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "not"
							}),
							" refresh old tweets."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mb-3 list-disc space-y-1 pl-5 text-xs",
						children: card.notes.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: n }, n))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 overflow-x-auto rounded-md border border-border bg-bg/50 p-2.5 font-mono text-[0.65rem] text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["page: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-primary",
								children: card.pageUrl
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["image: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-primary",
								children: card.imageUrl
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								"cache-bust post:",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-primary",
									children: absoluteUrl("/?v=3")
								})
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["static share: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-primary",
								children: card.shareUrl
							})] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: shareCardUrl(),
								target: "_blank",
								rel: "noopener noreferrer",
								className: "inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20",
								children: ["Open static share page", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3.5 w-3.5" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: ogImageUrl(),
								target: "_blank",
								rel: "noopener noreferrer",
								className: "inline-flex items-center gap-1.5 rounded-md border border-border bg-panel px-3 py-2 text-xs font-semibold text-fg hover:bg-elevated",
								children: ["Preview OG image", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3.5 w-3.5" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: `https://x.com/intent/tweet?text=${encodeURIComponent(`${SITE.name}\n${absoluteUrl("/?v=3")}`)}`,
								target: "_blank",
								rel: "noopener noreferrer",
								className: "inline-flex items-center gap-1.5 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/20",
								children: ["Compose tweet (cache-bust URL)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3.5 w-3.5" })]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-[0.65rem] text-dim",
						children: [
							"Debug status (live): Twitterbot receives full tags + 1200×630 PNG. If a new tweet still shows no card, X may be throttling or not expanding this host — try",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "text-primary",
								children: "/share.html"
							}),
							" or wait and re-post."
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "SolWatch Continuum",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "list-disc space-y-1 pl-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "SolWatch"
						}), " — real-time seismic + solar + geomagnetic monitoring"] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "WolfWatch / Sentinel Mode"
						}), " — alert-state surveillance of proxy-measurable anomalies and multi-node context"] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Focused Node Monitors"
						}), " — dedicated operational swarm boards for a single corridor under elevated large-event watch"] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
				title: "Focused Node Monitoring — First Publication",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-fg",
						children: "Tonga–Kermadec Node Monitor"
					}),
					" is the",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-fg",
						children: "first published iteration"
					}),
					" of focused node monitoring (2026-07-30). Operational swarm board on public USGS data — not a forecast product."
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: "https://tonga-kermadec-node-monitor.grok.me/",
					target: "_blank",
					rel: "noopener noreferrer",
					className: "mt-3 inline-flex items-center gap-1.5 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/20",
					children: ["Open Tonga–Kermadec Node Monitor", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3.5 w-3.5" })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-border bg-panel p-3 sm:p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setShowTechDocs((v) => !v),
					className: "flex min-h-11 w-full items-center justify-between gap-2 text-left",
					"aria-expanded": showTechDocs,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-semibold text-primary",
						children: "Technical appendices"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[0.68rem] text-dim",
						children: "Plates · ShakeMap · attenuation · EEW · map GPU — expand only if you need them"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs font-medium text-primary",
						children: showTechDocs ? "Hide" : "Show"
					})]
				}), showTechDocs && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 space-y-4 border-t border-border/70 pt-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
							title: MORVEL_NOTES.title,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mb-2",
									children: MORVEL_NOTES.oneLiner
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "mb-3 list-disc space-y-1.5 pl-5 text-xs",
									children: MORVEL_NOTES.points.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: p }, p.slice(0, 40)))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex flex-wrap gap-2",
									children: MORVEL_NOTES.citations.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: c.url,
										target: "_blank",
										rel: "noopener noreferrer",
										className: "inline-flex items-center gap-1 rounded-md border border-border bg-bg/60 px-2 py-1 text-[0.65rem] text-primary hover:bg-elevated",
										children: [c.label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3 w-3" })]
									}, c.url))
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
							title: EULER_CALC_NOTES.title,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mb-2 text-xs",
									children: "How map arrows are derived — finite rotation of a rigid plate about an Euler pole."
								}),
								demo.v && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mb-3 rounded-md border border-primary/25 bg-primary/5 px-2.5 py-2 text-xs",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
											className: "text-primary",
											children: "Demo — Pacific at Tonga trench"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										"Site ",
										demo.lat,
										"°, ",
										demo.lon,
										"° · |v| ≈ ",
										demo.v.speed.toFixed(0),
										" mm/yr · bearing",
										" ",
										demo.v.bearing.toFixed(0),
										"°"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "overflow-x-auto",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
										className: "w-full text-left text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
											className: "border-b border-border text-dim",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
													className: "py-1 pr-2 font-medium",
													children: "Plate"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
													className: "py-1 pr-2 font-medium",
													children: "Code"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
													className: "py-1 pr-2 font-medium",
													children: "Pole lat"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
													className: "py-1 pr-2 font-medium",
													children: "Pole lon"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
													className: "py-1 font-medium",
													children: "ω °/Myr"
												})
											]
										}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
											className: "text-muted",
											children: poles.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
												className: "border-b border-border/50",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
														className: "py-1 pr-2 text-fg",
														children: p.name
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
														className: "py-1 pr-2 font-mono text-primary",
														children: p.code
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
														className: "py-1 pr-2 font-mono",
														children: [p.pole.lat.toFixed(1), "°"]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
														className: "py-1 pr-2 font-mono",
														children: [p.pole.lon.toFixed(1), "°"]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
														className: "py-1 font-mono",
														children: p.pole.omega.toFixed(3)
													})
												]
											}, p.code))
										})]
									})
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
							title: SHAKEMAP_NOTES.title,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mb-2",
								children: SHAKEMAP_NOTES.oneLiner
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "rounded-md border border-primary/25 bg-primary/5 px-2.5 py-2 text-xs text-dim",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-primary",
										children: "Sentinel stance:"
									}),
									" ",
									SHAKEMAP_NOTES.stance
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
							title: "Heat time-decay — values",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "overflow-x-auto",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
									className: "w-full text-left text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-b border-border text-dim",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "py-1 pr-2 font-medium",
												children: "Window"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "py-1 pr-2 font-medium",
												children: "Half-life t½"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "py-1 font-medium",
												children: "Example (day)"
											})
										]
									}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
										className: "text-muted",
										children: Object.keys(DECAY_HALF_LIFE_H).map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
											className: "border-b border-border/50",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
													className: "py-1.5 pr-2 text-fg",
													children: w
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
													className: "py-1.5 pr-2 font-mono text-primary",
													children: halfLifeLabel(w)
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
													className: "py-1.5 font-mono text-[0.7rem]",
													children: w === "day" ? dayRows.map((r) => `${r.ageLabel}=${r.pct}`).join(" · ") : "—"
												})
											]
										}, w))
									})]
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
							title: ATTENUATION_NOTES.title,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mb-2",
								children: ATTENUATION_NOTES.summary
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
							title: EEW_NOTES.title,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "rounded-md border border-danger/30 bg-danger/10 px-2.5 py-2 text-xs text-danger/90",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Not an early-warning product." }),
									" ",
									EEW_NOTES.sentinelStance
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
							title: "Map stack & GPU probe",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
								className: "space-y-1 text-xs",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
											className: "text-fg",
											children: "Leaflet"
										}),
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
											className: "text-primary",
											children: "1.9.4"
										}),
										" · 2D map"
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-fg",
										children: "three.js"
									}), " · Full-mode 3D globe (hex markers, stems)"] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-fg",
										children: "Plates"
									}), " PB2002 boundaries + Euler relative-motion arrows"] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-fg",
										children: "Basemaps"
									}), " OSM · CARTO · Esri World Imagery · OpenTopoMap (see map corner attribution)"] })
								]
							}), gpu && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 rounded-lg border border-border bg-bg/50 p-3 font-mono text-[0.68rem] text-muted",
								children: [
									"WebGL ",
									gpu.webgl ? "yes" : "no",
									gpu.webgl2 ? " · WebGL2" : "",
									gpu.instancing ? " · instancing" : "",
									" · WebGPU",
									" ",
									gpu.webgpu ? "available" : "n/a"
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
							title: "Map performance — snippets",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-4",
								children: PERF_TIPS.map((tip) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SnippetCard, {
									title: tip.title,
									body: tip.body,
									snippet: tip.snippet
								}, tip.id))
							})
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Credits, Lineage & Data Sources",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3 text-xs leading-relaxed",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-1.5 text-[0.65rem] font-medium uppercase tracking-wider text-dim",
							children: "Profiles on X"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(XProfileChips, {})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-semibold text-fg",
							children: "Primary technical lineage"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XPerson, { profile: "sunwolf" }), " — SolWatch → WolfWatch / Sentinel architecture, node monitors, and this free observatory."] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-semibold text-fg",
							children: "Theory & resonance"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XPerson, { profile: "sheppard" }), " — Sheppard's Universal Proxy Theory (SUPT) and the frozen resonance probe used in the Resonance layer."] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-semibold text-fg",
							children: "Live public data"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-1 list-disc space-y-0.5 pl-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: "USGS"
								}), " — earthquake catalog, volcano feed, ShakeMap / cont_mmi products"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: "NOAA SWPC"
								}), " — Kp, X-ray, solar wind, scales, alerts"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: "NASA SDO"
								}), " — AIA imagery (solar panel)"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: "GFZ GEOFON"
								}), " — optional multi-agency seismic merge (Potsdam)"] })
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-semibold text-fg",
							children: "Tectonics (educational)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-1 list-disc space-y-0.5 pl-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: "Bird (2003)"
								}), " — PB2002 plate boundaries"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: "DeMets, Gordon & Argus (2010)"
								}), " — MORVEL"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: "Argus, Gordon & DeMets (2011)"
								}), " — NNR-MORVEL56"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Boundary GeoJSON packaging often distributed via community repos (e.g. tectonicplates / PB2002 derivatives) — model credit remains with the authors above" })
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-semibold text-fg",
								children: ["Public seismic globe — ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(XPerson, { profile: "dutchsinse" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								"Several optional Sentinel patterns (GEOFON multi-agency merge, hex depth stems, globe size / opacity / stem / spin tune, click-to-select, antipode jump, max-mag filter, soft audio alerts) were inspired by",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XPerson, {
									profile: "dutchsinse",
									children: "Dutchsinse's free public seismic globe"
								}),
								" ",
								"tool, which he published for community use and stated free to utilise. Thank you."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 flex flex-wrap gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: "https://www.dutchsinse.com/beta-test-new-earthquake-program-for-public-use/",
									target: "_blank",
									rel: "noopener noreferrer",
									className: "inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20",
									children: ["Public download / beta page", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3.5 w-3.5" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: "https://x.com/RealDutchsinse",
									target: "_blank",
									rel: "noopener noreferrer",
									className: "inline-flex items-center gap-1.5 rounded-md border border-border bg-panel px-3 py-2 text-xs font-semibold text-fg hover:bg-elevated",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XHandle, { profile: "dutchsinse" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3.5 w-3.5 text-dim" })]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1.5 text-[0.65rem] text-dim",
								children: [
									"Official page:",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: "https://www.dutchsinse.com/beta-test-new-earthquake-program-for-public-use/",
										target: "_blank",
										rel: "noopener noreferrer",
										className: "text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary",
										children: "dutchsinse.com/beta-test-new-earthquake-program-for-public-use"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1.5 text-dim",
								children: [
									"Those ideas were re-implemented inside WolfWatch's own architecture and UI — this is ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: "not" }),
									" a fork or reskin of his HTML page (no CDN three r128 stack, no UI clone of his private edition). Agency data and library credit remain separate above."
								]
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-semibold text-fg",
							children: "Libraries & imagery"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-1 list-disc space-y-0.5 pl-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-fg",
										children: "Leaflet"
									}),
									",",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-fg",
										children: "three.js"
									}),
									", React, Vite, TanStack — open-source UI / map / 3D stack"
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
									"Basemap tiles: ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-fg",
										children: "OpenStreetMap"
									}),
									" contributors,",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-fg",
										children: "CARTO"
									}),
									", ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-fg",
										children: "Esri"
									}),
									",",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-fg",
										children: "OpenTopoMap"
									}),
									" / SRTM (also on map corner control)"
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
									"Globe texture: ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-fg",
										children: "NASA Blue Marble"
									}),
									"–style Earth (via three-globe example asset; procedural fallback if CDN fails)"
								] })
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-semibold text-fg",
							children: "Build assist"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							"Implementation assistance via ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Grok Build (xAI)"
							}),
							" — product design and IP remain",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XPerson, {
								profile: "sunwolf",
								className: "text-xs"
							}),
							" /",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XPerson, {
								profile: "sheppard",
								className: "text-xs"
							}),
							" continuum."
						] })] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-dim",
				children: "Independent and free. Cross-check critical events with USGS / NOAA / local agencies. Metrics are educational overlays — not official forecasts, ShakeMaps, or early warning."
			})
		]
	});
}
function SnippetCard({ title, body, snippet }) {
	const [copied, setCopied] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-border bg-bg/60 p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start justify-between gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
				className: "text-sm font-semibold text-fg",
				children: title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 text-xs text-dim",
				children: body
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "ww-btn ww-btn--ghost shrink-0 text-[0.65rem]",
				onClick: async () => {
					try {
						await navigator.clipboard.writeText(snippet);
						setCopied(true);
						setTimeout(() => setCopied(false), 1600);
					} catch {}
				},
				children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5 text-ok" }), " Copied"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3.5 w-3.5" }), " Copy"] })
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: "scroll-thin mt-2 max-h-48 overflow-auto rounded-md border border-border bg-panel p-2.5 font-mono text-[0.62rem] leading-relaxed text-primary/90",
			children: snippet
		})]
	});
}
function Section({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl border border-border bg-panel p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "mb-2 text-xs font-medium uppercase tracking-wider text-primary",
			children: title
		}), children]
	});
}
var STATUS_LABEL = {
	quiet: "Quiet",
	elevated: "Elevated",
	active: "Active",
	watch: "Watch"
};
var STATUS_CLASS = {
	quiet: "border-primary/40 bg-primary/10 text-primary",
	elevated: "border-gold/50 bg-gold/15 text-gold",
	active: "border-warn/50 bg-warn/15 text-warn",
	watch: "border-danger/50 bg-danger/15 text-danger animate-pulse-soft"
};
/**
* Published focused monitors — deep swarm boards live outside Sentinel.
* Card offers Focus-in-app + open full board.
*/
function FocusedNodeCard({ features }) {
	const setFocusNode = useObservatory((s) => s.setFocusNode);
	const focusNodeId = useObservatory((s) => s.focusNodeId);
	if (FOCUSED_MONITORS.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
			className: "flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-gold",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radar, { className: "h-3.5 w-3.5" }), "Published Swarm Boards"]
		}), FOCUSED_MONITORS.map((node) => {
			const st = nodeStatus(features, node);
			const stats = nodeEventStats(features, node);
			const focused = focusNodeId === node.id;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-gold/35 bg-panel p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-start justify-between gap-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-fg",
									children: node.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-gold",
									children: "Published"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-0.5 text-[0.7rem] leading-snug text-dim",
								children: node.role
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex flex-wrap items-center gap-2 text-[0.7rem]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `rounded-full border px-2 py-0.5 font-medium ${STATUS_CLASS[st]}`,
							children: STATUS_LABEL[st]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted",
							children: [
								stats.count,
								" in view",
								stats.maxMag > 0 ? ` · max M${stats.maxMag.toFixed(1)}` : "",
								stats.m5 > 0 ? ` · ${stats.m5}× M5+` : ""
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2.5 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setFocusNode(focused ? null : node.id),
							className: `rounded-md border px-2.5 py-1.5 text-[0.7rem] font-medium ${focused ? "border-primary bg-primary/20 text-primary" : "border-border text-muted hover:text-fg"}`,
							children: focused ? "Exit focus" : "Focus on map"
						}), node.monitorUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: node.monitorUrl,
							target: "_blank",
							rel: "noopener noreferrer",
							className: "inline-flex items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-2.5 py-1.5 text-[0.7rem] font-semibold text-gold hover:bg-gold/20",
							children: ["Full swarm board", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3 w-3" })]
						})]
					})
				]
			}, node.id);
		})]
	});
}
var BRIEF_OPEN_KEY = "wolfwatch_today_brief_open";
/** One-line “Today” orientation — uses store-cached solar assessment. */
function TodayBriefBar({ dense = false, showRecLink = true }) {
	const resonance = useObservatory((s) => s.resonance);
	const scales = useObservatory((s) => s.scales);
	const donki = useObservatory((s) => s.donki);
	const solar = useObservatory((s) => s.solarAssessment);
	const setTab = useObservatory((s) => s.setTab);
	const mobile = useIsMobile();
	const [open, setOpen] = (0, import_react.useState)(!mobile);
	(0, import_react.useEffect)(() => {
		if (!mobile) {
			setOpen(true);
			return;
		}
		try {
			setOpen(localStorage.getItem(BRIEF_OPEN_KEY) === "1");
		} catch {
			setOpen(false);
		}
	}, [mobile]);
	const brief = (0, import_react.useMemo)(() => buildTodayBrief({
		solar,
		seismic: resonance,
		scales,
		cmes: donki?.cmes ?? []
	}), [
		solar,
		resonance,
		scales,
		donki
	]);
	const tone = brief.level === "storm" ? "border-danger/40 bg-danger/10 text-danger" : brief.level === "elevated" ? "border-warn/35 bg-warn/10 text-warn" : brief.level === "watch" ? "border-gold/35 bg-gold/10 text-gold" : "border-border bg-panel text-muted";
	const topRec = brief.recommendations[0];
	const showRec = showRecLink && topRec && !mobile;
	const toggle = () => {
		setOpen((v) => {
			const next = !v;
			if (mobile) try {
				localStorage.setItem(BRIEF_OPEN_KEY, next ? "1" : "0");
			} catch {}
			return next;
		});
	};
	if (mobile && !open) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: toggle,
		className: `flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1 text-left ${tone}`,
		"aria-expanded": false,
		"aria-label": "Expand today brief",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "inline-flex min-w-0 items-center gap-1.5 text-[0.62rem] font-semibold",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "h-3 w-3 shrink-0" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "uppercase tracking-wide",
					children: "Today"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "truncate font-medium text-fg",
					children: [
						"Attn ",
						brief.solarAttn,
						" · ",
						brief.scales
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-3.5 w-3.5 shrink-0 opacity-70" })]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `rounded-lg border px-2.5 py-1.5 sm:py-2 ${tone} ${dense || mobile ? "text-[0.65rem]" : "text-xs"}`,
		role: "status",
		"aria-label": "Today brief",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-x-2 gap-y-0.5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "inline-flex items-center gap-1 font-semibold uppercase tracking-wide",
					onClick: mobile ? toggle : void 0,
					"aria-expanded": open,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "h-3 w-3" }),
						"Today",
						mobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "h-3 w-3 opacity-70" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "min-w-0 font-medium leading-snug text-fg",
					children: mobile ? `Attn ${brief.solarAttn} · ${brief.scales} · Earth ${brief.earthD}${brief.earthSep ? "·sep" : ""}` : brief.line
				}),
				mobile && topRec?.tab && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "ww-btn min-h-8 px-2 text-[0.6rem]",
					onClick: () => setTab(topRec.tab),
					children: topRec.priority === "now" || topRec.priority === "watch" ? "Watch" : "Solar"
				})
			]
		}), showRec && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-1 flex flex-wrap items-center gap-2 text-[0.68rem] text-fg/90",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "h-3 w-3 shrink-0 opacity-70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
					className: "font-semibold",
					children: topRec.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-dim",
					children: [
						" ",
						"— ",
						topRec.detail.slice(0, 120),
						topRec.detail.length > 120 ? "…" : ""
					]
				})]
			})]
		})]
	});
}
/** Shown when last refresh failed but we still have cached ops data. */
function OfflineBanner() {
	const error = useObservatory((s) => s.error);
	const scales = useObservatory((s) => s.scales);
	const eq = useObservatory((s) => s.eq);
	const lastUpdate = useObservatory((s) => s.lastUpdate);
	const refresh = useObservatory((s) => s.refresh);
	const loading = useObservatory((s) => s.loading);
	if (!error) return null;
	if (!Boolean(scales || eq?.features?.length)) return null;
	const age = lastUpdate != null ? Math.round((Date.now() - lastUpdate) / 6e4) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex shrink-0 flex-wrap items-center gap-2 border-b border-warn/40 bg-warn/10 px-3 py-1.5 text-xs text-warn sm:px-4",
		role: "status",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WifiOff, {
				className: "h-3.5 w-3.5 shrink-0",
				"aria-hidden": true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "min-w-0 flex-1 text-fg/90",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-warn",
						children: "Offline / feed error"
					}),
					" — ",
					"showing last known data",
					age != null ? ` (~${age}m old)` : "",
					". Live scales may be stale."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "ww-btn min-h-8 px-2 text-[0.65rem]",
				disabled: loading,
				onClick: () => void refresh(true),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `h-3 w-3 ${loading ? "animate-spin" : ""}` }), "Retry"]
			})
		]
	});
}
function AlertChip({ v }) {
	const flyMapTo = useObservatory((s) => s.flyMapTo);
	const setOverlay = useObservatory((s) => s.setOverlay);
	const setFocusNode = useObservatory((s) => s.setFocusNode);
	const focusNodeId = useObservatory((s) => s.focusNodeId);
	const pins = useObservatory((s) => s.volcWatchPins);
	const mutes = useObservatory((s) => s.volcWatchMutes);
	const pinVolcWatch = useObservatory((s) => s.pinVolcWatch);
	const unpinVolcWatch = useObservatory((s) => s.unpinVolcWatch);
	const muteVolcWatch = useObservatory((s) => s.muteVolcWatch);
	const unmuteVolcWatch = useObservatory((s) => s.unmuteVolcWatch);
	const hex = colorCodeHex(v.colorCode);
	const canFly = v.lat != null && v.lon != null;
	const key = alertKey(v);
	const nodeId = nodeIdForAlert(v);
	const active = focusNodeId === nodeId;
	const pinned = pins.includes(key);
	const muted = mutes.includes(key);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `flex w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-md border px-2 py-1.5 text-[0.7rem] ${active ? "border-orange-400/60 bg-orange-500/15" : muted ? "border-border/40 bg-bg/30 opacity-60" : "border-border/70 bg-bg/50"}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-left hover:opacity-90 disabled:opacity-50",
				disabled: !canFly,
				onClick: () => {
					if (!canFly) return;
					setOverlay("volcanoes", true);
					setFocusNode(active ? null : nodeId);
					flyMapTo(v.lat, v.lon, 7, nodeId);
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "inline-block h-2 w-2 shrink-0 rounded-full",
						style: { background: hex },
						"aria-hidden": true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold text-fg",
						children: v.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-[0.62rem] uppercase",
						style: { color: hex },
						children: v.colorCode
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[0.62rem] text-dim",
						children: v.alertLevel
					}),
					pinned && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[0.55rem] font-semibold text-primary",
						children: "PIN"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "ww-btn ww-btn--icon h-7 w-7 min-h-0",
				title: pinned ? "Unpin (auto-drop at green)" : "Pin (keep after green)",
				onClick: () => pinned ? unpinVolcWatch(key) : pinVolcWatch(key),
				children: pinned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PinOff, { className: "h-3 w-3" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pin, { className: "h-3 w-3" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "ww-btn ww-btn--icon h-7 w-7 min-h-0",
				title: muted ? "Unmute (show on watchlist)" : "Mute (hide from watchlist)",
				onClick: () => muted ? unmuteVolcWatch(key) : muteVolcWatch(key),
				children: muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-3 w-3" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-3 w-3" })
			}),
			v.noticeUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: v.noticeUrl,
				target: "_blank",
				rel: "noopener noreferrer",
				className: "inline-flex items-center gap-0.5 text-[0.6rem] text-primary hover:underline",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3 w-3" })
			})
		]
	}) });
}
function VolcanoAlertsBar({ compact = false }) {
	const alerts = useObservatory((s) => s.usgsVolcAlerts);
	const pins = useObservatory((s) => s.volcWatchPins);
	const mutes = useObservatory((s) => s.volcWatchMutes);
	const loading = useObservatory((s) => s.loading);
	const memoryPins = pins.filter((k) => !alerts.some((a) => alertKey(a) === k));
	if (!alerts.length && !pins.length && !loading) {
		if (compact) return null;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-lg border border-border/80 bg-panel/60 px-2.5 py-2 text-[0.68rem] text-dim",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "inline-flex items-center gap-1 font-semibold text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mountain, { className: "h-3.5 w-3.5" }), " USGS volcano alerts"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5",
				children: "All baseline (NORMAL / GREEN). Pin from history when elevated to keep a watch."
			})]
		});
	}
	if (!alerts.length && !pins.length) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `rounded-lg border border-orange-500/30 bg-orange-500/5 ${compact ? "px-2 py-1.5" : "px-2.5 py-2"}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-1 flex flex-wrap items-center justify-between gap-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "inline-flex items-center gap-1 text-[0.68rem] font-semibold text-orange-300",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mountain, { className: "h-3.5 w-3.5" }),
						"USGS elevated (",
						alerts.length,
						")",
						pins.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-normal text-dim",
							children: [
								"· ",
								pins.length,
								" pinned"
							]
						}),
						mutes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-normal text-dim",
							children: [
								"· ",
								mutes.length,
								" muted"
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "https://www.usgs.gov/programs/VHP",
					target: "_blank",
					rel: "noopener noreferrer",
					className: "text-[0.6rem] text-dim hover:text-primary",
					children: "VHP / HANS"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-1 text-[0.58rem] text-dim",
				children: "Pin = keep after green · Mute = hide while elevated · Tap name = map focus"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: `space-y-1 ${compact ? "max-h-32 overflow-y-auto scroll-thin" : "max-h-44 overflow-y-auto scroll-thin"}`,
				children: alerts.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertChip, { v }, v.id))
			}),
			memoryPins.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-[0.58rem] text-dim",
				children: [
					"Pinned baseline keys: ",
					memoryPins.join(", "),
					" (map watch until unpin)"
				]
			})
		]
	});
}
/**
* Smart mapping for USGS elevated volcano watchlist:
*  - Auto-enable Volcanoes layer while any elevated
*  - Toast elevate / return-to-baseline
*  - Fly + focus only on single new elevate (not bulk first seed)
*/
function VolcWatchSmart() {
	const transitions = useObservatory((s) => s.volcWatchTransitions);
	const volcWatchNodes = useObservatory((s) => s.volcWatchNodes);
	const setOverlay = useObservatory((s) => s.setOverlay);
	const flyMapTo = useObservatory((s) => s.flyMapTo);
	const setFocusNode = useObservatory((s) => s.setFocusNode);
	const seen = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const seeded = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		if (volcWatchNodes.length > 0) setOverlay("volcanoes", true);
	}, [volcWatchNodes.length, setOverlay]);
	(0, import_react.useEffect)(() => {
		if (!transitions.length) return;
		const fresh = transitions.filter((t) => {
			const key = `${t.kind}:${t.id}:${t.at}`;
			if (seen.current.has(key)) return false;
			seen.current.add(key);
			return true;
		});
		if (!fresh.length) return;
		const elevates = fresh.filter((t) => t.kind === "elevated");
		const baselines = fresh.filter((t) => t.kind === "baseline");
		if (!seeded.current && elevates.length > 1) {
			seeded.current = true;
			if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ww-volc-watch", { detail: {
				message: `Volcanoes: ${elevates.length} elevated`,
				kind: "elevated"
			} }));
			return;
		}
		seeded.current = true;
		for (const latest of elevates) {
			if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ww-volc-watch", { detail: {
				message: `${latest.name}: ${latest.colorCode}`,
				kind: "elevated",
				nodeId: latest.id
			} }));
			const node = useObservatory.getState().volcWatchNodes.find((n) => n.id === latest.id);
			if (node?.center && elevates.length === 1) {
				flyMapTo(node.center[0], node.center[1], 6, latest.id);
				setFocusNode(latest.id);
			}
		}
		for (const latest of baselines) {
			if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ww-volc-watch", { detail: {
				message: `${latest.name}: baseline`,
				kind: "baseline",
				nodeId: latest.id
			} }));
			if (useObservatory.getState().focusNodeId === latest.id) setFocusNode(null);
		}
	}, [
		transitions,
		flyMapTo,
		setFocusNode
	]);
	return null;
}
function wsUrl() {
	try {
		return {
			"BASE_URL": "/",
			"DEV": false,
			"MODE": "production",
			"PROD": true,
			"SSR": true,
			"TSS_DEV_SERVER": "false",
			"TSS_DEV_SSR_STYLES_BASEPATH": "/",
			"TSS_DEV_SSR_STYLES_ENABLED": "true",
			"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
			"TSS_INLINE_CSS_ENABLED": "false",
			"TSS_ROUTER_BASEPATH": "",
			"TSS_SERVER_FN_BASE": "/_serverFn/",
			"VITE_DEV_SERVER_HOST": "0.0.0.0"
		}.VITE_REALTIME_WS?.trim() || null;
	} catch {
		return null;
	}
}
function connectionFactor() {
	try {
		const c = navigator.connection;
		if (!c) return 1;
		if (c.saveData) return 1.6;
		const t = c.effectiveType || "";
		if (t === "slow-2g" || t === "2g") return 2.2;
		if (t === "3g") return 1.45;
		return 1;
	} catch {
		return 1;
	}
}
/**
* Start realtime. Prefer WebSocket when configured; else adaptive multi-feed HTTP.
* Returns stop().
*/
function startRealtime(handlers, opts) {
	const minMs = opts.minMs ?? 12e3;
	const maxMs = opts.maxMs ?? 18e4;
	let baseMs = Math.max(minMs, opts.baseMs);
	let timer = null;
	let stopped = false;
	let ws = null;
	let wsRetry = null;
	let wsRetryMs = 3e3;
	let pulseN = 0;
	let heartbeat = null;
	const visible = () => typeof document === "undefined" ? true : document.visibilityState === "visible";
	const online = () => typeof navigator === "undefined" ? true : navigator.onLine !== false;
	const nextInterval = () => {
		const f = connectionFactor();
		const hidden = !visible();
		let ms = baseMs * f;
		if (hidden) ms = Math.min(maxMs, Math.max(ms * 3, 9e4));
		if (!online()) ms = Math.min(maxMs, 12e4);
		return Math.round(Math.min(maxMs, Math.max(minMs, ms)));
	};
	const scheduleHttp = (ms) => {
		if (stopped) return;
		if (timer) clearTimeout(timer);
		timer = setTimeout(async () => {
			if (stopped) return;
			if (!online()) {
				handlers.onStatus?.("offline", "waiting for network");
				scheduleHttp(nextInterval());
				return;
			}
			if (!visible()) {
				handlers.onStatus?.("paused", "tab hidden — slow pulse");
				try {
					await handlers.onPulse("hour");
				} catch {}
				scheduleHttp(nextInterval());
				return;
			}
			handlers.onStatus?.("polling", "HTTP multi-feed");
			try {
				pulseN += 1;
				const kind = pulseN % 3 === 0 ? "significant" : "hour";
				await handlers.onPulse(kind);
				handlers.onStatus?.(ws && ws.readyState === WebSocket.OPEN ? "ws" : "live", kind === "significant" ? "significant_hour" : "all_hour");
				baseMs = Math.max(minMs, Math.floor(baseMs * .92));
			} catch {
				handlers.onStatus?.("error", "pulse failed");
				baseMs = Math.min(maxMs, Math.floor(baseMs * 1.4));
			}
			scheduleHttp(nextInterval());
		}, ms);
	};
	const clearHeartbeat = () => {
		if (heartbeat) {
			clearInterval(heartbeat);
			heartbeat = null;
		}
	};
	const connectWs = (url) => {
		try {
			if (ws) try {
				ws.close();
			} catch {}
			ws = new WebSocket(url);
			ws.onopen = () => {
				wsRetryMs = 3e3;
				handlers.onStatus?.("ws", "relay connected");
				handlers.onPulse("ws");
				clearHeartbeat();
				heartbeat = setInterval(() => {
					if (ws && ws.readyState === WebSocket.OPEN) try {
						ws.send(JSON.stringify({
							type: "ping",
							t: Date.now()
						}));
					} catch {}
				}, 25e3);
			};
			ws.onmessage = (ev) => {
				try {
					const raw = typeof ev.data === "string" ? ev.data : "";
					if (raw) {
						const data = JSON.parse(raw);
						if (data?.type === "pong" || data?.type === "ping") return;
						if (data && (data.type === "FeatureCollection" || Array.isArray(data.features))) {
							handlers.onGeojson?.(data);
							handlers.onStatus?.("ws", "push frame");
							return;
						}
					}
				} catch {}
				handlers.onPulse("ws");
				handlers.onStatus?.("ws", "wake");
			};
			ws.onerror = () => {
				handlers.onStatus?.("error", "ws error — HTTP underlay active");
			};
			ws.onclose = () => {
				clearHeartbeat();
				if (stopped) return;
				handlers.onStatus?.("polling", "ws closed — reconnect + HTTP");
				scheduleHttp(baseMs);
				const wait = wsRetryMs;
				wsRetryMs = Math.min(6e4, Math.floor(wsRetryMs * 1.7));
				wsRetry = setTimeout(() => {
					if (!stopped && online()) connectWs(url);
				}, wait);
			};
		} catch {
			scheduleHttp(baseMs);
		}
	};
	const onVis = () => {
		if (stopped) return;
		if (visible() && online()) {
			handlers.onPulse("hour");
			if (!ws || ws.readyState !== WebSocket.OPEN) {
				handlers.onStatus?.("live", "tab visible");
				scheduleHttp(minMs);
			} else handlers.onStatus?.("ws", "tab visible");
		} else if (!online()) handlers.onStatus?.("offline", "network down");
		else handlers.onStatus?.("paused", "tab hidden");
	};
	const onOnline = () => {
		if (stopped) return;
		handlers.onStatus?.("live", "back online");
		handlers.onPulse("hour");
		scheduleHttp(minMs);
		const url = wsUrl();
		if (url) connectWs(url);
	};
	const onOffline = () => {
		handlers.onStatus?.("offline", "network down");
	};
	if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVis);
	if (typeof window !== "undefined") {
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);
	}
	const url = wsUrl();
	if (url && typeof WebSocket !== "undefined") {
		connectWs(url);
		handlers.onStatus?.("ws", "connecting relay + HTTP underlay");
		handlers.onPulse("hour");
		scheduleHttp(Math.max(baseMs, 45e3));
	} else {
		handlers.onStatus?.("live", "adaptive HTTP multi-feed (USGS has no public WS)");
		handlers.onPulse("hour");
		scheduleHttp(baseMs);
	}
	return () => {
		stopped = true;
		if (timer) clearTimeout(timer);
		if (wsRetry) clearTimeout(wsRetry);
		clearHeartbeat();
		if (ws) try {
			ws.close();
		} catch {}
		if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVis);
		if (typeof window !== "undefined") {
			window.removeEventListener("online", onOnline);
			window.removeEventListener("offline", onOffline);
		}
	};
}
var LiveMap = (0, import_react.lazy)(() => import("./LiveMap-HlkQvq5y.mjs").then((m) => ({ default: m.LiveMap })));
var Globe3D = (0, import_react.lazy)(() => import("./Globe3D-C5mYSksy.mjs").then((m) => ({ default: m.Globe3D })));
var TABS = [
	{
		id: "live",
		label: "Live Map",
		short: "Map",
		Icon: Map$1
	},
	{
		id: "solar",
		label: "Solar",
		short: "Solar",
		Icon: Sun
	},
	{
		id: "resonance",
		label: "Rhythm",
		short: "Rhythm",
		Icon: Waves
	},
	{
		id: "analytics",
		label: "Charts",
		short: "Charts",
		Icon: Activity
	},
	{
		id: "about",
		label: "About",
		short: "About",
		Icon: BookOpen
	}
];
var WINDOWS = [
	{
		id: "hour",
		label: "1h",
		title: "Past hour"
	},
	{
		id: "day",
		label: "1d",
		title: "Past day"
	},
	{
		id: "week",
		label: "1w",
		title: "Past week"
	},
	{
		id: "month",
		label: "1m",
		title: "Past month"
	}
];
function ObservatoryApp() {
	const mode = useObservatory((s) => s.mode);
	const tab = useObservatory((s) => s.tab);
	const mapView = useObservatory((s) => s.mapView);
	const timeWindow = useObservatory((s) => s.timeWindow);
	const minMag = useObservatory((s) => s.minMag);
	const maxMag = useObservatory((s) => s.maxMag);
	const autoRefresh = useObservatory((s) => s.autoRefresh);
	const liveStatus = useObservatory((s) => s.liveStatus);
	const loading = useObservatory((s) => s.loading);
	const lastUpdate = useObservatory((s) => s.lastUpdate);
	const livePulseAt = useObservatory((s) => s.livePulseAt);
	const newestEventAgeMs = useObservatory((s) => s.newestEventAgeMs);
	const error = useObservatory((s) => s.error);
	const scales = useObservatory((s) => s.scales);
	const eq = useObservatory((s) => s.eq);
	const focusNodeId = useObservatory((s) => s.focusNodeId);
	const setMode = useObservatory((s) => s.setMode);
	const setTab = useObservatory((s) => s.setTab);
	const mobileSheet = useObservatory((s) => s.mobileSheet);
	const setMobileSheet = useObservatory((s) => s.setMobileSheet);
	const setMapView = useObservatory((s) => s.setMapView);
	const setTimeWindow = useObservatory((s) => s.setTimeWindow);
	const setMinMag = useObservatory((s) => s.setMinMag);
	useObservatory((s) => s.setMaxMag);
	const setAutoRefresh = useObservatory((s) => s.setAutoRefresh);
	const refresh = useObservatory((s) => s.refresh);
	const pulseRealtime = useObservatory((s) => s.pulseRealtime);
	const bootstrapClientDefaults = useObservatory((s) => s.bootstrapClientDefaults);
	const flyMapTo = useObservatory((s) => s.flyMapTo);
	const useGeofon = useObservatory((s) => s.useGeofon);
	const setUseGeofon = useObservatory((s) => s.setUseGeofon);
	const audioAlerts = useObservatory((s) => s.audioAlerts);
	const setAudioAlerts = useObservatory((s) => s.setAudioAlerts);
	const antipodeOf = useObservatory((s) => s.antipodeOf);
	const pickEvent = useObservatory((s) => s.pickEvent);
	const pickedEvent = useObservatory((s) => s.pickedEvent);
	const fullTimer = (0, import_react.useRef)(null);
	const pulseTimer = (0, import_react.useRef)(null);
	const [toast, setToast] = (0, import_react.useState)(null);
	const [ageTick, setAgeTick] = (0, import_react.useState)(0);
	const [selectedEventId, setSelectedEventId] = (0, import_react.useState)(null);
	const [bootWait, setBootWait] = (0, import_react.useState)(false);
	const bootRetried = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		bootstrapClientDefaults();
		refresh(true);
	}, [refresh, bootstrapClientDefaults]);
	(0, import_react.useEffect)(() => {
		if (lastUpdate) {
			setBootWait(false);
			return;
		}
		const t = window.setTimeout(() => setBootWait(true), 4e3);
		return () => window.clearTimeout(t);
	}, [lastUpdate]);
	(0, import_react.useEffect)(() => {
		if (!bootWait || lastUpdate || bootRetried.current) return;
		bootRetried.current = true;
		refresh(true);
	}, [
		bootWait,
		lastUpdate,
		refresh
	]);
	(0, import_react.useEffect)(() => {
		const t = tabFromLocation();
		if (t) setTab(t);
		const onPop = () => {
			const next = tabFromLocation();
			if (next) setTab(next);
		};
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, [setTab]);
	(0, import_react.useEffect)(() => {
		syncTabToUrl(tab);
	}, [tab]);
	(0, import_react.useEffect)(() => {
		if (fullTimer.current) clearInterval(fullTimer.current);
		if (!autoRefresh) return;
		const ms = MODES[mode].refreshMs;
		fullTimer.current = setInterval(() => {
			refresh(false);
		}, ms);
		return () => {
			if (fullTimer.current) clearInterval(fullTimer.current);
		};
	}, [
		autoRefresh,
		mode,
		refresh
	]);
	(0, import_react.useEffect)(() => {
		if (pulseTimer.current) clearInterval(pulseTimer.current);
		if (!autoRefresh) {
			useObservatory.getState().setLiveStatus("paused", "auto-refresh off");
			return;
		}
		return startRealtime({
			onPulse: (kind) => pulseRealtime(kind),
			onGeojson: async (data) => {
				try {
					const fc = data;
					if (fc?.type === "FeatureCollection" && Array.isArray(fc.features)) await pulseRealtime("ws");
					else await pulseRealtime("ws");
				} catch {
					await pulseRealtime("ws");
				}
			},
			onStatus: (s, d) => useObservatory.getState().setLiveStatus(s, d)
		}, {
			baseMs: MODES[mode].realtimeMs,
			minMs: mode === "lite" ? 18e3 : 12e3,
			maxMs: mode === "lite" ? 24e4 : 18e4
		});
	}, [
		autoRefresh,
		mode,
		pulseRealtime
	]);
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => setAgeTick((n) => n + 1), 15e3);
		return () => clearInterval(id);
	}, []);
	const features = (0, import_react.useMemo)(() => viewEvents(eq?.features, minMag, focusNodeId, maxMag), [
		eq?.features,
		minMag,
		maxMag,
		focusNodeId
	]);
	const tabSwipe = createTabSwipe({
		onSwipeLeft: () => {
			const ids = TABS.map((t) => t.id);
			const i = ids.indexOf(tab);
			setTab(ids[(i + 1) % ids.length]);
		},
		onSwipeRight: () => {
			const ids = TABS.map((t) => t.id);
			const i = ids.indexOf(tab);
			setTab(ids[(i - 1 + ids.length) % ids.length]);
		}
	});
	const ageLabel = (0, import_react.useMemo)(() => {
		if (newestEventAgeMs == null) return "—";
		const m = Math.round(newestEventAgeMs / 6e4);
		if (m < 1) return "<1m";
		if (m < 60) return `${m}m`;
		return `${Math.round(m / 60)}h`;
	}, [newestEventAgeMs, ageTick]);
	const updatedLabel = (0, import_react.useMemo)(() => {
		if (!lastUpdate) return "—";
		const s = Math.round((Date.now() - lastUpdate) / 1e3);
		if (s < 60) return `${s}s ago`;
		return `${Math.round(s / 60)}m ago`;
	}, [lastUpdate, ageTick]);
	const filtersBlock = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3 p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				className: "mb-1 block text-[0.65rem] uppercase tracking-wider text-dim",
				children: "Time window"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "ww-seg ww-seg--compact flex flex-wrap",
				children: WINDOWS.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					title: w.title,
					onClick: () => setTimeWindow(w.id),
					className: `ww-seg__btn ${timeWindow === w.id ? "ww-seg__btn--on" : ""}`,
					children: w.label
				}, w.id))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mb-1 block text-[0.65rem] uppercase tracking-wider text-dim",
				children: [
					"Magnitude ",
					minMag.toFixed(1),
					" – ",
					maxMag >= 10 ? "10+" : maxMag.toFixed(1)
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "range",
				min: 2,
				max: 8,
				step: .5,
				value: minMag,
				onChange: (e) => setMinMag(Number(e.target.value)),
				className: "w-full accent-cyan-400"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "inline-flex items-center gap-1.5 text-[0.7rem] text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: useGeofon,
						onChange: (e) => setUseGeofon(e.target.checked)
					}), "GEOFON merge"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "inline-flex items-center gap-1.5 text-[0.7rem] text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: audioAlerts,
						onChange: (e) => setAudioAlerts(e.target.checked)
					}), "Audio M4.5+"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "ww-seg ww-seg--compact",
				children: ["2d", "3d"].map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: v === "3d" && mode !== "full",
					title: v === "3d" && mode !== "full" ? "Full mode for 3D globe" : void 0,
					onClick: () => setMapView(v),
					className: `ww-seg__btn uppercase ${mapView === v ? "ww-seg__btn--on" : ""}`,
					children: v
				}, v))
			})
		]
	});
	const eventsBlock = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2 p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuptContinuumStrip, { compact: true }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolcanoAlertsBar, { compact: true }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FocusedNodeCard, { features: filteredEq(eq?.features, minMag, maxMag) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NodeFocusPanel, { allFeatures: filteredEq(eq?.features, minMag, maxMag) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
				className: "text-[0.7rem] font-medium uppercase tracking-wider text-primary",
				children: [
					"Events (",
					features.length,
					")"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "scroll-thin max-h-[50vh] space-y-1 overflow-y-auto lg:max-h-none",
				children: [features.slice(0, 80).map((f) => {
					const [lon, lat] = f.geometry.coordinates;
					const mag = f.properties.mag ?? 0;
					const fid = String(f.id ?? `${lat},${lon},${f.properties.time ?? 0}`);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							setSelectedEventId(fid);
							pickEvent({
								id: fid,
								lat,
								lon,
								mag,
								place: f.properties.place || "Event",
								depth: f.geometry.coordinates[2] ?? 0,
								time: f.properties.time ?? null,
								url: f.properties.url
							});
							flyMapTo(lat, lon, 5, fid);
							setMobileSheet("closed");
							setToast(`${mag.toFixed(1)} · ${f.properties.place || "Event"}`);
							window.setTimeout(() => setToast(null), 2500);
						},
						onDoubleClick: () => antipodeOf(lat, lon),
						className: `flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-[0.7rem] ${selectedEventId === fid || pickedEvent?.id === fid ? "border-primary/50 bg-primary/10" : "border-border/60 bg-panel hover:bg-elevated"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full",
							style: { background: magColor(mag) }
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-semibold text-fg",
									children: ["M", mag.toFixed(1)]
								}),
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted",
									children: f.properties.place || "—"
								})
							]
						})]
					}) }, fid);
				}), !features.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "text-[0.7rem] text-dim",
					children: "No events in this filter window."
				})]
			})
		]
	});
	(0, import_react.useEffect)(() => {
		const onVolc = (e) => {
			const d = e.detail;
			if (d?.message) {
				setToast(d.message);
				window.setTimeout(() => setToast(null), 4500);
			}
		};
		window.addEventListener("ww-volc-watch", onVolc);
		return () => window.removeEventListener("ww-volc-watch", onVolc);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "ww-shell relative flex h-full max-h-full flex-col overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolcWatchSmart, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "ww-header shrink-0 border-b border-border bg-bg/95 backdrop-blur",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2 px-2 py-1.5 sm:px-4 sm:py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "truncate text-sm font-semibold tracking-tight text-fg sm:text-base",
							children: ["Sol-Earth ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-primary",
								children: "WolfWatch"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[0.58rem] text-dim sm:text-[0.62rem]",
							children: [
								"Sentinel · updated ",
								updatedLabel,
								" · newest ",
								ageLabel,
								livePulseAt ? " · live pulse" : "",
								liveStatus === "ws" ? " · WS" : liveStatus === "live" ? " · LIVE" : liveStatus === "paused" ? " · paused" : liveStatus === "offline" ? " · offline" : liveStatus === "polling" ? " · …" : ""
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex shrink-0 items-center gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ww-seg ww-seg--compact",
								role: "group",
								"aria-label": "Performance mode",
								children: [
									"lite",
									"standard",
									"full"
								].map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									title: MODES[m].description,
									onClick: () => setMode(m),
									className: `ww-seg__btn capitalize ${mode === m ? "ww-seg__btn--on" : ""}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ww-only-sm sm:hidden",
										children: m[0].toUpperCase()
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ww-only-lg hidden sm:inline",
										children: m
									})]
								}, m))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => void refresh(true),
								disabled: loading,
								className: "ww-btn ww-btn--icon ww-btn--compact",
								title: "Refresh data",
								"aria-label": "Refresh data",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `h-4 w-4 ${loading ? "animate-spin" : ""}` })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setAutoRefresh(!autoRefresh),
								className: `ww-btn ww-btn--icon ww-btn--compact ${autoRefresh ? "ww-btn--active" : ""}`,
								title: autoRefresh ? "Pause auto-refresh" : "Resume auto-refresh",
								"aria-pressed": autoRefresh,
								"aria-label": autoRefresh ? "Pause live updates" : "Resume live updates",
								children: autoRefresh ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "h-4 w-4" })
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "ww-tablist",
					role: "tablist",
					"aria-label": "Main sections",
					children: TABS.map(({ id, label, short, Icon }) => {
						const selected = tab === id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							role: "tab",
							id: `tab-${id}`,
							"aria-selected": selected,
							"aria-controls": `panel-${id}`,
							tabIndex: selected ? 0 : -1,
							onClick: () => setTab(id),
							className: `ww-tab ${selected ? "ww-tab--active" : ""}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
									className: "h-3.5 w-3.5 shrink-0",
									"aria-hidden": true
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ww-only-lg hidden sm:inline",
									children: label
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ww-only-sm sm:hidden",
									children: short
								})
							]
						}, id);
					})
				})]
			}),
			bootWait && !lastUpdate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "shrink-0 border-b border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold sm:px-4",
				role: "status",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-medium",
						children: "Loading live feeds…"
					}),
					" ",
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-danger",
						children: [
							"(",
							error,
							")"
						]
					}) : null,
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ml-2 underline",
						onClick: () => void refresh(true),
						children: "Retry now"
					})
				]
			}),
			error && !(scales || eq?.features?.length) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "shrink-0 border-b border-danger/30 bg-danger/10 px-3 py-1.5 text-xs text-danger sm:px-4",
				role: "alert",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OfflineBanner, {}),
			toast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-x-0 top-14 z-[800] flex justify-center px-3 sm:top-[4.5rem]",
				role: "status",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-auto max-w-[min(96vw,28rem)] rounded-full border border-primary/40 bg-bg/95 px-3 py-1.5 text-center text-[0.65rem] leading-snug text-primary shadow-lg backdrop-blur",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "line-clamp-2",
						children: toast
					})
				})
			}),
			tab !== "about" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "shrink-0 border-b border-border/60 px-2 py-1 sm:px-3 sm:py-1.5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TodayBriefBar, { dense: true })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "relative flex min-h-0 flex-1 flex-col overflow-hidden",
				onTouchStart: tabSwipe.onTouchStart,
				onTouchEnd: tabSwipe.onTouchEnd,
				onTouchCancel: tabSwipe.onTouchCancel,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						id: "panel-live",
						role: "tabpanel",
						"aria-labelledby": "tab-live",
						hidden: tab !== "live",
						className: "relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
							className: "ww-aside hidden min-h-0 w-[min(280px,28vw)] shrink-0 flex-col border-r border-border lg:flex",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "shrink-0 border-b border-border/80",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "px-3 pt-3 text-[0.7rem] font-medium uppercase tracking-wider text-primary",
									children: "Controls"
								}), filtersBlock]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain",
								children: eventsBlock
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative flex min-h-0 min-w-0 flex-1 flex-col",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "relative min-h-[52dvh] flex-1 lg:min-h-0",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "absolute inset-0 lg:inset-2.5 lg:overflow-hidden lg:rounded-lg",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientOnly, {
										fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex h-full min-h-[52dvh] flex-col items-center justify-center gap-2 bg-bg px-4 text-center text-sm text-muted",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Loading map…" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[0.7rem] text-dim",
												children: "Feeds bootstrap on first open — map appears as soon as the client mounts."
											})]
										}),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
											fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "flex h-full items-center justify-center text-sm text-muted",
												children: "Loading map…"
											}),
											children: mapView === "3d" && mode === "full" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe3D, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveMap, {})
										})
									})
								})
							}), mobileSheet !== "closed" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "absolute inset-x-0 bottom-0 z-[600] max-h-[min(55vh,calc(100%-4.5rem))] overflow-hidden rounded-t-xl border border-border bg-bg shadow-2xl lg:hidden",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between border-b border-border px-3 py-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-semibold text-fg",
										children: mobileSheet === "filters" ? "Filters" : "Events"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "ww-btn ww-btn--icon ww-btn--compact",
										onClick: () => setMobileSheet("closed"),
										"aria-label": "Close sheet",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "scroll-thin max-h-[48vh] overflow-y-auto",
									children: mobileSheet === "filters" ? filtersBlock : eventsBlock
								})]
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						id: "panel-solar",
						role: "tabpanel",
						"aria-labelledby": "tab-solar",
						hidden: tab !== "solar",
						className: "scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-4",
						children: tab === "solar" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpaceWeatherPanel, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						id: "panel-resonance",
						role: "tabpanel",
						"aria-labelledby": "tab-resonance",
						hidden: tab !== "resonance",
						className: "scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain",
						children: tab === "resonance" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResonancePanel, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						id: "panel-analytics",
						role: "tabpanel",
						"aria-labelledby": "tab-analytics",
						hidden: tab !== "analytics",
						className: "scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-4",
						children: tab === "analytics" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnalyticsCharts, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						id: "panel-about",
						role: "tabpanel",
						"aria-labelledby": "tab-about",
						hidden: tab !== "about",
						className: "scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6",
						children: tab === "about" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AboutPanel, {})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "ww-footer hidden shrink-0 border-t border-border px-3 py-1 text-[0.62rem] text-dim sm:flex sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "inline-flex items-center gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Earth, { className: "h-3 w-3" }), "Free public feeds · SUPT continuum · not a forecast product"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "inline-flex items-center gap-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { className: "h-3 w-3" }),
						"Mode ",
						mode,
						" · ",
						features.length,
						" events shown"
					]
				})]
			})
		]
	});
}
//#endregion
export { ObservatoryApp as component };
