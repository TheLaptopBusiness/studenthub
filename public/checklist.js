// The Laptop Business Mastery enrollment checklist: template, due dates, stages and progress.
// Edit TEMPLATE to change the checklist for NEW students (existing students keep the items they were given;
// new keys you add are added to existing students the next time their dashboard loads).

export const SECTIONS = [
  { n: 1, title: "Welcome" },
  { n: 2, title: "Business name + domain" },
  { n: 3, title: "Legal setup" },
  { n: 4, title: "Logo + website" },
  { n: 5, title: "eBay + Facebook Marketplace" },
  { n: 6, title: "Sourcing prep" }
];

// due: {days:n} = n days after enrollment · {after:key, bizDays:n} or {after:key, days:n} = after that item is done
// input: what the student types when ticking (saved to their profile where `field` is set)
export const TEMPLATE = [
  { key: "intro", section: 1, by: "student", due: { days: 1 }, title: "Post your introduction in the Skool group",
    help: "Name, location and your goal. Start connecting with the group." },
  { key: "partner", section: 1, by: "student", due: { days: 7 }, title: "Find an accountability partner",
    help: "Someone at a similar stage. Check in with each other weekly.", input: { type: "text", label: "Your partner's name", field: "partner", required: true } },

  { key: "name", section: 2, by: "student", due: { days: 2 }, title: "Confirm your business name is available",
    help: "Google it AND search your state's LLC registry to make sure no one else is using it.", input: { type: "text", label: "Business name", field: "business_name", required: true } },
  { key: "domain", section: 2, by: "student", due: { days: 3 }, title: "Buy your domain on Namecheap",
    help: ".com first; if taken, try .co or .net. About $11/year.", input: { type: "text", label: "Your domain (e.g. mybusiness.com)", field: "domain", required: true } },
  { key: "brand_form", section: 2, by: "student", due: { days: 3 }, title: "Fill out the brand survey",
    help: "Your verified business name, your colours, and the contact details you want on your website. Our team designs your logo and builds your website from it. This ticks itself when you send it.", input: { type: "survey", label: "Brand survey" } },

  { key: "llc", section: 3, by: "student", due: { days: 7 }, title: "Register your LLC",
    help: "Google \"[your state] LLC registration\" to find your state's filing page." },
  { key: "ein", section: 3, by: "student", due: { days: 9 }, title: "Get your EIN",
    help: "Free from the IRS website, usually in minutes. Your bank and eBay will ask for it." },
  { key: "bank", section: 3, by: "student", due: { days: 12 }, title: "Open a business bank account",
    help: "Keep business money completely separate from personal." },
  { key: "permit", section: 3, by: "student", due: { days: 14 }, title: "Apply for your reseller's permit",
    help: "Removes sales tax when buying inventory for resale. Saves you real money." },
  { key: "insurance", section: 3, by: "student", due: { days: 21 }, title: "Get commercial insurance",
    help: "At least $1M coverage, about $30/month." },

  { key: "logo", section: 4, by: "team", due: { after: "brand_form", bizDays: 5 }, title: "Logo delivered",
    help: "Our team designs your logo from your brand form.", input: { type: "url", label: "Link to the logo files", field: "logo_url" } },
  { key: "logo_ok", section: 4, by: "student", due: { after: "logo", days: 2 }, title: "Approve your logo",
    help: "Happy with it? Tick this. Want changes? Leave a comment and we'll revise it." },
  { key: "website", section: 4, by: "team", due: { after: "logo_ok", bizDays: 5 }, title: "Website built, domain connected",
    help: "Our team builds your new website on your domain, using your logo and brand survey.", input: { type: "url", label: "Website link", field: "website_url" } },
  { key: "website_ok", section: 4, by: "student", due: { after: "website", days: 2 }, title: "Approve your website",
    help: "Check it on your phone and computer. Tick it if you're happy, or comment with changes." },

  { key: "ebay", section: 5, by: "student", due: { days: 12 }, title: "Create your eBay seller account",
    help: "Register under your business name, not your personal name." },
  { key: "ebay_bank", section: 5, by: "student", due: { days: 14 }, title: "Connect your business bank account to eBay",
    help: "All payouts go to the business account only." },
  { key: "facebook", section: 5, by: "student", due: { days: 14 }, title: "Get Facebook Marketplace ready to sell",
    help: "Complete your Facebook profile and open Marketplace. Every laptop you list on eBay also goes on Facebook Marketplace." },

  { key: "tier", section: 6, by: "student", due: { days: 21 }, title: "Choose your starting tier",
    help: "Low ($100 units) / Mid ($500–600, recommended) / High ($700+).", input: { type: "choice", label: "Tier", field: "tier", options: ["Low", "Mid", "High"], required: true } },
  { key: "focus_brand", section: 6, by: "student", due: { days: 21 }, title: "Choose ONE brand to master",
    help: "HP, Dell or Lenovo. Commit to 50 units of that brand before touching anything else.", input: { type: "choice", label: "Brand", field: "focus_brand", options: ["HP", "Dell", "Lenovo"], required: true } },
  { key: "goal", section: 6, by: "student", due: { days: 21 }, title: "Set your monthly revenue goal",
    help: "Pick a number between $5,000 and $10,000 and commit to it.", input: { type: "money", label: "Monthly revenue goal ($)", field: "monthly_goal", required: true } },
  { key: "unit_target", section: 6, by: "student", due: { days: 21 }, title: "Confirm your weekly unit target",
    help: "We work it out from your goal and tier: goal ÷ price per laptop ÷ 4.3 weeks.", input: { type: "number", label: "Laptops per week", field: "weekly_unit_target", required: true } }
];

export const TIER_PRICE = { Low: 100, Mid: 550, High: 750 };
/** Weekly unit target from monthly goal and tier, rounded up. */
export function unitTarget(goal, tier) {
  const g = Number(goal), p = TIER_PRICE[tier];
  if (!(g > 0) || !p) return null;
  return Math.ceil(g / p / 4.33);
}

const DAY = 864e5;
function addBizDays(ms, n) {
  const d = new Date(ms);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d.getTime();
}

/** Due date (ISO) for one item, or null when it's waiting on an earlier step. */
export function dueFor(item, byKey, enrolledAt) {
  if (item.due_override) return item.due_override;
  const t = TEMPLATE.find(x => x.key === item.key);
  const rule = t ? t.due : null;
  if (!rule) return null;
  if (rule.days != null && !rule.after) return new Date(Date.parse(enrolledAt) + rule.days * DAY).toISOString();
  const pred = byKey[rule.after];
  if (!pred || !pred.done || !pred.done_at) return null;
  const from = Date.parse(pred.done_at);
  return new Date(rule.bizDays ? addBizDays(from, rule.bizDays) : from + (rule.days || 0) * DAY).toISOString();
}

/** Everything about a student's checklist, computed in one place (used by the Hub, the team view and reminders). */
export function summarize(student, items, now = Date.now()) {
  const byKey = Object.fromEntries(items.map(i => [i.key, i]));
  const enrolled = student.created_at || new Date(now).toISOString();
  const order = Object.fromEntries(TEMPLATE.map((t, i) => [t.key, i]));
  const list = items
    .filter(i => order[i.key] != null)
    .sort((a, b) => order[a.key] - order[b.key])
    .map(i => {
      const t = TEMPLATE[order[i.key]];
      const due = i.done ? null : dueFor(i, byKey, enrolled);
      const overdueDays = due ? Math.floor((now - Date.parse(due)) / DAY) : -1;
      const waitingOn = !i.done && t.due.after && !(byKey[t.due.after] && byKey[t.due.after].done) ? t.due.after : null;
      return {
        id: i.id, key: i.key, section: t.section, by: t.by, title: t.title, help: t.help, input: t.input || null, link: t.link || null,
        value: i.value || "", done: !!i.done, done_at: i.done_at || null, done_by_name: i.done_by_name || "",
        due, overdue: !i.done && due != null && now > Date.parse(due), overdue_days: Math.max(0, overdueDays),
        waiting_on: waitingOn, awaiting_reply: !!i.awaiting_reply, comment_count: i.comment_count || 0
      };
    });
  const sections = SECTIONS.map(s => {
    const its = list.filter(i => i.section === s.n);
    const done = its.filter(i => i.done).length;
    const overdue = its.some(i => i.overdue);
    const status = done === its.length ? "complete" : overdue ? "attention" : done > 0 ? "progress" : "not_started";
    return { ...s, total: its.length, done, status };
  });
  const total = list.length, done = list.filter(i => i.done).length;
  const foundationsDone = list.filter(i => i.section <= 5).every(i => i.done);
  const allDone = total > 0 && done === total;
  const lastActive = [student.last_active_at, student.last_activity_at].filter(Boolean).sort().pop() || null;
  const quietDays = Math.floor((now - Date.parse(lastActive || enrolled)) / DAY);
  let stage = !student.last_active_at ? "Enrolled" : allDone ? "Ready to buy" : foundationsDone ? "Sourcing prep" : "Foundations";
  const atRisk = quietDays >= 14;
  const nextItem = list.find(i => !i.done && i.by === "student" && !i.waiting_on) || list.find(i => !i.done) || null;
  return {
    items: list, sections, total, done, percent: total ? Math.round(done / total * 100) : 0,
    stage, at_risk: atRisk, quiet_days: quietDays,
    overdue: list.filter(i => i.overdue).length,
    overdue_team: list.filter(i => i.overdue && i.by === "team").length,
    awaiting_reply: list.filter(i => i.awaiting_reply).length,
    next: nextItem ? { key: nextItem.key, title: nextItem.title, due: nextItem.due, by: nextItem.by } : null,
    gate_open: allDone
  };
}

export const sectionTitle = n => (SECTIONS.find(s => s.n === n) || {}).title || "";

/** Text for the congratulations message when a section is complete. */
export function sectionCongrats(n, s) {
  const first = String(s.name || "").trim().split(/\s+/)[0] || "there";
  const goal = Number(s.monthly_goal) ? "$" + Number(s.monthly_goal).toLocaleString("en-US") : "your goal";
  return ({
    1: `${first}, you're officially in. Intro posted, partner found. Next: lock in your business name and domain.`,
    2: `${s.business_name || "Your business"} is real now! Domain secured and brand survey in, so our team has started on your logo. Next: Legal setup.`,
    3: `Legal Setup DONE, ${first}. That's the part most people put off. Your business is official.`,
    4: `Your logo and website are live, ${first}. ${s.business_name || "Your business"} looks the part. Go share it!`,
    5: `eBay and Facebook Marketplace are ready, ${first}. Every laptop you list goes on both.`,
    6: `Goal set: ${goal}/month = ${s.weekly_unit_target || "your"} laptops a week. Your plan is locked in, ${first}.`
  })[n] || `${first}, you finished ${sectionTitle(n)}!`;
}
