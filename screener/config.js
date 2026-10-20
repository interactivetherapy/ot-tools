/* ITS OT Developmental Screener — CONFIG (all lists live here so a clinic-settings screen can edit them later). */
const A = "All";
const CONFIG = {
  version: "1.0",
  practice: "Interactive Therapy Solutions",
  logoDataUrl: null, // optional data: URL override (the standalone build fills this in)
  logo: "icons/logo.png", // horizontal practice logo for printed headers: replace this file to change it
  logoBadge: "icons/logo-badge.png", // round badge for the small app bar
  contact: { name: "Interactive Therapy Solutions", address: "909 North Miami Beach Blvd, Ste 503, North Miami Beach, FL 33162", phone: "786-805-6454", fax: "800-397-0061", email: "rehab@yourtherapyhome.com" },
  titles: {
    screener: "Occupational Therapy (OT) Developmental Screener",
    summary: "Occupational Therapy (OT) Developmental Screener: Results Summary",
    clinician: "Occupational Therapy (OT) Developmental Screener: Clinician Copy"
  },
  bands: [
    { id: 0, label: "0–3" }, { id: 1, label: "3–5" }, { id: 2, label: "6–12" }, { id: 3, label: "13–18" }
  ],
  scales: {
    perf: [
      { k: "I", l: "Independent", tone: "ok" }, { k: "E", l: "Emerging", tone: "mid" },
      { k: "NS", l: "Needs support", tone: "flag" }, { k: "NO", l: "Not observed", tone: "neu" }, { k: "NA", l: "N/A", tone: "neu" }
    ],
    freq: [
      { k: "N", l: "Never" }, { k: "R", l: "Rarely" }, { k: "S", l: "Sometimes" }, { k: "O", l: "Often" }, { k: "A", l: "Always" }
    ],
    behFreq: [{ k: "R", l: "Rarely" }, { k: "S", l: "Sometimes" }, { k: "O", l: "Often" }, { k: "A", l: "Always" }],
    prompt: [
      { k: "", l: "Prompt level…" }, { k: "I", l: "Independent" }, { k: "G", l: "Gestural" }, { k: "V", l: "Verbal" },
      { k: "Vis", l: "Visual" }, { k: "M", l: "Model" }, { k: "PP", l: "Partial physical" }, { k: "FP", l: "Full physical" }
    ]
  },
  settings: [
    { k: "clinic", l: "Clinic", focus: ["s4", "s5", "s6"] },
    { k: "home", l: "Home", focus: ["s7", "s8", "s13"] },
    { k: "school", l: "School", focus: ["s4", "s11", "s12"] },
    { k: "telehealth", l: "Telehealth", focus: ["s2", "s7", "s8"] }
  ],
  informants: [
    { k: "P", l: "Parent" }, { k: "T", l: "Teacher" }, { k: "X", l: "Other" }, { k: "O", l: "Clinician observation" }
  ],
  srcShort: { O: "Observed", P: "Parent/Caregiver", T: "Teacher" },
  itemSources: ["O", "P", "T"],
  routines: ["Morning routine", "Mealtimes", "Dressing", "Bath / hygiene", "Toileting", "Bedtime / sleep",
    "School work", "Play / peers", "Transitions", "Community outings", "Car / travel"],
  // ---- 15 sections (mirrors ITS_OT_Screener.pdf v2) ----
  sections: [
    { id: "s1", n: 1, title: "Client & Interview", header: true },
    { id: "s2", n: 2, title: "Caregiver Priorities", sub: "Top 3 · rank 1 = most important", blocks: [{ t: "prio" }] },
    { id: "s3", n: 3, title: "Medical & Developmental History · Services", blocks: [
      { t: "opts", id: "birth", label: "Birth", opts: ["Full term", "Preterm (<37 wk)", "NICU stay", "Not known"], multi: true },
      { t: "opts", id: "miles", label: "Milestones late", opts: ["None", "Sitting", "Crawling", "Walking", "First words", "Toilet training"], multi: true, none: "None" },
      { t: "opts", id: "dx", label: "Diagnoses", opts: ["None", "ASD", "ADHD", "DCD", "CP", "Genetic"], multi: true, none: "None" },
      { t: "opts", id: "vh", label: "Vision / hearing", opts: ["Passed screen", "Glasses", "Failed / referred screen", "Not screened", "Hearing aids / concern"], multi: true },
      { t: "opts", id: "svcNow", label: "Services now", opts: ["None", "OT", "PT", "SLP", "ABA", "EI", "IEP", "504", "Feeding"], multi: true, none: "None" },
      { t: "opts", id: "svcPast", label: "Services past", opts: ["None", "OT", "PT", "SLP", "ABA", "EI", "IEP", "504", "Feeding"], multi: true, none: "None" },
      { t: "text", id: "meds", label: "Medications / allergies / precautions (optional)" }
    ] },
    { id: "s4", n: 4, title: "Fine Motor / Visual-Motor", dom: "FM", blocks: [
      { t: "opts", id: "grasp", label: "Grasp on tool", opts: [
        { l: "Palmar (~1–1½y)", lvl: 0, desc: "a fisted (palmar) grasp" }, { l: "Digital-pronate (~2–3y)", lvl: 0, desc: "a fingers-down (digital-pronate) grasp" }, { l: "Static tripod/quad (~3½–4y)", lvl: 1, desc: "a static tripod grasp" },
        { l: "Dynamic tripod/quad (~4–6y)", lvl: 1 }, { l: "Lateral / thumb-wrap", lvl: null }] },
      { t: "opts", id: "hand", label: "Hand used most", opts: ["Right", "Left", "Switches (common to ~4–6y)", "Not yet clear"] },
      { t: "perf", items: [
        { id: "fm1", do: "pick up small items with a fingertip pinch", impact: "picking up small foods and toys", l: "Picks up small items with fingertip pincer (~9–12 mo)", r: "0–3", lvl: 0 },
        { id: "fm2", do: "release items into a container, stack blocks, and turn pages", impact: "block and book play", l: "Releases into container; stacks blocks (2 cubes ~15 mo); turns pages", r: "0–3", lvl: 0 },
        { id: "fm3", do: "use both hands together (holding paper, opening lids, stringing beads)", impact: "two-handed tasks", l: "Uses both hands together (stabilizes paper, opens lids, strings beads)", r: A, lvl: 1 },
        { id: "fm4", do: "cut along a line with scissors", impact: "cutting", l: "Scissors: snips (~2½–3y) → straight line (~4y) → circle (~5–6y)", r: "3–12", lvl: 1 },
        { id: "fm5", do: "write their name with readable size and spacing", impact: "handwriting", l: "Writes name (~5y); legible size / spacing (reversals OK to ~7y)", r: "3–18", lvl: 1 },
        { id: "fm6", do: "keep up with written or copied work", impact: "classroom tabletop work", l: "Keeps up with written / copied work or keyboarding", r: "6–18", lvl: 2 }
      ] },
      { t: "opts", id: "shapes", label: "Copies shapes (from a model, no demo)", multi: true, opts: [
        { l: "Vertical (~2–3y)", lvl: 0 }, { l: "Horizontal (~2–3y)", lvl: 0 }, { l: "Circle (~3y)", lvl: 1 }, { l: "Cross (~4y)", lvl: 1 },
        { l: "Square (~5y)", lvl: 1 }, { l: "Triangle (~5y)", lvl: 1 }, { l: "Diamond (~6–7y)", lvl: 2 }] },
      { t: "note", text: "Copy = drawn from a model with no demonstration; if a demo was needed, note it as imitation. Order follows typical development / Beery VMI." },
      { t: "text", id: "fmNote", label: "Note (optional)" }
    ] },
    { id: "s5", n: 5, title: "Gross Motor, Postural Control & Mobility", dom: "GM", blocks: [
      { t: "perf", items: [
        { id: "gm1", do: "roll, sit, and crawl or pull to stand", impact: "floor play and moving around", l: "Infant: rolls ~4–6 mo · sits ~6–8 mo · crawls / pulls up ~8–10 mo", r: "0–3", lvl: 0 },
        { id: "gm2", do: "walk and run while keeping up with peers", impact: "keeping up with peers", l: "Walks (by ~12–18 mo) / runs; keeps up with peers", r: A, lvl: 0 },
        { id: "gm3", do: "use stairs with alternating feet", impact: "moving safely on stairs", l: "Stairs: alternates feet up (~3y) / down (~4y); rail use", r: "3–18", lvl: 1 },
        { id: "gm4", do: "jump, hop, and skip", impact: "playground games", l: "Jumps 2 feet (~2y) · hops (~4y) · skips (~5–6y)", r: "0–12", lvl: 0 },
        { id: "gm5", do: "throw, catch, and kick a ball", impact: "ball games and PE", l: "Ball skills: throws, catches large ball (~3–4y), kicks", r: "3–12", lvl: 1 },
        { id: "gm6", do: "balance on one foot", impact: "balance during dressing and play", l: "Single-leg stance R / L (brief at 3y; ~10 s by ~6y)", r: "3–18", lvl: 1 },
        { id: "gm7", do: "sit upright at the table or on the floor without leaning", impact: "sitting for tabletop work", l: "Sits upright at table / floor without leaning", r: A, lvl: 0 }
      ] },
      { t: "opts", id: "gmSeen", label: "Also seen", multi: true, opts: ["Toe walking", "W-sitting", "Leans on arm/table", "Stops to rest before peers", "Orthotics"] },
      { t: "opts", id: "neuroM", label: "Neurology trigger (discuss with pediatrician / neurology)", multi: true, opts: [
        "Changes in movement: one-sided weakness, very low or high muscle tone, or new or increasing falls"] },
      { t: "opts", id: "wc", label: "Wheelchair / mobility device", opts: ["No", "Yes — manual", "Yes — power", "Walker / gait trainer", "Adaptive stroller"] },
      { t: "opts", id: "wcFlags", label: "If yes: flags", multi: true, showIf: s => (s.opts.wc || []).some(v => v !== "No"),
        opts: ["Self-propels", "Needs push", "Transfers need assist", "Seating/posture", "Skin/pressure", "Outgrown/fit", "Brakes/belt"] }
    ] },
    { id: "s6", n: 6, title: "Sensory Responses", sub: "How often · oral seeking → Feeding", dom: "SENS", blocks: [
      { t: "freq", items: [
        { id: "se1", obs: "pull away from touch, remove clothing tags, or avoid messy play", impact: "dressing and messy play", l: "Pulls away from touch; removes tags; avoids messy play", sys: "Tactile" },
        { id: "se2", obs: "cover ears or leave the area when noise increases", impact: "time in busy, noisy settings", l: "Covers ears or leaves area when noise increases", sys: "Auditory" },
        { id: "se3", obs: "look away from tasks when people move nearby", impact: "staying with tasks in busy rooms", l: "Looks away from task when people move nearby", sys: "Visual" },
        { id: "se4", obs: "seek spinning, swinging, or jumping", impact: "staying seated for tasks", l: "Initiates spinning, swinging, jumping", sys: "Vestibular" },
        { id: "se5", obs: "cry or cling when feet leave the ground", impact: "playground play", l: "Cries / clings when feet leave ground (swing, slide)", sys: "Vestibular" },
        { id: "se6", obs: "crash, push, or use more force than needed", impact: "safe play with peers", l: "Crashes, pushes, uses more force than needed", sys: "Proprioceptive" },
        { id: "se7", obs: "not respond to name, bumps, or scrapes until repeated", impact: "responding to directions", l: "No response to name, bumps, scrapes until repeated", sys: "Registration" }
      ] }
    ] },
    { id: "s7", n: 7, title: "ADL / Self-Care & Sleep", sub: "Prompt level if known", dom: "ADL", blocks: [
      { t: "perf", prompt: true, items: [
        { id: "ad1", do: "use a spoon, fork, and open cup", impact: "mealtimes", l: "Eating: spoon (~18 mo), fork (~2–3y), open cup (~2y)", r: A, lvl: 0 },
        { id: "ad2", do: "take off and put on clothing", impact: "getting dressed", l: "Dressing: takes off (~2y) / puts on (~4y); front–back", r: A, lvl: 0 },
        { id: "ad3", do: "manage buttons, zippers, and laces", impact: "getting ready in the morning", l: "Fasteners: buttons (~4y), zipper (~4–5y), laces (~6–7y)", r: "3–12", lvl: 1 },
        { id: "ad4", do: "manage toileting (signaling, clothing, wiping)", impact: "toileting at home and school", l: "Toileting: signals, clothes, wipes (trained ~2½–4y)", r: "0–12", lvl: 0 },
        { id: "ad5", do: "complete handwashing, toothbrushing, and bathing", impact: "hygiene routines", l: "Hygiene: hands, teeth, bath / hair", r: A, lvl: 1 },
        { id: "ad6", do: "manage meals, money, schedules, and appointments", impact: "independence at home and in the community", l: "IADL (teen): meals, money, schedule, meds / appointments", r: "13–18", lvl: 3 }
      ] },
      { t: "sel", id: "sleepWake", label: "Night wakings", opts: ["", "None", "1 per night", "2–3 per night", "4+ per night"] },
      { t: "sel", id: "sleepAlone", label: "Falls asleep alone", opts: ["", "Yes", "With adult present", "No"] }
    ] },
    { id: "s8", n: 8, title: "Feeding & Oral-Sensory", sub: "Report · utensil / cup skills → ADL", dom: "FEED", blocks: [
      { t: "sel", id: "foods", label: "Foods accepted (count)", opts: ["", "Fewer than 10", "10–19", "20–30", "More than 30"] },
      { t: "sel", id: "meal", label: "Typical meal length", opts: ["", "Under 10 min", "10–20 min", "20–30 min", "Over 30 min"] },
      { t: "opts", id: "refuses", label: "Refuses", multi: true, opts: ["Mixed textures", "Purées / wet", "Crunchy / hard", "Meats / proteins", "Fruits", "Vegetables", "Drops foods once eaten"] },
      { t: "freq", items: [
        { id: "fe1", obs: "gag or vomit with certain foods or textures", impact: "trying new foods", l: "Gags or vomits with certain foods / textures (not illness)" },
        { id: "fe2", obs: "cough, choke, or have a wet voice when eating or drinking", impact: "safe eating and drinking", l: "Coughs, chokes, or wet / gurgly voice with liquids or solids" },
        { id: "fe3", obs: "hold food in the cheeks, overstuff, or swallow without chewing", impact: "safe eating", l: "Holds food in cheeks, overstuffs, or swallows without chewing" },
        { id: "fe4", obs: "mouth or chew non-food items", impact: "hygiene and attention to tasks", l: "Mouths / chews non-food items (hands, clothing, toys)" },
        { id: "fe5", obs: "leave the table, cry, or push food away at meals", impact: "family mealtimes", l: "Leaves table, cries, or pushes food away at meals" }
      ] },
      { t: "opts", id: "growth", label: "Growth / medical", multi: true, none: "None reported",
        opts: ["None reported", "Weight / growth concern (MD)", "Tube feeding now/past", "Reflux / vomiting", "Constipation", "Special diet"] },
      { t: "note", text: "Flags: any cough / choke / wet voice → Feeding team / swallow study + SLP · growth concern, <20 foods, or food groups refused → GI / dietitian." }
    ] },
    { id: "s9", n: 9, title: "Adaptive Areas — Brief Screen", sub: "Caregiver / teacher report · not a Vineland-3 administration", dom: "ADAPT", blocks: [
      { t: "perf", items: [
        { id: "aa1", do: "request or tell needs (words, signs, or AAC)", impact: "sharing wants and needs", lang: "expressive language", l: "Requests / tells needs (words, signs, AAC)", r: A, lvl: 0, area: "Comm", comm: true },
        { id: "aa4", do: "follow 1–2 step directions", impact: "following daily routines", lang: "receptive language", l: "Follows 1–2 step directions (1-step ~1–2y; 2-step ~2–3y)", r: "0–5", lvl: 0, area: "Comm", comm: true },
        { id: "aa5", do: "use words, phrases, or sentences expected for age", impact: "communicating with others", lang: "expressive language", l: "Uses words / phrases / sentences for age (words ~1y; 2-word phrases ~2y; sentences ~3y+)", r: "0–5", lvl: 0, area: "Comm", comm: true },
        { id: "aa6", do: "be understood by unfamiliar people", impact: "communicating with new people", lang: "speech clarity", l: "Understood by unfamiliar people (about half ~2y; most ~3y; nearly all ~4y+)", r: "0–12", lvl: 1, area: "Comm", comm: true },
        { id: "aa7", do: "take turns in back-and-forth conversation", impact: "conversations with peers", lang: "conversation skills", l: "Back-and-forth conversation: takes turns, stays on topic (~3–4y+)", r: "3–18", lvl: 1, area: "Comm", comm: true },
        { id: "aa2", do: "help with home routines and chores", impact: "taking part in home routines", l: "Home routines & chores (tidy, set table)", r: "3–18", lvl: 1, area: "DLS" },
        { id: "aa3", do: "follow community safety rules and use money and time", impact: "community outings", l: "Community: safety rules, money, time, address", r: "6–18", lvl: 2, area: "DLS-Comm" }
      ] }
    ] },
    { id: "s10", n: 10, title: "Play & Leisure", dom: "PLAY", blocks: [
      { t: "opts", id: "play", label: "Play seen / reported", multi: true, opts: ["Exploratory", "Functional toy use", "Constructive", "Pretend (~2y+)", "Rule games (~5y+)", "Sports / clubs", "Mostly screens"] },
      { t: "sel", id: "playMin", label: "Longest on one activity", opts: ["", "Under 2 min", "2–5 min", "5–15 min", "Over 15 min"] },
      { t: "opts", id: "playWith", label: "Plays with", multi: true, opts: ["Alone", "Siblings", "Peers", "Adults"] }
    ] },
    { id: "s11", n: 11, title: "School / Executive Function", sub: "How often · caregiver / teacher report", dom: "SCHOOL", blocks: [
      { t: "opts", id: "supports", label: "Classroom supports in place", multi: true, none: "None", opts: ["None", "IEP", "504", "Aide / para", "Preferential seating", "Extra time", "Not in school yet"] },
      { t: "freq", pos: true, items: [
        { id: "ef1", obs: "start tasks within about a minute of a direction", impact: "starting classwork", l: "Starts task within ~1 min of direction" },
        { id: "ef2", obs: "stay with a task until it is done", impact: "finishing classwork", l: "Stays with task until done" },
        { id: "ef3", obs: "follow 2–3 step directions", impact: "following classroom routines", l: "Follows 2–3 step directions" },
        { id: "ef4", obs: "move to the next activity when cued", impact: "transitions during the day", l: "Transitions to next activity when cued (no repeats)" },
        { id: "ef5", obs: "keep needed materials and turn in work", impact: "organizing schoolwork", l: "Has needed materials; completes and turns in work" }
      ] }
    ] },
    { id: "s12", n: 12, title: "Social Participation, Regulation & Behaviors", dom: "SOCIAL", blocks: [
      { t: "opts", id: "partic", label: "Participates in", multi: true, opts: ["Family routines", "Playdates", "Sports / clubs", "Community outings", "Birthday parties"] },
      { t: "behav" },
      { t: "opts", id: "before", label: "Usually happens before", multi: true, opts: ["Transitions", "Task demands", "Told no / waiting", "Noise / crowds", "Not known"] },
      { t: "opts", id: "helped", label: "What helped", multi: true, opts: ["First–then", "Visual schedule", "Timer / warning", "Movement break", "Quiet space"] },
      { t: "opts", id: "barriers", label: "Barriers", multi: true, opts: ["Stairs", "Bathroom", "Noisy / crowded", "Seat / table fit", "Playground", "Transport"] },
      { t: "opts", id: "context", label: "Context", multi: true, opts: ["Home language ≠ English", "Two homes / shared care", "Recent move / change", "Equipment in use (AT, splints, seating)"] }
    ] },
    { id: "s13", n: 13, title: "Safety & Supervision", sub: "Observable or reported", dom: "SAFETY", blocks: [
      { t: "freq", safety: true, items: [
        { id: "sa1", obs: "fall or trip", impact: "safety during play and on stairs", l: "Falls / trips (note # per week, injuries)" },
        { id: "sa2", obs: "climb furniture or heights without an adult", impact: "safety at home", l: "Climbs furniture / heights without adult" },
        { id: "sa3", obs: "swallow non-food items", impact: "safety at home and school", l: "Swallows non-food items (pica)" },
        { id: "sa4", obs: "leave the adult or area", impact: "safety in the community", l: "Leaves adult / area; steps into street or water" },
        { id: "sa5", obs: "hit, bite, or otherwise injure themselves", impact: "safety during daily routines", l: "Self-injury (note what it looks like, when, # per day)" },
        { id: "sa6", obs: "hit, kick, or push others", impact: "play with peers", l: "Aggression toward others (what it looks like)" }
      ] },
      { t: "opts", id: "superv", label: "Supervision needed", opts: ["Age-typical", "Line of sight", "Arm's length", "1:1 / hands-on"] },
      { t: "opts", id: "safeFx", label: "In place", multi: true, opts: ["Door alarms / locks", "Safety plan in place"] },
      { t: "opts", id: "regress", label: "Neurology trigger: loss of previously gained skills (regression)", multi: true, none: "None reported", opts: ["None reported", "Motor", "Language", "Self-care"] },
      { t: "opts", id: "mh", label: "Also reported (clinician copy only)", multi: true, opts: ["Behavior / mood change reported", "Self-harm statements reported"] }
    ] },
    { id: "s14", n: 14, title: "Domain Status & Outcome", calc: "outcome" },
    { id: "s15", n: 15, title: "Tests, Referrals & Sign-off", calc: "tests" }
  ],
  behaviors: [
    { id: "b1", obs: "cry or scream", l: "Crying / screaming" }, { id: "b2", obs: "drop to the floor", l: "Drops to floor" }, { id: "b3", obs: "leave the area or move away from tasks", l: "Leaves area / runs from task" },
    { id: "b4", obs: "say no or argue", l: "Vocal refusal (says no, argues)" }, { id: "b5", obs: "throw or sweep items", l: "Throws or sweeps items" },
    { id: "b6", obs: "cover ears or hide", l: "Covers ears / hides" }, { id: "b7", obs: "show repeated movements such as rocking or hand-flapping", l: "Repeated movements (rocking, hand-flapping)" }
  ],
  // ---- 10 domains: clinician name, parent name + examples, plain-language "areas OT may address" phrase ----
  domains: [
    { id: "FM", sec: "s4", name: "Fine motor & visual-motor", parent: "Hand skills & eye-hand coordination", ex: "writing, drawing, cutting, using both hands", address: "Hand skills for drawing, writing, and cutting", range: true, short: "Hand skills", typ: "completed the hand skills checked at an age-expected level", impact: "handwriting, cutting, and classroom tabletop work", iv: "make" },
    { id: "GM", sec: "s5", name: "Gross motor, postural & mobility", parent: "Big-body movement & balance", ex: "running, stairs, catching, sitting upright", address: "Balance, coordination, and moving safely", range: true, short: "Movement & balance", typ: "completed the movement and balance skills checked at an age-expected level", impact: "playground play and keeping up with peers", iv: "make" },
    { id: "SENS", sec: "s6", name: "Sensory processing", parent: "Responses to sound, touch & movement", ex: "noise, clothing, messy play, seeking movement", address: "Taking part with everyday sounds, touch, and movement", short: "Sensory responses", typ: "showed responses to sound, touch, and movement that were typical for age in the items checked", impact: "time in busy or noisy settings", iv: "affect" },
    { id: "ADL", sec: "s7", name: "ADL / self-care & sleep", parent: "Self-care & sleep", ex: "dressing, buttons/zippers, utensils, washing, sleep", address: "Dressing, self-care, and daily routines", range: true, short: "Self-care", typ: "completed the self-care skills checked at an age-expected level", impact: "daily self-care routines", iv: "affect" },
    { id: "FEED", sec: "s8", name: "Feeding & oral-sensory", parent: "Eating & mealtimes", ex: "number of foods, textures, meal length, gagging or coughing", address: "Mealtime participation and trying new foods", short: "Eating & mealtimes", typ: "showed mealtime skills that were typical for age in the items checked", impact: "mealtimes", iv: "affect" },
    { id: "PLAY", sec: "s10", name: "Play & leisure", parent: "Play", ex: "how your child plays, for how long, with whom", address: "Play skills and staying with an activity", short: "Play", typ: "showed play skills that were typical for age in the items checked", impact: "play with peers", iv: "affect" },
    { id: "SCHOOL", sec: "s11", name: "Executive functioning / school", parent: "School: attention & following directions", ex: "starting and finishing work, steps, materials", address: "Starting, following, and finishing tasks", short: "School skills", typ: "completed the school-routine skills checked at an age-expected level", impact: "classroom work", iv: "make" },
    { id: "SOCIAL", sec: "s12", name: "Social participation & regulation", parent: "Getting along & handling changes", ex: "turn-taking, transitions, calming after upset", address: "Taking turns and moving between activities", short: "Handling changes", typ: "showed age-typical responses to changes and routines in the items checked", impact: "transitions and group activities", iv: "make" },
    { id: "ADAPT", sec: "s9", name: "Adaptive behavior", parent: "Everyday life skills", ex: "routines, chores, communication, community", address: "Everyday life skills at home and in the community", range: true, short: "Everyday life skills", typ: "completed the everyday life skills checked at an age-expected level", impact: "independence in daily routines", iv: "affect" },
    { id: "SAFETY", sec: "s13", name: "Safety & supervision / environment", parent: "Safety & supervision", ex: "falls, climbing, wandering off, swallowing objects", address: "Safety during daily routines", short: "Safety", typ: "had no safety concerns noted in the items checked", impact: "safety during daily routines", iv: "affect" }
  ],
  outcomes: {
    FULL: { l: "Full comprehensive OT evaluation recommended", parent: "We recommend a comprehensive occupational therapy (OT) evaluation to get a clearer picture of your child’s skills and any areas that may need support. Completing an evaluation does not mean your child will automatically qualify for services. The results help determine whether OT is recommended and guide what would help most." },
    MON: { l: "Monitor & rescreen", parent: "We recommend monitoring your child’s skills and trying the home ideas below. A rescreen visit will help show whether skills are developing as expected or whether a full evaluation would be helpful." },
    NONE: { l: "No OT needs identified at this time", parent: "Your child’s skills look on track for age in the areas screened, and OT services are not recommended at this time. Please contact us if new concerns come up." }
  },
  tests: [
    { id: "DAYC2", l: "DAYC-2", crit: "birth–5:11; delay in 1+ developmental areas", parent: "DAYC-2: play-based activities and caregiver questions about early development" },
    { id: "BOT2", l: "BOT-2 / BOT-2 SF", crit: "4–21y; motor (FM, coordination, balance)", parent: "BOT-2: balance, coordination, strength, and hand-skill activities done like games" },
    { id: "VMI", l: "Beery VMI (+VP/MC)", crit: "2y+; visual-motor, copying, handwriting", parent: "Beery VMI: copying shapes and lines to see how eyes and hands work together" },
    { id: "VINE", l: "Vineland-3", crit: "adaptive / ADL / social; caregiver + teacher", parent: "Vineland-3: a questionnaire you (and/or the teacher) fill out about everyday skills" },
    { id: "SENSQ", l: "SPM-2 or Sensory Profile 2", crit: "Sensory = Monitor / Concern; form by age", parent: "Sensory questionnaire: home and school forms about responses to sound, touch, and movement" }
  ],
  referrals: [
    { id: "neuro", l: "Neurology", trig: "Any one: (a) loss of previously gained skills (regression); (b) changes in movement: one-sided weakness, very low or high muscle tone, or new or increasing falls. Recommend discussing with pediatrician / neurology referral", parent: "Pediatrician / neurology", pverb: "to discuss", preason: "to discuss changes in skills or movement" },
    { id: "aba", l: "ABA / BCBA", trig: "Frequent aggression, self-injury, elopement; behavior blocks routines", parent: "Behavior analyst (BCBA)", pverb: "to assess", preason: "to assess behavior support needs during daily routines" },
    { id: "slp", l: "SLP", trig: "Communication concern; feeding / swallow concern", parent: "Speech-language therapy", pverb: "to evaluate", preason: "to evaluate communication and/or feeding skills" },
    { id: "feed", l: "Feeding team / swallow study", trig: "Cough, choke, or wet voice with intake", parent: "Feeding / swallow team", pverb: "to evaluate", preason: "to evaluate chewing and swallowing safety" },
    { id: "pt", l: "PT", trig: "Falls; gross motor delay; mobility / wheelchair", parent: "Physical therapy", pverb: "to evaluate", preason: "to evaluate gross motor skills and balance" },
    { id: "devped", l: "Developmental pediatrics", trig: "Concerns in multiple areas; no diagnosis", parent: "Developmental pediatrician", pverb: "to evaluate", preason: "to evaluate development across several areas" },
    { id: "audvis", l: "Audiology / Vision", trig: "Failed or missed screen, or concern", parent: "Audiology / vision provider", pverb: "to evaluate", preason: "to evaluate hearing and vision" },
    { id: "gi", l: "GI / dietitian", trig: "Growth / weight concern; very limited diet", parent: "Nutrition or GI provider", pverb: "to evaluate", preason: "to evaluate growth and nutrition" },
    { id: "psych", l: "Psychology / mental health", trig: "Behavior or mood change reported. Reports of self-harm statements: same-day follow-up with caregiver and referral to mental health provider", parent: "Mental health provider", pverb: "to evaluate", preason: "to evaluate emotional and behavioral regulation" },
    { id: "peds", l: "Pediatrician follow-up", trig: "New medical concern; to coordinate referrals", parent: "Your pediatrician", pverb: "to", preason: "to coordinate care and the referrals above" }
  ],
  nextStepsLabel: "Clinician follow-up (internal)",
  nextSteps: ["Schedule standardized testing", "Teacher input / records", "Medical records", "Release of information signed", "Results Summary given"],
  parentSteps: {
    full: "Full OT evaluation — to get a clearer picture of your child’s skills",
    teacher: "Teacher / school input — a teacher form, work samples, or a call with the school (with your permission)",
    records: "Medical / other records — reports from your child’s doctor or other therapists"
  },
  activities: [
    { k: "play", l: "Play-based activities", t: "we observed {n} during play-based activities" },
    { k: "table", l: "Structured tabletop tasks", t: "we observed {n} during structured tabletop tasks" },
    { k: "mixed", l: "Play + tabletop tasks", t: "we observed {n} during play-based activities and tabletop tasks" },
    { k: "routine", l: "Observation during routines", t: "we observed {n} during daily routines" },
    { k: "interview", l: "Caregiver interview only", t: "the screening was completed through a caregiver interview" }
  ],
  homeIdeas: [
    "Hand-strength play: play-dough, tongs, LEGO, stickers (5–10 min a day)",
    "Draw or write on a wall, easel, or taped paper while standing",
    "Practice holding the paper with the helper hand",
    "Movement or 'heavy work' breaks: carry, push, animal walks (2–3 min)",
    "2-minute warning and a visual timer before stopping screens or play",
    "First–then: \"First 3 words, then LEGO\"",
    "Ear protection or a quiet spot for loud places",
    "Practice buttons and zippers when not rushed (e.g., weekends)",
    "Picture or checklist for morning and bedtime steps",
    "Offer one new food next to a favorite food; no pressure to eat it"
  ],
  startOT: [
    { id: "ref", l: "Ask your child’s doctor for an OT referral / prescription", on: true },
    { id: "ins", l: "Check your insurance benefits for OT (coverage, visit limits, copay, prior authorization)", on: true },
    { id: "intake", l: "Complete the intake forms", on: true },
    { id: "records", l: "Share records (IEP / 504, medical, past therapy reports)", on: true },
    { id: "sched", l: "Schedule the full evaluation", on: true }
  ],
  disclaimer: "This is a screening summary, not a diagnosis or a formal test score. It reflects what was shared with us and what we observed during one brief visit. A screener identifies areas that may benefit from further attention. A full evaluation can provide a more complete picture of your child’s skills and needs.",
  bandNote: "The performance bands reflect the clinician’s professional judgment based on the screener items. They are not based on standardized test scores.",
  summarySub: "What we observed and you shared at the screening visit, and what we recommend next",
  bandsParent: [
    { k: "Typical", l: "Typical for age", d: "Skills look like what we usually see at this age.", preason: "to coordinate care and referrals" },
    { k: "Monitor", l: "Monitor", d: "Some differences. Keep an eye on it and try the home ideas." },
    { k: "Elevated", l: "Elevated", d: "Differences that get in the way of daily activities. We suggest a closer look." }
  ]
};
CONFIG.support = { "": "help", I: "help", G: "gestural cues", V: "verbal cues", Vis: "visual cues", M: "a demonstration", PP: "partial hands-on help", FP: "hand-over-hand help" };
