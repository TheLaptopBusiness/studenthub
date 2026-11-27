// Message variations for the weekly touches, so students never get the same email or text twice in a row.
// Placeholders: {first} = first name, {link} = their check-in link, {focus} = this week's focus, {coach} = their coach's first name.
// Every message stays warm AND clear: it always says what to do and how long it takes.
//
// How one is picked: rotate by week, offset per student. Each student cycles through all of them before
// any repeats, and students don't all get the same one on the same day.

export const FRIDAY_EMAIL = [
  { subject: "{first}, we'd love to hear about your week", title: "How was your week?", button: "Tell us about your week",
    body: ["Happy Friday! We've been thinking about you this week, and before you head into the weekend we'd love to hear how it went.", "Tell us one win, big or small, and anything that's been hard. It takes about two minutes, and we read every reply ourselves."] },
  { subject: "Your Friday check-in is here, {first}", title: "Two minutes, one win.", button: "Share my week",
    body: ["It's Friday, which means it's time to look back on the week you just had.", "What went well? What got in the way? Tap the button, answer three quick questions, and we'll take it from there."] },
  { subject: "{first}, what's your win this week?", title: "Every win counts.", button: "Share my win",
    body: ["A listing, a sale, a form filed, a call made. Whatever you moved forward this week, we want to celebrate it with you.", "And if something slowed you down, tell us that too. That's exactly what we're here for."] },
  { subject: "Quick one before the weekend, {first}", title: "How did it go?", button: "Answer in 2 minutes",
    body: ["Before you switch off for the weekend, take two minutes to tell us how your week went.", "Your answers come straight to our team, and if you need a hand, we'll reach out."] },
  { subject: "We're proud of you, {first}. How was the week?", title: "Proud of you for showing up.", button: "Tell us how it went",
    body: ["Building a business alongside everything else in life isn't easy, and you showed up again this week.", "We'd love to hear what you got done and what's been tough. Three short questions, about two minutes."] },
  { subject: "{first}, your weekly check-in (2 minutes)", title: "Let's look back on your week.", button: "Start my check-in",
    body: ["Every Friday we ask every student the same three things: your win, how you're feeling, and what's in your way.", "It keeps us close to you, and it means we can help the moment something gets stuck."] },
  { subject: "How's the business feeling, {first}?", title: "Talk to us.", button: "Share my week",
    body: ["Some weeks fly, some weeks drag. Either way, we want to hear about yours.", "Tap below, tell us your win and anything that's been hard, and we'll read it today."] },
  { subject: "Happy Friday, {first}! One quick question", title: "What moved forward this week?", button: "Tell us",
    body: ["Happy Friday! We'd love to know what moved forward for you this week, even if it felt small.", "If anything is blocking you, mention it. One of us will get back to you personally."] },
  { subject: "{first}, a two-minute check-in from your coaches", title: "Checking in on you.", button: "Open my check-in",
    body: ["This isn't a test and there are no wrong answers. We just want to know how you're doing.", "Share your win, how you're feeling about the business, and anything that would help. We're listening."] },
  { subject: "Your win of the week, {first}?", title: "Wins deserve to be seen.", button: "Share my win",
    body: ["Too many wins go unnoticed. Not here. Tell us yours, and we'll celebrate it with you.", "Then tell us about anything that's been harder than it should be, so we can help you fix it."] },
  { subject: "{first}, how are you really doing?", title: "How are you, really?", button: "Tell us honestly",
    body: ["Behind every checklist is a real person juggling a lot. We want to know how you're actually doing.", "Two minutes, three questions. Honest answers help us help you."] },
  { subject: "Friday check-in time, {first}", title: "End the week strong.", button: "Do my check-in",
    body: ["Ending the week with a quick look back is one of the best habits you can build as a business owner.", "Tap below, note your win, flag anything that's in your way, and you're done."] },
  { subject: "{first}, we read every one of these", title: "We read every word.", button: "Share my week",
    body: ["Every Friday, our team reads every single check-in. Yours matters to us.", "Tell us your win and anything you're stuck on. If you'd like a call, just tick the box."] },
  { subject: "Little wins add up, {first}", title: "Small steps, big results.", button: "Tell us your win",
    body: ["The students who build five-figure months all got there one small step at a time.", "What was your step this week? Tell us in two minutes, along with anything that slowed you down."] },
  { subject: "{first}, before you log off for the weekend", title: "One last thing this week.", button: "Answer 3 questions",
    body: ["Before the weekend, give us a quick update: one win, how you're feeling, and anything in your way.", "It takes about two minutes, and it helps us plan how to support you next week."] },
  { subject: "Tell us about your week, {first}", title: "We want to hear from you.", button: "Share my week",
    body: ["Whether this week was a breakthrough or a struggle, we want to hear about it.", "Your coaches read these personally, and if something needs attention, we'll reach out."] },
  { subject: "{first}, a quick pulse check", title: "Quick pulse check.", button: "Check in now",
    body: ["Three quick questions so we know where you're at: your win, your mood, and anything blocking you.", "Tap the button. It works without signing in and takes about two minutes."] },
  { subject: "Celebrating you this Friday, {first}", title: "Let's celebrate your week.", button: "Share my win",
    body: ["Fridays are for celebrating progress. What's something you're glad you got done this week?", "If the week was rough, tell us that too. You don't have to figure it out alone."] },
  { subject: "{first}, how close are you to your next step?", title: "Where are you at?", button: "Update my coaches",
    body: ["We'd love a quick update on where you're at with your checklist and your listings.", "Share your win and anything that's in the way. We'll read it today and help where we can."] },
  { subject: "We've been thinking about you, {first}", title: "We've been thinking about you.", button: "Tell us how you are",
    body: ["We've been thinking about you this week, and we'd love to hear how it went.", "Two minutes is all it takes. Tell us your win and anything you need."] },
  { subject: "{first}, what went right this week?", title: "What went right?", button: "Tell us",
    body: ["It's easy to focus on what didn't happen. This week, start with what went right.", "Share your win, then tell us what would make next week easier. We're here to help."] },
  { subject: "Weekly check-in: your turn, {first}", title: "Your turn to share.", button: "Share my week",
    body: ["Every week we cheer on the students who share their wins. This week, we want to cheer for you.", "Tap below, tell us how it went, and flag anything you're stuck on."] },
  { subject: "{first}, two minutes for your future business", title: "Two minutes that matter.", button: "Start my check-in",
    body: ["Taking two minutes to reflect each week keeps you focused on what matters most.", "Tell us your win and what's in your way. We'll use it to help you have an even better week."] },
  { subject: "Don't keep your wins to yourself, {first}", title: "Share the good news.", button: "Share my win",
    body: ["Got a win this week? We want to hear it. Didn't feel like a win week? We want to hear that too.", "Three quick questions, about two minutes, read personally by your coaches."] }
];

// Only five direct button labels, used in rotation, so the action is always obvious.
export const CHECKIN_CTAS = ["Check in now", "Start my check-in", "Complete my check-in", "Share my week", "Do my check-in"];
FRIDAY_EMAIL.forEach((v, i) => { v.button = CHECKIN_CTAS[i % CHECKIN_CTAS.length]; });

export const FRIDAY_SMS = [
  "Happy Friday, {first}! We'd love to hear how your week went, the wins and the hard parts. 2 minutes: {link}",
  "Hi {first}! Friday check-in time. Tell us your win this week and anything in your way: {link}",
  "{first}, what's your win this week? Big or small, we want to celebrate it. Takes 2 minutes: {link}",
  "Before the weekend, {first}: how did your week go? Tap here and tell us (2 min): {link}",
  "Proud of you for showing up this week, {first}. Tell us how it went: {link}",
  "Hi {first}, it's check-in time. Quick one: your win + anything you're stuck on. {link}",
  "Happy Friday {first}! 3 quick questions so we know how to help you next week: {link}",
  "{first}, every win counts. What was yours this week? Share it here: {link}",
  "Friday check-in, {first}! One win, how you're feeling, and anything in your way. 2 min: {link}",
  "How are you really doing, {first}? We read every answer personally. {link}",
  "Hi {first}! Wrapping up the week: tell us what went well and what was tough. {link}",
  "{first}, your coaches want to hear from you. 2 minutes, 3 questions: {link}",
  "Small steps add up, {first}. What was your step this week? Tell us: {link}",
  "Happy Friday! {first}, quick favour: share your win of the week with us here: {link}",
  "{first}, anything slowing you down? Tell us in your Friday check-in and we'll help: {link}",
  "Hey {first}! Time for your weekly check-in. Tap the link, answer 3 questions, done: {link}",
  "{first}, we've been thinking about you this week. How did it go? {link}",
  "It's Friday, {first}! Celebrate a win with us and flag anything you need help with: {link}",
  "Hi {first}, 2-minute check-in from your coaches. Your answers go straight to us: {link}",
  "{first}, what went right this week? Tell us here (works without signing in): {link}",
  "Weekly check-in time, {first}! We'd love to cheer on your progress: {link}",
  "Before you log off for the weekend, {first}, tell us how your week went: {link}",
  "{first}, quick pulse check: your win, your mood, anything blocking you. {link}",
  "Happy Friday, {first}! Don't keep your wins to yourself. Share them here: {link}"
];

export const SUNDAY_NUDGE_SMS = [
  "Hi {first}, we missed hearing from you this week. How did it go? Even a one-line win makes our day: {link}",
  "{first}, there's still time for your weekly check-in. 2 minutes, and we read every word: {link}",
  "Hey {first}, how was your week? If anything's been hard, we want to help. {link}",
  "{first}, quick reminder: your check-in is waiting. One win and you're done: {link}",
  "Hi {first}! Before Monday, tell us how last week went. It helps us support you: {link}",
  "{first}, we'd love to hear from you before the new week starts. 2 minutes: {link}",
  "Thinking of you, {first}. How did the week go? Tap here to tell us: {link}",
  "{first}, no pressure, just care: how are things going with the business? {link}",
  "Hi {first}, a one-line update is perfect. What was your win this week? {link}",
  "{first}, your coaches haven't heard from you yet this week. All good? {link}",
  "Sunday check-in, {first}: how did the week go, and is anything in your way? {link}",
  "{first}, even a tough week is worth sharing. We're here for you: {link}"
];

export const MONDAY_EMAIL = [
  { subject: "New week, {first}. Let's crush it.", title: "New week. Let's crush it.",
    open: "Happy Monday, and welcome to a brand new week. Whatever last week looked like, this one is a fresh start, and we're right here with you." },
  { subject: "{first}, here's your focus for this week", title: "Your week starts now.",
    open: "Good morning! A new week is a new chance to move your business forward. Here's exactly where to put your energy." },
  { subject: "Monday momentum, {first}", title: "Let's build some momentum.",
    open: "The best weeks start with a clear plan. We've picked out your focus for the week so you can get straight to it." },
  { subject: "{first}, this could be your best week yet", title: "Make it your best week yet.",
    open: "Every student who reached five-figure months had a week where things clicked. Let's make this one of yours." },
  { subject: "Fresh week, fresh start, {first}", title: "Fresh week, fresh start.",
    open: "Monday is a clean slate. No matter how last week went, today is a great day to take the next step." },
  { subject: "{first}, we're in your corner this week", title: "We're in your corner.",
    open: "A new week, and we're right beside you. If anything gets in your way, comment on that step in your dashboard and we'll help." },
  { subject: "Good morning {first}! Your week at a glance", title: "Your week at a glance.",
    open: "Here's what matters most this week, so you don't have to think about what to do next. Just start with step one." },
  { subject: "{first}, one step at a time this week", title: "One step at a time.",
    open: "You don't have to do everything this week. Just the next thing. Here's what that is." },
  { subject: "Let's go, {first}! New week, new wins", title: "New week, new wins.",
    open: "Happy Monday! Let's stack up some wins this week. Here's your focus, picked from your checklist." },
  { subject: "{first}, small steps, big results", title: "Small steps, big results.",
    open: "Big results come from small steps taken consistently. Here's this week's small step, and it's one you can absolutely do." },
  { subject: "Your Monday kickoff, {first}", title: "It's kickoff time.",
    open: "Grab a coffee and give this one minute. Here's your focus for the week and where you stand." },
  { subject: "{first}, let's make progress you can feel", title: "Progress you can feel.",
    open: "By Friday, we want you to look back and feel proud of what you got done. Here's how to get there." },
  { subject: "Happy Monday, {first}. You've got this.", title: "You've got this.",
    open: "Starting something new takes courage, and you're doing it. Here's your focus for the week ahead." },
  { subject: "{first}, your plan for the week is ready", title: "Your plan is ready.",
    open: "We looked at your checklist so you don't have to. Here's exactly what to work on this week." },
  { subject: "New week, same goal, {first}", title: "Eyes on the goal.",
    open: "Every week brings you closer to a business that pays you every month. Here's this week's piece of the puzzle." },
  { subject: "{first}, start the week with one win", title: "Start with one win.",
    open: "The fastest way to build momentum is an early win. Pick the first item below and knock it out today." },
  { subject: "Monday check-in from your coaches, {first}", title: "We're cheering for you.",
    open: "Our whole team is cheering you on this week. Here's where to focus, and we're one comment away if you need us." },
  { subject: "{first}, let's keep the momentum going", title: "Keep it going.",
    open: "You've already come further than most people who think about starting. Let's keep going this week." },
  { subject: "A new week to build your business, {first}", title: "Build something real this week.",
    open: "Every step you tick off is a real piece of your business falling into place. Here's this week's step." },
  { subject: "{first}, here's what matters this week", title: "What matters this week.",
    open: "There's always more you could do. Here's what matters most right now, so you can ignore the rest." },
  { subject: "Rise and grind, {first}! (gently)", title: "Steady wins the race.",
    open: "No need for all-nighters. Steady, consistent progress is what builds this business. Here's this week's focus." },
  { subject: "{first}, your coaches picked your focus", title: "Your focus, picked for you.",
    open: "We've lined up the most important next steps for you this week, straight from your checklist." },
  { subject: "Hello Monday! {first}, let's do this", title: "Let's do this.",
    open: "A brand new week and a business to build. Here's where to start, and we're right here with you." },
  { subject: "{first}, this week's mission", title: "This week's mission.",
    open: "Your mission this week is simple and clear. Here it is, along with where you stand right now." }
];

export const MONDAY_CLOSE = [
  "Let's make it a great one.", "We're right here if you need us.", "You've got this.", "Proud of you. Let's go.",
  "One step at a time.", "Rooting for you this week.", "Let's make this week count.", "Go get it.",
  "We believe in you.", "Have a great week.", "Here's to a strong week.", "Let's build."
];

export const MONDAY_SMS = [
  "Happy Monday, {first}! New week, new wins. This week: {focus}. Let's crush it.",
  "Good morning {first}! Your focus this week: {focus}. One step at a time. We're with you.",
  "{first}, fresh week, fresh start. Start with: {focus}. You've got this!",
  "Monday kickoff, {first}! This week, focus on {focus}. Comment in your Hub if you get stuck.",
  "Hi {first}! Let's build some momentum this week: {focus}. Rooting for you.",
  "New week, {first}! Your next step: {focus}. Knock it out and tick it in your Hub.",
  "{first}, small steps, big results. This week's step: {focus}. Let's go!",
  "Happy Monday {first}! Here's what matters this week: {focus}. Proud of you.",
  "Good morning, {first}. Your coaches picked your focus: {focus}. You can do this.",
  "{first}, start the week with one win: {focus}. We're cheering for you!",
  "Hello Monday! {first}, this week: {focus}. Reply here if you need a hand.",
  "{first}, let's make this week count. Focus on {focus}. We're right here.",
  "Monday momentum, {first}! First up: {focus}. Have a great week.",
  "Hi {first}, your plan for the week is ready: {focus}. Let's crush it!",
  "{first}, this week's mission: {focus}. Simple and clear. You've got this.",
  "New week, same goal, {first}. Next step: {focus}. Let's keep going!",
  "Good morning {first}! Pick up where you left off: {focus}. We believe in you.",
  "{first}, one step at a time this week: {focus}. Go get it!",
  "Happy Monday {first}! Steady progress wins. This week: {focus}.",
  "{first}, your week at a glance: {focus}. Let's make it a strong one!",
  "Rise and shine, {first}! Focus this week: {focus}. We're in your corner.",
  "{first}, ready for a great week? Start with {focus}. Let's build!",
  "Hi {first}! Let's stack some wins this week, starting with {focus}.",
  "New week, {first}. Keep the momentum: {focus}. Rooting for you!"
];

// When a student has nothing left to do on the checklist (or is waiting on our team)
export const MONDAY_SMS_NOFOCUS = [
  "Happy Monday, {first}! New week, new wins. Open your Hub and let's keep building. Let's crush it.",
  "Good morning {first}! A fresh week to grow your business. We're right here with you.",
  "{first}, new week, new opportunities. Check your Hub for your next move. You've got this!",
  "Monday kickoff, {first}! Keep the momentum going this week. We're cheering for you."
];

const hash = s => { let h = 7; for (const c of String(s || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const weekNo = (d = new Date()) => Math.floor((d.getTime() / 864e5 + 3) / 7); // changes every Monday
/** Pick this week's variation for this student. */
export function pick(list, studentId, when = new Date()) {
  return list[(weekNo(when) + hash(studentId)) % list.length];
}
/** Fill {placeholders}. */
export function fill(text, vars) {
  return String(text).replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? String(vars[k]) : m);
}
