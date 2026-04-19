import { block } from "../_factory";
import type { BlockDefinition, BlockParamSpec } from "../types";

const DAY_MULTI: BlockParamSpec = {
  key: "days",
  label: "Active days",
  kind: "multiSelect",
  default: ["mon", "tue", "wed", "thu", "fri"],
  options: [
    { value: "mon", label: "Monday" },
    { value: "tue", label: "Tuesday" },
    { value: "wed", label: "Wednesday" },
    { value: "thu", label: "Thursday" },
    { value: "fri", label: "Friday" },
  ],
};

// ── Session Filters (8) ──────────────────────────────────────────────

export const SESSION_BLOCKS: BlockDefinition[] = [
  block({
    id: "session.customWindow",
    family: "session", subcategory: "hours", name: "Custom Hour Window",
    short: "Trade only between startHour and endHour (server time).",
    long: "A custom trading window. Respects server time — add an offset block upstream if your server is far from UTC.",
    userWhy: "The single most useful trading filter. Every strategy works better restricted to its native session.",
    plan: "free", priority: "P1", complexity: "basic",
    affects: ["filter"], tags: ["session", "hours"],
    params: [
      { key: "startHour", label: "Start hour (server)", kind: "integer", default: 8,
        validation: [{ kind: "required" }, { kind: "min", value: 0 }, { kind: "max", value: 23 }] },
      { key: "endHour", label: "End hour (server)", kind: "integer", default: 20,
        validation: [{ kind: "required" }, { kind: "min", value: 0 }, { kind: "max", value: 23 }] },
    ],
  }),
  block({
    id: "session.london",
    family: "session", subcategory: "preset", name: "London Session",
    short: "Trade during London hours (07:00–16:00 UTC).",
    long: "Convenience preset that hard-codes London trading hours. Offers a `utcOffset` parameter for brokers whose server time isn't UTC.",
    userWhy: "One click to restrict to London hours. Works beautifully for trend / breakout systems on majors.",
    plan: "free", priority: "P1", complexity: "basic",
    affects: ["filter"], tags: ["session", "london"],
    params: [
      { key: "utcOffset", label: "Server UTC offset (h)", kind: "integer", default: 0,
        validation: [{ kind: "min", value: -12 }, { kind: "max", value: 14 }] },
    ],
  }),
  block({
    id: "session.newYork",
    family: "session", subcategory: "preset", name: "New York Session",
    short: "Trade during New York hours (12:00–21:00 UTC).",
    plan: "free", priority: "P2", complexity: "basic",
    affects: ["filter"], tags: ["session", "newyork"],
    params: [
      { key: "utcOffset", label: "Server UTC offset (h)", kind: "integer", default: 0,
        validation: [{ kind: "min", value: -12 }, { kind: "max", value: 14 }] },
    ],
  }),
  block({
    id: "session.asia",
    family: "session", subcategory: "preset", name: "Asia Session",
    short: "Trade during Asia hours (23:00–08:00 UTC).",
    plan: "pro", priority: "P2", complexity: "basic",
    affects: ["filter"], tags: ["session", "asia"],
    params: [
      { key: "utcOffset", label: "Server UTC offset (h)", kind: "integer", default: 0,
        validation: [{ kind: "min", value: -12 }, { kind: "max", value: 14 }] },
    ],
  }),
  block({
    id: "session.overlap",
    family: "session", subcategory: "preset", name: "London / NY Overlap",
    short: "Trade only during 12:00–16:00 UTC overlap.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["filter"], tags: ["session", "overlap"],
    params: [
      { key: "utcOffset", label: "Server UTC offset (h)", kind: "integer", default: 0,
        validation: [{ kind: "min", value: -12 }, { kind: "max", value: 14 }] },
    ],
  }),
  block({
    id: "session.dayOfWeek",
    family: "session", subcategory: "day", name: "Day of Week",
    short: "Whitelist of weekdays.",
    plan: "free", priority: "P2", complexity: "basic",
    affects: ["filter"], tags: ["day-of-week"], params: [DAY_MULTI],
  }),
  block({
    id: "session.monthOfYear",
    family: "session", subcategory: "day", name: "Month of Year",
    short: "Whitelist of months.",
    plan: "pro", priority: "P3", complexity: "basic", status: "beta",
    affects: ["filter"], tags: ["month"],
    params: [
      { key: "months", label: "Active months", kind: "multiSelect", default: [1,2,3,4,5,6,7,8,9,10,11,12],
        options: [
          { value: 1, label: "Jan" }, { value: 2, label: "Feb" }, { value: 3, label: "Mar" },
          { value: 4, label: "Apr" }, { value: 5, label: "May" }, { value: 6, label: "Jun" },
          { value: 7, label: "Jul" }, { value: 8, label: "Aug" }, { value: 9, label: "Sep" },
          { value: 10, label: "Oct" }, { value: 11, label: "Nov" }, { value: 12, label: "Dec" },
        ] },
    ],
  }),
  block({
    id: "session.holidayCalendar",
    family: "session", subcategory: "event", name: "Holiday Calendar",
    short: "Block entries on known broker holidays.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "beta",
    affects: ["filter"], tags: ["holidays"], params: [],
  }),
];
