// Your team, from the TEAM setting:  "Moses Confidence=moses@yourdomain.com; Cynthia Nweze=cynthia@yourdomain.com; Abdi Hassan=abdi@yourdomain.com"
// Everyone in TEAM (and ADMIN_EMAILS) can open the coach dashboard and see every student.
// DEFAULT_OWNER = who new students are assigned to (default: the first person in TEAM).

export function team() {
  return String(process.env.TEAM || "")
    .split(/[;\n]/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const [name, email] = s.split("=").map(x => (x || "").trim());
      return { name, email: (email || "").toLowerCase() };
    })
    .filter(m => m.name);
}

export const teamNames = () => team().map(m => m.name);

export function teamName(email) {
  const e = String(email || "").toLowerCase();
  const m = team().find(x => x.email && x.email === e);
  return m ? m.name : (e ? e.split("@")[0] : "Team");
}

export function teamEmails() {
  const fromTeam = team().map(m => m.email).filter(Boolean);
  const fromAdmins = String(process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return [...new Set([...fromTeam, ...fromAdmins])];
}

export function defaultOwner() {
  return process.env.DEFAULT_OWNER || coachNames()[0];
}

/** The person who handles at-risk students (default: the last name in TEAM, or Abdi Hassan). */
export function escalationName() {
  return process.env.ESCALATION_NAME || "Abdi Hassan";
}

/** The coaches students see (STUDENT_COACHES, comma-separated; default Moses Confidence and Cynthia Nweze).
    Everyone in TEAM has the same access; only these names are shown to students. */
export function coachNames() {
  const v = String(process.env.STUDENT_COACHES || "Moses Confidence, Cynthia Nweze").split(",").map(s => s.trim()).filter(Boolean);
  return v.length ? v : ["Moses Confidence", "Cynthia Nweze"];
}
/** How an author's name appears to a student: coaches by name, anyone else on the team as "Your coaching team". */
export function shownToStudent(author) {
  const team = teamNames();
  if (coachNames().includes(author)) return author;
  if (team.includes(author) || author === "Abdi Hassan") return "Your coaching team";
  return author;
}
/** A student's coach (their owner if they're a coach, otherwise the first coach). */
export function coachFor(student) {
  const c = coachNames();
  return c.includes(student && student.owner) ? student.owner : c[0];
}
/** Sign-off used in emails and texts, e.g. "Moses and Cynthia". */
export const signoff = () => coachNames().map(n => n.split(/\s+/)[0]).join(" and ");
