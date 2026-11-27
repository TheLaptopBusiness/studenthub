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
/** The one coach students see by name, in the dashboard only (STUDENT_COACH, default Moses Confidence).
    Owners (coachNames) are for the team's own organising; students never see other team names. */
export const studentCoach = () => process.env.STUDENT_COACH || "Moses Confidence";
/** How an author's name appears to a student in the dashboard: the student coach by name, anyone else on the team as "Your coaching team". */
export function shownToStudent(author) {
  if (author === studentCoach()) return author;
  if (teamNames().includes(author) || author === "Abdi Hassan") return "Your coaching team";
  return author;
}
/** The coach shown to a student (always the student coach). */
export function coachFor() { return studentCoach(); }
/** Every email and text is signed by Abdi Hassan. */
export const signoff = () => "Abdi Hassan";
