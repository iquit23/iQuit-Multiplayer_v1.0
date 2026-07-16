/* I QUIT! — Δεδομένα καρτών.
   Πηγή αλήθειας: IQuit_Cards_v3.key (ενημέρωση Γιώργου 2026-07-11 — v1.11).
   Κατηγορίες: Lifestyle 24, Moments 26, Project 44 (με αντίτυπα), Big Business 20, Wild 5/παίκτη. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IQ_CARDS = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // ---------- LIFESTYLE (24) ----------
  // effect: μόνιμη μεταβολή σε κατηγορία εξόδων. shared=true → "Έκαστος": ισχύει και για έναν παίκτη της επιλογής σου.
  // tag: χρησιμοποιείται από τις 2 Moments κάρτες-αναίρεσης.
  // v1.11: κείμενα/ποσά από IQuit_Cards_v3.key (αλλαγές Γιώργου)
  const LIFESTYLE = [
    { id: 'L01', en: 'Congratulations — you have a new baby!', title: 'Να σας ζήσει, αποκτήσατε παιδάκι.', cat: 'Παιδί', delta: 50 },
    { id: 'L02', en: 'Congratulations — you have a new baby!', title: 'Να σας ζήσει, αποκτήσατε παιδάκι.', cat: 'Παιδί', delta: 50 },
    { id: 'L03', en: 'You adopt a pet — care costs for the new family member', title: 'Υιοθετείς κατοικίδιο. Έξοδα φροντίδας του νέου μέλους.', cat: 'Παιδί', delta: 50 },
    { id: 'L04', en: 'Buying a car on installments', title: 'Αγορά αυτοκινήτου με δόσεις.', cat: 'Μεταφορικά', delta: 50 },
    { id: 'L05', en: 'You move to a bigger apartment', title: 'Μετακομίζεις σε μεγαλύτερο διαμέρισμα.', cat: 'Ενοίκιο', delta: 50 },
    { id: 'L06', en: 'You hire a gardener to tend your garden', title: 'Προσλαμβάνεις κηπουρό για να επιμελείται τον κήπο σου.', cat: 'Ενοίκιο', delta: 50 },
    { id: 'L07', en: 'Fuel prices have gone up', title: 'Οι τιμές των καυσίμων αυξήθηκαν.', cat: 'Μεταφορικά', delta: 50 },
    { id: 'L08', en: 'Apartment-building maintenance raises the shared fees', title: 'Τα κοινόχρηστα αυξάνονται λόγω συντήρησης πολυκατοικίας.', cat: 'Ενοίκιο', delta: 50 },
    { id: 'L09', en: 'You switch to organic food', title: 'Ξεκινάς να τρέφεσαι με βιολογικά προϊόντα.', cat: 'Διατροφή', delta: 50 },
    { id: 'L10', en: 'You want to follow the latest fashion', title: 'Θες να ακολουθείς την τελευταία τάση της μόδας.', cat: 'Ένδυση', delta: 50 },
    { id: 'L11', en: 'Frequent out-of-town getaways add up', title: 'Οι συχνές εκδρομές εκτός πόλης κοστίζουν.', cat: 'Μεταφορικά', delta: 50 },
    { id: 'L12', en: 'Junk food adds up', title: 'Το junk food κοστίζει.', cat: 'Διατροφή', delta: 100, tag: 'junkfood' },
    { id: 'L13', en: 'Sometimes you take a taxi to work', title: 'Μερικές φορές πας στην εργασία με ταξί.', cat: 'Μεταφορικά', delta: 50 },
    { id: 'L14', en: 'You started smoking — your insurer didn\'t take it well', title: 'Ξεκίνησες κάπνισμα και η ασφάλεια δεν το πήρε με καλό μάτι.', cat: 'Ασφάλεια', delta: 100, tag: 'smoking' },
    { id: 'L15', en: 'You pick up a new hobby every Friday', title: 'Ξεκινάς ένα νέο χόμπι κάθε Παρασκευή.', cat: 'Ψυχαγωγία', delta: 100, tag: 'hobby' },
    { id: 'L16', en: 'You raise your insurance for jungle expeditions', title: 'Αυξάνεις την ασφάλεια σου γιατί σκοπεύεις να κάνεις εξορμήσεις σε ζούγκλες.', cat: 'Ασφάλεια', delta: 100 },
    { id: 'L17', en: 'You gradually refresh your wardrobe', title: 'Ανανεώνεις σταδιακά την γκαρνταρόμπα σου.', cat: 'Ένδυση', delta: 100 },
    { id: 'L18', en: 'Watching theatre plays every Wednesday becomes your new habit', title: 'Το να παρακολουθείς θεατρικές παραστάσεις κάθε Τετάρτη, γίνεται η νέα σου συνήθεια.', cat: 'Ψυχαγωγία', delta: 100, tag: 'theater' },
    { id: 'L19', en: 'You choose cheaper fun — like a picnic in the park', title: 'Επιλέγεις οικονομικότερους τρόπους διασκέδασης όπως ένα πικ-νικ στο πάρκο.', cat: 'Ψυχαγωγία', delta: -50 },
    { id: 'L20', en: 'Thanks to your healthy habits you\'re a low-risk client', title: 'Λόγω των υγιεινών σου συνηθειών, θεωρείσαι πελάτης χαμηλού ρίσκου.', cat: 'Ασφάλεια', delta: -50 },
    { id: 'L21', en: 'You start sharing a flat with a player of your choice (each)', title: 'Ξεκινάς συγκατοίκηση με έναν παίκτη της επιλογής σου. (Έκαστος)', cat: 'Ενοίκιο', delta: -50, shared: true },
    { id: 'L22', en: 'You share a car with a player of your choice (each)', title: 'Μοιράζεσαι το όχημα με έναν παίκτη της επιλογής σου. (Έκαστος)', cat: 'Μεταφορικά', delta: -50, shared: true },
    { id: 'L23', en: 'You share lunch with a player of your choice (each)', title: 'Μοιράζεσαι το μεσημεριανό με έναν παίκτη της επιλογής σου. (Έκαστος)', cat: 'Διατροφή', delta: -50, shared: true },
    { id: 'L24', en: 'You share your clothes with a player of your choice (each)', title: 'Μοιράζεσαι τα ρούχα σου με έναν παίκτη της επιλογής σου. (Έκαστος)', cat: 'Ένδυση', delta: -50, shared: true },
  ];

  // ---------- MOMENTS (26) ----------
  // amount: εφάπαξ μετρητά. cancels: αναιρεί (επιστρέφει στη στοίβα) lifestyle κάρτες με αυτά τα tags.
  const MOMENTS = [
    { id: 'M01', en: 'One morning you decide to quit smoking and junk food', title: 'Μια μέρα ξυπνάς και αποφασίζεις να κόψεις το κάπνισμα και το junk food.', cancels: ['smoking', 'junkfood'] },
    { id: 'M02', en: 'One morning, your new hobby and the theatre plays just stop exciting you', title: 'Μια μέρα ξυπνάς, το νέο σου χόμπι και οι θεατρικές παραστάσεις παύουν να σε ενδιαφέρουν τόσο πολύ.', cancels: ['hobby', 'theater'] },
    { id: 'M03', en: 'You looked after the neighbourhood dogs for a few days', title: 'Ανέλαβες να φροντίζεις τα σκυλάκια της γειτονιάς για κάποιες μέρες.', amount: 150 },
    { id: 'M04', en: 'You cut back and saved some money', title: 'Έκανες οικονομία και αποταμίευσες κάποια χρήματα.', amount: 250 },
    { id: 'M05', en: 'You moved back with your family for a few months and saved money', title: 'Γύρισες στην οικογένεια σου για λίγους μήνες και εξοικονόμησες χρήματα.', amount: 250 },
    { id: 'M06', en: 'You paid off your debts and still had some money left', title: 'Αποπλήρωσες τα χρέη σου και σου έμειναν κάποια χρήματα.', amount: 100 },
    { id: 'M07', en: 'You realised your daily home-made drink is much cheaper', title: 'Είδες ότι το καθημερινό σου ρόφημα από το σπίτι είναι πιο οικονομικό.', amount: 100 },
    { id: 'M08', en: 'Hunting for deals leaves more money aside', title: 'Ψάχνοντας για προσφορές, σου μένουν περισσότερα χρήματα στην άκρη.', amount: 150 },
    { id: 'M09', en: 'Your washing machine broke down', title: 'Χάλασε το πλυντήριο σου.', amount: -450 },
    { id: 'M10', en: 'You booked tickets for a trip to Asia', title: 'Έκλεισες εισιτήρια για ταξίδι στην Ασία.', amount: -450 },
    { id: 'M11', en: 'You paid your entertainment platform subscriptions', title: 'Πλήρωσες τις συνδρομές, στις πλατφόρμες ψυχαγωγίας σου.', amount: -200 },
    { id: 'M12', en: 'Quarterly mobile phone bill', title: 'Λογαριασμός τριμήνου κινητής τηλεφωνίας.', amount: -150 },
    { id: 'M13', en: 'You like casinos a bit too much', title: 'Σου αρέσουν τα καζίνο.', amount: -300 },
    { id: 'M14', en: 'When you don\'t track your spending, the budget slips away', title: 'Όταν ξεχνάς να καταγράφεις τα έξοδα σου, βγαίνεις εύκολα εκτός προϋπολογισμού.', amount: -350 },
    { id: 'M15', en: 'New tyres and rims for the car', title: 'Καινούρια λάστιχα και ζάντες αυτοκινήτου.', amount: -350 },
    { id: 'M16', en: 'Gym membership payment', title: 'Πληρωμή για γυμναστήριο.', amount: -100 },
    { id: 'M17', en: 'A new phone model is out and you rush to buy it', title: 'Βγήκε νέο μοντέλο κινητού και τρέχεις να το αγοράσεις.', amount: -500 },
    { id: 'M18', en: 'You bought a beauty treatment package', title: 'Αγόρασες πακέτο θεραπειών ομορφιάς.', amount: -200 },
    { id: 'M19', en: 'You lost your wallet — with money inside', title: 'Έχασες το πορτοφόλι σου που είχε μέσα χρήματα.', amount: -250 },
    { id: 'M20', en: 'You pay a fine for wasting water', title: 'Πληρώνεις πρόστιμο για άσκοπη κατανάλωση νερού.', amount: -150 },
    { id: 'M21', en: 'A preventive check-up — and some prescribed vitamins', title: 'Πήγες για κάτι προληπτικές εξετάσεις σε γιατρό και σου έγραψε κάποιες βιταμίνες.', amount: -100 },
    { id: 'M22', en: 'You bought some random cryptos. Learn the hard way', title: 'Αγόρασες μερικά τυχαία Cryptos. Πρέπει να πάθεις για να μάθεις.', amount: -300 },
    { id: 'M23', en: 'The sales lured you into overconsumption', title: 'Λόγω εκπτώσεων, έπεσες στην παγίδα του υπερκαταναλωτισμού.', amount: -200 },
    { id: 'M24', en: 'The new home décor cost a bit more than planned', title: 'Η νέα διακόσμηση σπιτιού κόστισε λίγο παραπάνω.', amount: -400 },
    { id: 'M25', en: 'You paid some bills late and got fined', title: 'Καθυστέρησες να πληρώσεις κάποιους λογαριασμούς και έφαγες πρόστιμο.', amount: -100 },
    { id: 'M26', en: 'Police stop — drink-driving fine', title: 'Σε σταμάτησε η αστυνομία, πρόστιμο λόγω μέθης.', amount: -200 },
  ];

  // ---------- PROJECT (44 — με τα αντίτυπα του IQuit_Cards_v3.key) ----------
  // kind: 'P' (color G/Y/R), 'funding', 'bond', 'masters', 'taxprepay', 'betterloan'
  const PROJECTS = [
    // Πράσινο — Αμοιβαία Κεφάλαια (~6%) · v1.11: +Αφρικής ×2, +Βόρειας Αμερικής, +Νότιας Αμερικής (2ο)
    { id: 'PG1', en: 'South America Mutual Fund', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Νότιας Αμερικής', cost: 1200, income: 70 },
    { id: 'PG2', en: 'South Asia Mutual Fund', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Νότιας Ασίας', cost: 800, income: 50 },
    { id: 'PG3', en: 'Oceania Mutual Fund', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Ωκεανίας', cost: 600, income: 35 },
    { id: 'PG4', en: 'Western Europe Mutual Fund', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Δυτικής Ευρώπης', cost: 1000, income: 60 },
    { id: 'PG5', en: 'North Asia Mutual Fund', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Βόρειας Ασίας', cost: 800, income: 50 },
    { id: 'PG6', en: 'Eastern Europe Mutual Fund', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Ανατολικής Ευρώπης', cost: 1000, income: 60 },
    { id: 'PG7', en: 'Africa Mutual Fund', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Αφρικής', cost: 400, income: 25 },
    { id: 'PG8', en: 'North America Mutual Fund', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Βόρειας Αμερικής', cost: 1200, income: 70 },
    { id: 'PG9', en: 'Africa Mutual Fund', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Αφρικής', cost: 400, income: 25 },
    { id: 'PG10', en: 'South America Mutual Fund', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Νότιας Αμερικής', cost: 1200, income: 70 },
    // Κίτρινο — REITs (~13%)
    { id: 'PY1', en: 'Restaurant REIT', kind: 'P', color: 'Y', title: 'REIT εστιατορίων', cost: 600, income: 80 },
    { id: 'PY2', en: 'Hospital REIT', kind: 'P', color: 'Y', title: 'REIT νοσοκομείου', cost: 1200, income: 155 },
    { id: 'PY3', en: 'Office REIT', kind: 'P', color: 'Y', title: 'REIT γραφείου', cost: 400, income: 50 },
    { id: 'PY4', en: 'Apartment-block REIT', kind: 'P', color: 'Y', title: 'REIT πολυκατοικίας', cost: 600, income: 80 },
    { id: 'PY5', en: 'Villa REIT', kind: 'P', color: 'Y', title: 'REIT βίλας', cost: 1000, income: 130 },
    { id: 'PY6', en: 'Multinational REIT', kind: 'P', color: 'Y', title: 'REIT πολυεθνικής', cost: 800, income: 105 },
    { id: 'PY7', en: 'Hotel REIT', kind: 'P', color: 'Y', title: 'REIT ξενοδοχείου', cost: 1000, income: 130 },
    { id: 'PY8', en: 'Apartment REIT', kind: 'P', color: 'Y', title: 'REIT διαμερίσματος', cost: 800, income: 105 },
    // Κόκκινο — Μετοχές (~20%)
    { id: 'PR1', en: 'Oil stock', kind: 'P', color: 'R', title: 'Μετοχή πετρελαίου', cost: 1000, income: 200 },
    { id: 'PR2', en: 'Phone-maker stock', kind: 'P', color: 'R', title: 'Μετοχή κατασκευαστή κινητών', cost: 800, income: 160 },
    { id: 'PR3', en: 'Pharma stock', kind: 'P', color: 'R', title: 'Μετοχή φαρμάκων', cost: 600, income: 120 },
    { id: 'PR4', en: 'Car stock', kind: 'P', color: 'R', title: 'Μετοχή αυτοκινήτων', cost: 800, income: 160 },
    { id: 'PR5', en: 'Olive-oil stock', kind: 'P', color: 'R', title: 'Μετοχή ελαιόλαδου', cost: 1000, income: 200 },
    { id: 'PR6', en: 'Social-media stock', kind: 'P', color: 'R', title: 'Μετοχή μέσου κοινωνικής δικτύωσης', cost: 600, income: 120 },
    // Funding — Χρηματοδοτήσεις (8%)
    { id: 'PF1', en: 'Funding: book-resale platform', kind: 'funding', title: 'Χρηματοδότηση πλατφόρμας μεταπώλησης βιβλίων', cost: 1000, income: 80 },
    { id: 'PF2', en: 'Funding: meal prep & delivery service', kind: 'funding', title: 'Χρηματοδότηση υπηρεσίας προετοιμασίας και διαμοιρασμού γευμάτων', cost: 2000, income: 160 },
    { id: 'PF3', en: 'Funding: guitar & piano lessons website', kind: 'funding', title: 'Χρηματοδότηση ιστοσελίδας διδασκαλίας κιθάρας & πιάνου', cost: 1500, income: 120 },
    { id: 'PF4', en: 'Funding: bike-rental platform', kind: 'funding', title: 'Χρηματοδότηση πλατφόρμας ενοικίασης ποδηλάτων', cost: 1500, income: 120 },
    { id: 'PF5', en: 'Funding: electronics repair shop', kind: 'funding', title: 'Χρηματοδότηση χώρου επισκευής ηλεκτρονικών ειδών', cost: 2000, income: 160 },
    { id: 'PF6', en: 'Funding: theme café', kind: 'funding', title: 'Χρηματοδότηση θε(α)ματικής καφετέριας', cost: 2500, income: 200 },
    { id: 'PF7', en: 'Funding: sustainable food farming', kind: 'funding', title: 'Χρηματοδότηση αειφόρου καλλιέργειας τροφίμων', cost: 1000, income: 80 },
    { id: 'PF8', en: 'Funding: island taxi app', kind: 'funding', title: 'Χρηματοδότηση εφαρμογής ταξί σε νησί', cost: 2500, income: 200 },
    // Ομόλογα (4%/είσπραξη, λήξη στα 10 tokens) · v1.11: +2.000€ ×2 (Υπεραξία 80€), +1.500€ (Υπεραξία 60€)
    { id: 'PB1', en: 'Government Bond', kind: 'bond', title: 'Κρατικό Ομόλογο', cost: 1000 },
    { id: 'PB2', en: 'Government Bond', kind: 'bond', title: 'Κρατικό Ομόλογο', cost: 1000 },
    { id: 'PB3', en: 'Government Bond', kind: 'bond', title: 'Κρατικό Ομόλογο', cost: 2000 },
    { id: 'PB4', en: 'Government Bond', kind: 'bond', title: 'Κρατικό Ομόλογο', cost: 2000 },
    { id: 'PB5', en: 'Government Bond', kind: 'bond', title: 'Κρατικό Ομόλογο', cost: 1500 },
    // Μεταπτυχιακό — μόνιμη αύξηση μισθού · v1.12: +PM3 1.800€/+180€ (αίτημα Γιώργου)
    { id: 'PM1', en: 'Master\'s degree opportunity', kind: 'masters', title: 'Ευκαιρία για Μεταπτυχιακό', cost: 2400, salaryUp: 240 },
    { id: 'PM2', en: 'Master\'s degree opportunity', kind: 'masters', title: 'Ευκαιρία για Μεταπτυχιακό', cost: 1200, salaryUp: 120 },
    { id: 'PM3', en: 'Master\'s degree opportunity', kind: 'masters', title: 'Ευκαιρία για Μεταπτυχιακό', cost: 1800, salaryUp: 180 }, // v1.12 (αίτημα Γιώργου)
    // Προκαταβολή Φόρου — μόνιμη μείωση εξόδου «Φόροι»
    { id: 'PT1', en: 'Tax prepayment', kind: 'taxprepay', title: 'Προκαταβολή Φόρου', cost: 2400, taxDown: 120 },
    { id: 'PT2', en: 'Tax prepayment', kind: 'taxprepay', title: 'Προκαταβολή Φόρου', cost: 1600, taxDown: 80 },
    // Ευνοϊκότερο Δάνειο — v1.11: -3 δόσεις (ήταν -2)
    { id: 'PL1', en: 'Better loan terms', kind: 'betterloan', title: 'Ευνοϊκότερο Δάνειο', cost: 500, fewerPayments: 3 },
    { id: 'PL2', en: 'Better loan terms', kind: 'betterloan', title: 'Ευνοϊκότερο Δάνειο', cost: 400, fewerPayments: 3 },
    { id: 'PL3', en: 'Better loan terms', kind: 'betterloan', title: 'Ευνοϊκότερο Δάνειο', cost: 600, fewerPayments: 3 },
  ];

  // ---------- BIG BUSINESS (20) — δεν σκάνε, μόνο φορολογούνται. Αφαιρούνται όταν αγοραστούν ----------
  const BIG_BUSINESS = [
    { id: 'BB01', en: 'Renewable-energy power station', title: 'Σταθμός παραγωγής ανανεώσιμης ενέργειας.', cost: 9000, income: 540 },
    { id: 'BB02', en: 'Painting platform for young people', title: 'Πλατφόρμα ζωγραφικής για νέους.', cost: 8000, income: 480 },
    { id: 'BB03', en: 'EV charging station', title: 'Σταθμός φόρτισης ηλεκτρικών αυτοκινήτων.', cost: 8000, income: 440 },
    { id: 'BB04', en: 'Downtown storage-space rental', title: 'Ενοικίαση αποθηκευτικού χώρου στο κέντρο της πόλης.', cost: 6000, income: 390 },
    { id: 'BB05', en: 'Organic strawberry farm', title: 'Αγροτεμάχιο με βιολογικές φράουλες.', cost: 6000, income: 330 },
    { id: 'BB06', en: '3D-printing business', title: 'Επιχείρηση με εκτυπωτές για 3D Printing.', cost: 8000, income: 520 },
    { id: 'BB07', en: 'Parking lot next to a university', title: 'Χώρος παρκαρίσματος δίπλα σε πανεπιστήμιο.', cost: 6000, income: 360 },
    { id: 'BB08', en: 'Writing short stories for children', title: 'Συγγραφή μικρών ιστοριών για παιδιά.', cost: 8000, income: 480 },
    { id: 'BB09', en: 'Pet care hotel', title: 'Ξενοδοχείο φροντίδας κατοικίδιων.', cost: 9000, income: 585 },
    { id: 'BB10', en: 'You create the board game \'I Quit\'', title: 'Δημιουργείς το επιτραπέζιο «I Quit».', cost: 4000, income: 280 },
    { id: 'BB11', en: 'Vegetarian restaurant', title: 'Εστιατόριο για χορτοφάγους.', cost: 9000, income: 495 },
    { id: 'BB12', en: 'Algorithm for smarter public-transport coordination', title: 'Αλγόριθμος για καλύτερο συντονισμό στις συγκοινωνίες.', cost: 5000, income: 300 },
    { id: 'BB13', en: 'Apartment in Chania with a sea view', title: 'Διαμέρισμα στα Χανιά με θέα την θάλασσα.', cost: 10000, income: 600 },
    { id: 'BB14', en: 'Recycled-materials clothing store', title: 'Κατάστημα εμπορίου ρούχων από ανακυκλώσιμα υλικά.', cost: 7000, income: 420 },
    { id: 'BB15', en: 'Digital education programme', title: 'Πρόγραμμα ψηφιακής εκπαίδευσης.', cost: 5000, income: 325 },
    { id: 'BB16', en: 'Beach canteen', title: 'Καντίνα δίπλα σε παραλία.', cost: 5000, income: 275 },
    { id: 'BB17', en: 'Bitcoin mining with renewable energy', title: 'Εξόρυξη Bitcoin με ανανεώσιμες πηγές ενέργειας.', cost: 7000, income: 385 },
    { id: 'BB18', en: 'Beach-cleaning machine', title: 'Μηχάνημα καθαρισμού παραλίας από απορρίμματα.', cost: 7000, income: 455 },
    { id: 'BB19', en: 'Apartment in Heraklion with a mountain view', title: 'Διαμέρισμα στο Ηράκλειο με θέα το βουνό.', cost: 10000, income: 600 },
    { id: 'BB20', en: 'Creative engagement & socialising platform for seniors', title: 'Πλατφόρμα δημιουργικής απασχόλησης και κοινωνικοποίησης για μεγαλύτερες ηλικίες.', cost: 5000, income: 300 },
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
    { t: 'inflation',label: 'Inflation' },               // 7 (γωνία)
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
    { t: 'inflation',label: 'Inflation' },               // 21 (γωνία)
    { t: 'project',  label: 'Project' },                 // 22
    { t: 'moments',  label: 'Moments' },                 // 23
    { t: 'crash',    label: 'Crash', colors: ['Y','R'] },// 24
    { t: 'bb',       label: 'Big Business' },            // 25
    { t: 'project',  label: 'Project' },                 // 26
    { t: 'tax',      label: 'Tax' },                     // 27
  ];

  return { LIFESTYLE, MOMENTS, PROJECTS, BIG_BUSINESS, BOARD };
});
