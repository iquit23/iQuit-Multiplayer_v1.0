/* I QUIT! — Δεδομένα καρτών.
   Πηγή αλήθειας: IQuit_Cards_v2.pptx (το IQuit_cards.json έλειπε από το project — βλ. DECISIONS.md).
   Κατηγορίες: Lifestyle 24, Moments 26, Project 37 μοναδικές, Big Business 20, Wild 5/παίκτη. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IQ_CARDS = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // ---------- LIFESTYLE (24) ----------
  // effect: μόνιμη μεταβολή σε κατηγορία εξόδων. shared=true → "Έκαστος": ισχύει και για έναν παίκτη της επιλογής σου.
  // tag: χρησιμοποιείται από τις 2 Moments κάρτες-αναίρεσης.
  const LIFESTYLE = [
    { id: 'L01', title: 'Να σας ζήσει, αποκτήσατε παιδάκι', cat: 'Παιδί', delta: 50 },
    { id: 'L02', title: 'Να σας ζήσει, αποκτήσατε παιδάκι', cat: 'Παιδί', delta: 50 },
    { id: 'L03', title: 'Υιοθετείς κατοικίδιο, έξοδα φροντίδας του νέου μέλους', cat: 'Παιδί', delta: 50 },
    { id: 'L04', title: 'Νέο όχημα με δόσεις', cat: 'Μεταφορικά', delta: 50 },
    { id: 'L05', title: 'Μετακομίζεις σε μεγαλύτερο διαμέρισμα', cat: 'Ενοίκιο', delta: 50 },
    { id: 'L06', title: 'Προσέλαβες κηπουρό για τον κήπο σου', cat: 'Ενοίκιο', delta: 50 },
    { id: 'L07', title: 'Τα καύσιμα αυξήθηκαν', cat: 'Μεταφορικά', delta: 50 },
    { id: 'L08', title: 'Τα κοινόχρηστα αυξάνονται λόγω συντήρησης κτηρίου', cat: 'Ενοίκιο', delta: 50 },
    { id: 'L09', title: 'Δεν χρειάζεται να «δείχνεις» ότι έχεις χρήματα πηγαίνοντας σε εστιατόρια τόσο συχνά', cat: 'Διατροφή', delta: 50 },
    { id: 'L10', title: 'Θες να φοράς την τελευταία τάση της μόδας', cat: 'Ένδυση', delta: 50 },
    { id: 'L11', title: 'Αναλαμβάνεις έξτρα εργασία εκτός πόλης κάποια Σάββατα', cat: 'Μεταφορικά', delta: 50 },
    { id: 'L12', title: 'Το junk food κοστίζει', cat: 'Διατροφή', delta: 100, tag: 'junkfood' },
    { id: 'L13', title: 'Μερικές φορές πας στην εργασία με ταξί', cat: 'Μεταφορικά', delta: 50 },
    { id: 'L14', title: 'Ξεκίνησες κάπνισμα και η ασφάλεια δεν το πήρε με καλό μάτι', cat: 'Ασφάλεια', delta: 100, tag: 'smoking' },
    { id: 'L15', title: 'Δεν είναι κακό να σου αρέσει να βγαίνεις, απλώς…', cat: 'Ψυχαγωγία', delta: 100 },
    { id: 'L16', title: 'Αυξάνεις την ασφάλειά σου γιατί σκοπεύεις να κάνεις εξορμήσεις σε ζούγκλες', cat: 'Ασφάλεια', delta: 100 },
    { id: 'L17', title: 'Μα κάθε μήνα και καινούργια παπούτσια;', cat: 'Ένδυση', delta: 100, tag: 'shoes' },
    { id: 'L18', title: 'Ένα πιπίνι διασκεδάζει τις Τετάρτες, πηγαίνεις και εσύ', cat: 'Ψυχαγωγία', delta: 100, tag: 'wednesdays' },
    { id: 'L19', title: 'Διασκέδαση είναι και μια μάζωξη στο σπίτι', cat: 'Ψυχαγωγία', delta: -50 },
    { id: 'L20', title: 'Λόγω των υγιεινών σου συνηθειών, θεωρείσαι πελάτης χαμηλού ρίσκου', cat: 'Ασφάλεια', delta: -50 },
    { id: 'L21', title: 'Ξεκινάς συγκατοίκηση με έναν παίκτη της επιλογής σου (Έκαστος)', cat: 'Ενοίκιο', delta: -50, shared: true },
    { id: 'L22', title: 'Μοιράζεσαι το όχημα με έναν παίκτη της επιλογής σου (Έκαστος)', cat: 'Μεταφορικά', delta: -50, shared: true },
    { id: 'L23', title: 'Μοιράζεσαι το μεσημεριανό με έναν παίκτη της επιλογής σου (Έκαστος)', cat: 'Διατροφή', delta: -50, shared: true },
    { id: 'L24', title: 'Μοιράζεσαι τα ρούχα σου με έναν παίκτη της επιλογής σου (Έκαστος)', cat: 'Ένδυση', delta: -50, shared: true },
  ];

  // ---------- MOMENTS (26) ----------
  // amount: εφάπαξ μετρητά. cancels: αναιρεί (επιστρέφει στη στοίβα) lifestyle κάρτες με αυτά τα tags.
  const MOMENTS = [
    { id: 'M01', title: 'Μια μέρα ξυπνάς και αποφασίζεις να κόψεις το κάπνισμα και το junk food', cancels: ['smoking', 'junkfood'] },
    { id: 'M02', title: 'Μια μέρα ξυπνάς και αποφασίζεις να σταματήσεις τις εξόδους τις Τετάρτες και τις πολλές αγορές παπουτσιών', cancels: ['wednesdays', 'shoes'] },
    { id: 'M03', title: 'Ανέλαβες να φροντίζεις τα σκυλάκια της γειτονιάς για κάποιες μέρες', amount: 150 },
    { id: 'M04', title: 'Έκανες οικονομία και αποταμίευσες κάποια χρήματα', amount: 250 },
    { id: 'M05', title: 'Γύρισες στην οικογένειά σου για λίγους μήνες και εξοικονόμησες χρήματα', amount: 250 },
    { id: 'M06', title: 'Ξεπλήρωσες τα χρέη σου και σου έμειναν και κάποια χρήματα', amount: 100 },
    { id: 'M07', title: 'Είδες ότι το καθημερινό σου ρόφημα από το σπίτι είναι πιο οικονομικό', amount: 100 },
    { id: 'M08', title: 'Κοιτάζοντας για προσφορές, σου μένουν περισσότερα χρήματα στην άκρη', amount: 150 },
    { id: 'M09', title: 'Χάλασε το πλυντήριό σου', amount: -100 },
    { id: 'M10', title: 'Έκλεισες εισιτήρια για ταξίδι στην Ασία', amount: -150 },
    { id: 'M11', title: 'Πλήρωσες τη συνδρομή στην πλατφόρμα ψυχαγωγίας σου', amount: -200 },
    { id: 'M12', title: 'Αυτόματη αναβάθμιση χώρου αποθήκευσης στο κινητό', amount: -200 },
    { id: 'M13', title: 'Σου αρέσουν τα καζίνο', amount: -300 },
    { id: 'M14', title: 'Όταν ξεχνάς να καταγράφεις τα έξοδά σου, βγαίνεις εύκολα εκτός προϋπολογισμού', amount: -350 },
    { id: 'M15', title: 'Καινούργια λάστιχα και ζάντες αυτοκινήτου', amount: -350 },
    { id: 'M16', title: 'Πληρωμή για γυμναστήριο', amount: -100 },
    { id: 'M17', title: 'Βγήκε νέο μοντέλο κινητού και τρέχεις να το αγοράσεις', amount: -500 },
    { id: 'M18', title: 'Αγόρασες πακέτο θεραπειών ομορφιάς', amount: -450 },
    { id: 'M19', title: 'Ανακάλυψες πως σου έκλεψαν χρήματα από τον λογαριασμό σου', amount: -250 },
    { id: 'M20', title: 'Πλήρωσες πρόστιμο για άσκοπη κατανάλωση νερού', amount: -150 },
    { id: 'M21', title: 'Πήγες για κάτι προληπτικές εξετάσεις σε γιατρό και σου έγραψε κάποιες βιταμίνες', amount: -450 },
    { id: 'M22', title: 'Αγόρασες μερικά τυχαία Cryptos. Πρέπει να πάθεις για να μάθεις', amount: -300 },
    { id: 'M23', title: 'Λόγω εκπτώσεων, έπεσες στην παγίδα του υπερκαταναλωτισμού', amount: -200 },
    { id: 'M24', title: 'Τα έξοδα επικοινωνίας για το προηγούμενο τρίμηνο έτσουξαν', amount: -400 },
    { id: 'M25', title: 'Καθυστέρησες να πληρώσεις κάποιους λογαριασμούς και έφαγες πρόστιμο', amount: -100 },
    { id: 'M26', title: 'Σε σταματά η αστυνομία, πρόστιμο λόγω μέθης', amount: -200 },
  ];

  // ---------- PROJECT (37 μοναδικές) ----------
  // kind: 'P' (color G/Y/R), 'funding', 'bond', 'masters', 'taxprepay', 'betterloan'
  const PROJECTS = [
    // Πράσινο — Αμοιβαία Κεφάλαια (~6%)
    { id: 'PG1', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Νότιας Αμερικής', cost: 1200, income: 70 },
    { id: 'PG2', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Νότιας Ασίας', cost: 800, income: 50 },
    { id: 'PG3', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Ωκεανίας', cost: 600, income: 35 },
    { id: 'PG4', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Δυτικής Ευρώπης', cost: 1000, income: 60 },
    { id: 'PG5', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Βόρειας Ασίας', cost: 800, income: 50 },
    { id: 'PG6', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Ανατολικής Ευρώπης', cost: 1000, income: 60 },
    // Κίτρινο — REITs (~13%)
    { id: 'PY1', kind: 'P', color: 'Y', title: 'REIT εστιατορίων', cost: 600, income: 80 },
    { id: 'PY2', kind: 'P', color: 'Y', title: 'REIT νοσοκομείου', cost: 1200, income: 155 },
    { id: 'PY3', kind: 'P', color: 'Y', title: 'REIT γραφείου', cost: 400, income: 50 },
    { id: 'PY4', kind: 'P', color: 'Y', title: 'REIT πολυκατοικίας', cost: 600, income: 80 },
    { id: 'PY5', kind: 'P', color: 'Y', title: 'REIT βίλας', cost: 1000, income: 130 },
    { id: 'PY6', kind: 'P', color: 'Y', title: 'REIT πολυεθνικής', cost: 800, income: 105 },
    { id: 'PY7', kind: 'P', color: 'Y', title: 'REIT ξενοδοχείου', cost: 1000, income: 130 },
    { id: 'PY8', kind: 'P', color: 'Y', title: 'REIT διαμερίσματος', cost: 800, income: 105 },
    // Κόκκινο — Μετοχές (~20%)
    { id: 'PR1', kind: 'P', color: 'R', title: 'Μετοχή πετρελαίου', cost: 1000, income: 200 },
    { id: 'PR2', kind: 'P', color: 'R', title: 'Μετοχή κατασκευαστή κινητών', cost: 800, income: 160 },
    { id: 'PR3', kind: 'P', color: 'R', title: 'Μετοχή φαρμάκων', cost: 600, income: 120 },
    { id: 'PR4', kind: 'P', color: 'R', title: 'Μετοχή κατασκευαστή αυτοκινήτων', cost: 800, income: 160 },
    { id: 'PR5', kind: 'P', color: 'R', title: 'Μετοχή ελαιόλαδου', cost: 1000, income: 200 },
    { id: 'PR6', kind: 'P', color: 'R', title: 'Μετοχή μέσου κοινωνικής δικτύωσης', cost: 600, income: 120 },
    // Funding — Χρηματοδοτήσεις (8%)
    { id: 'PF1', kind: 'funding', title: 'Χρηματοδότηση πλατφόρμας διαμοιρασμού βιβλίων', cost: 1000, income: 80 },
    { id: 'PF2', kind: 'funding', title: 'Χρηματοδότηση υπηρεσίας οργάνωσης γεύματος', cost: 2000, income: 160 },
    { id: 'PF3', kind: 'funding', title: 'Χρηματοδότηση ιστοσελίδας διδασκαλίας κιθάρας & πιάνου', cost: 1500, income: 120 },
    { id: 'PF4', kind: 'funding', title: 'Χρηματοδότηση πλατφόρμας ενοικίασης ποδηλάτων', cost: 1500, income: 120 },
    { id: 'PF5', kind: 'funding', title: 'Χρηματοδότηση χώρου επισκευής ηλεκτρονικών ειδών', cost: 2000, income: 160 },
    { id: 'PF6', kind: 'funding', title: 'Χρηματοδότηση θε(α)ματικής καφετέριας', cost: 2500, income: 200 },
    { id: 'PF7', kind: 'funding', title: 'Χρηματοδότηση αειφόρου καλλιέργειας τροφίμων', cost: 1000, income: 80 },
    { id: 'PF8', kind: 'funding', title: 'Χρηματοδότηση εφαρμογής ταξί σε νησί', cost: 2500, income: 200 },
    // Ομόλογα (4%/είσπραξη ως token, λήξη στα 10 tokens → 1.000 → 1.400)
    { id: 'PB1', kind: 'bond', title: 'Κρατικό Ομόλογο', cost: 1000 },
    { id: 'PB2', kind: 'bond', title: 'Κρατικό Ομόλογο', cost: 1000 },
    // Μεταπτυχιακό — μόνιμη αύξηση μισθού
    { id: 'PM1', kind: 'masters', title: 'Ευκαιρία για Μεταπτυχιακό', cost: 2400, salaryUp: 240 },
    { id: 'PM2', kind: 'masters', title: 'Ευκαιρία για Μεταπτυχιακό', cost: 1200, salaryUp: 120 },
    // Προκαταβολή Φόρου — μόνιμη μείωση εξόδου «Φόροι»
    { id: 'PT1', kind: 'taxprepay', title: 'Προκαταβολή Φόρου', cost: 2400, taxDown: 120 },
    { id: 'PT2', kind: 'taxprepay', title: 'Προκαταβολή Φόρου', cost: 1600, taxDown: 80 },
    // Ευνοϊκότερο Δάνειο — -2 δόσεις
    { id: 'PL1', kind: 'betterloan', title: 'Ευνοϊκότερο Δάνειο', cost: 500, fewerPayments: 2 },
    { id: 'PL2', kind: 'betterloan', title: 'Ευνοϊκότερο Δάνειο', cost: 400, fewerPayments: 2 },
    { id: 'PL3', kind: 'betterloan', title: 'Ευνοϊκότερο Δάνειο', cost: 600, fewerPayments: 2 },
  ];

  // ---------- BIG BUSINESS (20) — δεν σκάνε, μόνο φορολογούνται. Αφαιρούνται όταν αγοραστούν ----------
  const BIG_BUSINESS = [
    { id: 'BB01', title: 'Σταθμός παραγωγής ανανεώσιμης ενέργειας', cost: 9000, income: 540 },
    { id: 'BB02', title: 'Δημιουργία κοινότητας διαμοιρασμού εφοδιασμού', cost: 8000, income: 480 },
    { id: 'BB03', title: 'Σταθμός φόρτισης ηλεκτρικών αυτοκινήτων', cost: 8000, income: 440 },
    { id: 'BB04', title: 'Ενοικίαση αποθηκευτικού χώρου στο κέντρο της πόλης', cost: 6000, income: 390 },
    { id: 'BB05', title: 'Αγροτεμάχιο με βιολογικές φράουλες', cost: 6000, income: 330 },
    { id: 'BB06', title: 'Επιχείρηση με εκτυπωτές για 3D Printing', cost: 8000, income: 520 },
    { id: 'BB07', title: 'Χώρος παρκαρίσματος δίπλα σε πανεπιστήμιο', cost: 6000, income: 360 },
    { id: 'BB08', title: 'Συγγραφή μικρών ιστοριών για παιδιά', cost: 8000, income: 480 },
    { id: 'BB09', title: 'Ξενοδοχείο φροντίδας κατοικίδιων', cost: 9000, income: 585 },
    { id: 'BB10', title: 'Δημιουργείς το επιτραπέζιο «I Quit»', cost: 4000, income: 280 },
    { id: 'BB11', title: 'Εστιατόριο για χορτοφάγους', cost: 9000, income: 495 },
    { id: 'BB12', title: 'Αλγόριθμος για καλύτερες συγκοινωνίες', cost: 5000, income: 300 },
    { id: 'BB13', title: 'Διαμέρισμα στα Χανιά με θέα τη θάλασσα', cost: 10000, income: 600 },
    { id: 'BB14', title: 'Κατάστημα εμπορίου ρούχων από ανακυκλώσιμα υλικά', cost: 7000, income: 420 },
    { id: 'BB15', title: 'Πρόγραμμα ψηφιακής εκπαίδευσης', cost: 5000, income: 325 },
    { id: 'BB16', title: 'Καντίνα δίπλα σε παραλία', cost: 5000, income: 275 },
    { id: 'BB17', title: 'Εξόρυξη Bitcoin με ανανεώσιμες πηγές ενέργειας', cost: 5000, income: 300 },
    { id: 'BB18', title: 'Μηχάνημα καθαρισμού παραλίας από απορρίμματα', cost: 7000, income: 455 },
    { id: 'BB19', title: 'Διαμέρισμα στο Ηράκλειο με θέα το βουνό', cost: 10000, income: 600 },
    { id: 'BB20', title: 'Επιχείρηση πλυντηρίων κάνοντας ποδήλατο', cost: 7000, income: 385 },
  ];

  // ---------- ΤΑΜΠΛΟ (28 κουτάκια, brief §4 = GDD §3.1) ----------
  const BOARD = [
    { t: 'start',    label: 'Starting Point' },          // 0 (γωνία)
    { t: 'bb',       label: 'Big Business' },            // 1
    { t: 'lifestyle',label: 'Lifestyle' },               // 2
    { t: 'project',  label: 'Project' },                 // 3
    { t: 'crash',    label: 'Crash', colors: ['G','Y','R'] }, // 4
    { t: 'moments',  label: 'Moments' },                 // 5
    { t: 'project',  label: 'Project' },                 // 6
    { t: 'inflation',label: 'Inflation 5%' },            // 7 (γωνία)
    { t: 'project',  label: 'Project' },                 // 8
    { t: 'bb',       label: 'Big Business' },            // 9
    { t: 'crash',    label: 'Crash', colors: ['R'] },    // 10
    { t: 'moments',  label: 'Moments' },                 // 11
    { t: 'project',  label: 'Project' },                 // 12
    { t: 'tax',      label: 'Tax' },                     // 13
    { t: 'salary',   label: 'Salary' },                  // 14 (γωνία)
    { t: 'project',  label: 'Project' },                 // 15
    { t: 'lifestyle',label: 'Lifestyle' },               // 16
    { t: 'bb',       label: 'Big Business' },            // 17
    { t: 'fundingfails', label: 'Funding Fails' },       // 18
    { t: 'moments',  label: 'Moments' },                 // 19
    { t: 'project',  label: 'Project' },                 // 20
    { t: 'inflation',label: 'Inflation 5%' },            // 21 (γωνία)
    { t: 'project',  label: 'Project' },                 // 22
    { t: 'moments',  label: 'Moments' },                 // 23
    { t: 'crash',    label: 'Crash', colors: ['Y','R'] },// 24
    { t: 'bb',       label: 'Big Business' },            // 25
    { t: 'project',  label: 'Project' },                 // 26
    { t: 'tax',      label: 'Tax' },                     // 27
  ];

  return { LIFESTYLE, MOMENTS, PROJECTS, BIG_BUSINESS, BOARD };
});
