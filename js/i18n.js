/* I QUIT! — i18n: Ελληνικά / English (v0.9).
   Σημείωση: το ΙΣΤΟΡΙΚΟ παιχνιδιού παράγεται στον host και εμφανίζεται στη γλώσσα του host.
   Όλο το υπόλοιπο UI, οι κάρτες, οι κανόνες και το ερωτηματολόγιο μεταφράζονται ανά παίκτη. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IQ_I18N = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const D = {
    el: {
      // Home
      tagline: 'Ένα παιχνίδι οικονομικού αλφαβητισμού',
      yourName: 'Το όνομά σου', namePh: 'π.χ. Γιώργος',
      newGame: 'Νέο παιχνίδι', createRoom: '🎲 Δημιουργία δωματίου', creating: 'Δημιουργία…',
      joinRoom: 'Μπες σε δωμάτιο', codePh: 'ΚΩΔ.', joinBtn: 'Είσοδος →',
      homeFoot: '1-5 παίκτες<br>Νίκη: παθητικό εισόδημα ≥ έξοδα πριν τα 65!',
      // v1.27 SEO: τίτλος σελίδας + εισαγωγική ενότητα «Τι είναι το I QUIT!»
      pageTitle: 'I QUIT! — Online παιχνίδι οικονομικού αλφαβητισμού',
      metaDesc: 'Παίξε το I QUIT!, ένα online επιτραπέζιο παιχνίδι οικονομικού αλφαβητισμού. Μάθε αποταμίευση, επενδύσεις, δάνεια και οικονομική ανεξαρτησία παίζοντας με φίλους.',
      // Αύγουστος 2.4 — Welcome / Intro
      introTitle: 'I QUIT! — Το παιχνίδι οικονομικού αλφαβητισμού.',
      introBody1: 'Μια προσομοίωση της οικονομικής ζωής, όπου κάθε απόφαση έχει συνέπειες.',
      introBody2: 'Επένδυσε, δημιούργησε παθητικό εισόδημα και προσπάθησε να αποκτήσεις οικονομική ανεξαρτησία πριν τα 65.',
      introQuestion: 'Θα καταφέρεις να κάνεις I QUIT! ή οι υποχρεώσεις και τα ρίσκα θα σε κρατήσουν στη δουλειά;',
      introContinue: 'Πάτησε για συνέχεια',
      // Αύγουστος 2.3 — Seasonal Leaderboard
      lbTitle: 'TOP ΠΑΙΚΤΕΣ', lbEnds: 'Λήγει', lbPts: 'pts', lbPoints: 'πόντοι', lbYou: 'Εσύ',
      lbYouNoWin: 'Δεν έχεις βαθμολογημένη νίκη ακόμη.', lbEmpty: 'Δεν υπάρχουν ακόμη βαθμολογημένες νίκες.',
      lbBeFirst: 'Γίνε ο πρώτος!', lbAccountNote: 'Χρειάζεται επιβεβαιωμένος λογαριασμός για συμμετοχή.',
      lbPlayer: 'Παίκτης', lbLoading: 'Φόρτωση κατάταξης…', lbUnavailable: 'Η κατάταξη δεν είναι διαθέσιμη αυτή τη στιγμή.',
      lbRetry: 'Δοκίμασε ξανά', lbMonthsQ1: 'Ιανουάριος–Μάρτιος', lbMonthsQ2: 'Απρίλιος–Ιούνιος',
      lbMonthsQ3: 'Ιούλιος–Σεπτέμβριος', lbMonthsQ4: 'Οκτώβριος–Δεκέμβριος',
      // Προαιρετικοί λογαριασμοί — το email δεν εμφανίζεται ποτέ σε άλλους παίκτες
      accTitle: 'Λογαριασμός (προαιρετικός)',
      accSignup: 'Εγγραφή', accLogin: 'Σύνδεση',
      accEmailPh: 'Email', accPassPh: 'Κωδικός (6+ χαρακτήρες)',
      accSignupBtn: '✉️ Δημιουργία λογαριασμού', accLoginBtn: '🔑 Σύνδεση',
      accForgot: 'Ξέχασα τον κωδικό μου', accLogout: 'Αποσύνδεση',
      accGuestNote: 'Μπορείς να παίζεις κανονικά ως επισκέπτης — ο λογαριασμός είναι εντελώς προαιρετικός.',
      accVerifySent: 'Σου στείλαμε email επιβεβαίωσης στο {email}. Άνοιξέ το και μετά πάτα «Έλεγχος».',
      accResetSent: 'Στάλθηκε email επαναφοράς κωδικού στο {email}.',
      accUnverified: 'Το email δεν έχει επιβεβαιωθεί',
      accVerified: 'Email επιβεβαιωμένο', accSignedIn: 'Συνδεδεμένος',
      accVerifyBody: 'Επιβεβαίωσε το email σου για να διαλέξεις δημόσιο username.',
      accResend: '✉️ Ξαναστείλε το email', accRecheck: '🔄 Έλεγχος',
      accVerifiedNow: 'Το email επιβεβαιώθηκε! Διάλεξε τώρα username.',
      accStillUnverified: 'Δεν έχει επιβεβαιωθεί ακόμα. Άνοιξε τον σύνδεσμο στο email σου και ξαναπροσπάθησε.',
      accPickUserBody: 'Διάλεξε μοναδικό username 3-20 χαρακτήρων (ελληνικά ή λατινικά γράμματα, αριθμοί, _). Αυτό βλέπουν οι συμπαίκτες σου.',
      accUserPh: 'π.χ. Giorgos_95', accClaimBtn: '✅ Κατοχύρωση username',
      accUserSet: 'Έτοιμο! Θα εμφανίζεσαι ως «{name}».',
      accUseNote: 'Οι άλλοι παίκτες βλέπουν μόνο το username σου — ποτέ το email σου.',
      accLoggedOut: 'Αποσυνδέθηκες. Συνεχίζεις ως επισκέπτης.',
      accProfileLoading: 'Φόρτωση προφίλ…',
      accProfileError: 'Δεν ήταν δυνατή η φόρτωση του προφίλ',
      accRetry: '🔄 Δοκίμασε ξανά',
      accErrUserEmpty: 'Γράψε ένα username.',
      accErrUserSpace: 'Το username δεν μπορεί να έχει κενά.',
      accErrUserLen: 'Το username πρέπει να έχει 3 έως 20 χαρακτήρες.',
      accErrUserChars: 'Επιτρέπονται μόνο ελληνικά/λατινικά γράμματα, αριθμοί και _.',
      accErrUserTaken: 'Αυτό το username χρησιμοποιείται ήδη — δοκίμασε άλλο.',
      accErrEmailUsed: 'Αυτό το email χρησιμοποιείται ήδη. Δοκίμασε «Σύνδεση».',
      accErrEmailBad: 'Μη έγκυρο email.',
      accErrWeakPass: 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.',
      accErrWrongPass: 'Λάθος email ή κωδικός.',
      accErrNoUser: 'Δεν βρέθηκε λογαριασμός με αυτό το email.',
      accErrFields: 'Συμπλήρωσε email και κωδικό.',
      accErrTooMany: 'Πολλές προσπάθειες — δοκίμασε ξανά σε λίγο.',
      accErrVerification: 'Η επιβεβαίωση email ή η συνεδρία σου δεν είναι ενημερωμένη. Πάτησε «Έλεγχος» και δοκίμασε ξανά.',
      accErrPermission: 'Η κατοχύρωση απορρίφθηκε από την υπηρεσία. Έλεγξε τη συνεδρία ή τη ρύθμιση πρόσβασης και δοκίμασε ξανά.',
      accErrNetwork: 'Η σύνδεση διακόπηκε. Έλεγξε το internet σου και δοκίμασε ξανά.',
      accErrDatabase: 'Η βάση δεδομένων δεν είναι διαθέσιμη αυτή τη στιγμή. Δοκίμασε ξανά.',
      accErrUnexpected: 'Παρουσιάστηκε απρόσμενο σφάλμα. Δοκίμασε ξανά.',
      accErrBadLink: 'Ο σύνδεσμος επιβεβαίωσης έληξε ή δεν είναι έγκυρος. Ζήτησε νέο.',
      accErrLinkFailed: 'Η σύνδεση του λογαριασμού απέτυχε. Δοκίμασε αποσύνδεση και μετά «Σύνδεση».',
      accErrInRoom: 'Βγες πρώτα από το δωμάτιο για να αλλάξεις λογαριασμό.',
      accErrGeneric: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.',
      aboutTitle: 'Τι είναι το I QUIT!',
      aboutBody: '<p>Το <b>I QUIT!</b> είναι ένα online επιτραπέζιο παιχνίδι οικονομικού αλφαβητισμού. Μάθε αποταμίευση, επενδύσεις, δάνεια και οικονομική ανεξαρτησία παίζοντας με φίλους.</p>' +
        '<p>Ξεκινάς στα 25 με μισθό και έξοδα, και σε κάθε γύρο αποφασίζεις πού θα βάλεις τα χρήματά σου: επενδύσεις που φέρνουν παθητικό εισόδημα, Ταμείο Έκτακτης Ανάγκης ή αποπληρωμή δανείων — αντιμετωπίζοντας πληθωρισμό, φόρους και απρόοπτα.</p>' +
        '<p>Νικητής είναι όποιος φτάσει πρώτος στην οικονομική του ελευθερία: όταν το παθητικό εισόδημα καλύψει όλα τα έξοδα, φωνάζεις «I QUIT!»</p>',
      rulesBtn: '📜 Κανόνες', resumeHost: '▶ Συνέχεια παιχνιδιού «{code}» (host)', resumeGuest: '▶ Επανασύνδεση στο δωμάτιο {code}',
      codeLen: 'Ο κωδικός δωματίου έχει 4 χαρακτήρες.',
      // v1.32: ήταν hardcoded ελληνικά μέσα στο ui.js (ο guest τα έβλεπε ελληνικά και σε EN)
      roomFull: 'Το δωμάτιο είναι γεμάτο ({n} παίκτες).',
      roomStarted: 'Το παιχνίδι έχει ήδη ξεκινήσει σε αυτό το δωμάτιο.',
      inviteMsg: 'Πρόσκληση στο δωμάτιο «{code}»! Γράψε το όνομά σου και πάτα «Είσοδος».',
      // Lobby
      room: 'Δωμάτιο', shareBtn: '📤 Κοινοποίηση κωδικού', players: 'Παίκτες', pickPawn: 'Διάλεξε το πιόνι σου',
      addBot: '🤖 Πρόσθεσε bot', botsLbl: 'Bots', startBtn: '🚀 Έναρξη παιχνιδιού',
      guestWait: 'Περιμένουμε τον host να ξεκινήσει το παιχνίδι…', leave: 'Αποχώρηση',
      scoreLobbyHint: 'Για να μετρήσει το παιχνίδι στο seasonal ranking, όλοι οι πραγματικοί παίκτες πρέπει να έχουν επιβεβαιωμένο λογαριασμό.',
      you: '(εσύ)', online: 'online', offline: 'offline',
      shareText: 'Παίζουμε I QUIT! 🎲 Πάτα το link και μπαίνεις κατευθείαν στο δωμάτιό μου: {url}',
      copied: '📋 Αντιγράφηκε το link πρόσκλησης!',
      strat_aggressive: 'Επιθετικός', strat_defensive: 'Αμυντικός', strat_balanced: 'Ισορροπημένος',
      strat_tycoon: 'Μεγιστάνας', strat_stockpicker: 'Χρηματιστής', strat_scholar: 'Ακαδημαϊκός',
      // Game
      yourTurn: '▶ Η σειρά σου!', playing: 'Παίζει: {name}', gameOver: 'Τέλος παιχνιδιού',
      roll: '🎲 Ρίξε τα ζάρια', deciding: ' αποφασίζει…', rolling: ' ρίχνει ζάρια…',
      yourDecision: 'Δική σου απόφαση — δες το παράθυρο', results: '🏆 Αποτελέσματα',
      chat: '💬 Συνομιλία', chatPh: 'Γράψε μήνυμα…', chatHello: 'Πες ένα γεια στους συμπαίκτες σου…', log: 'Ιστορικό',
      spectating: 'Παρακολουθείς το παιχνίδι.',
      retired: '🎉 Παραιτήθηκες στα {age}! Απόλαυσε την οικονομική σου ελευθερία.',
      finished65: '⏳ Έφτασες τα 65. Περιμένουμε την τελική κατάταξη…',
      meterLbl: 'I QUIT meter — κάλυψη εξόδων', age: 'Ηλικία',
      cash: 'Μετρητά', passive: 'Παθητικό', salary: 'Μισθός', expenses: 'Έξοδα',
      netPer: 'Καθαρό ανά είσπραξη:', wild: 'Wild',
      expByCat: 'Έξοδα ανά κατηγορία', inflatedTag: '(πληθωρισμένα ×{m})', totalExp: 'Σύνολο εξόδων',
      portfolio: 'Χαρτοφυλάκιο', totalInv: 'Σύνολο επενδύσεων', totalInvInc: 'Σύνολο εισπράξεων από επενδύσεις', valueTag: 'αξία {v}', noInv: 'Δεν έχεις επενδύσεις ακόμα.',
      perCollect: '/εισπρ.', sellBond: 'Πώληση +{v}', sellToPlayer: 'Πώληση σε παίκτη',
      loans: '🏦 Δάνεια', debt: '(χρέος {v})', loanRow: 'Δάνειο {v}', installments: '{n} δόσεις × {p}',
      pay1: '1 δόση', payoff: 'Εξόφληση {v}', newLoanPh: 'Νέο δάνειο έως {v}', loanBtn: '+ Δάνειο',
      loanHint: 'Έως όσο η αξία των επενδύσεών σου ({v}) − υπάρχον χρέος κεφαλαίου · πολλαπλάσια του 100€ · 20 δόσεις × 10% · έως 3 δάνεια σε όλο το παιχνίδι · εξόφληση υποχρεωτική πριν το I QUIT',
      quitBlocked: '💡 Το παθητικό σου καλύπτει τα έξοδα — εξόφλησε τα δάνεια για να πατήσεις I QUIT!',
      loanCap: '🔒 Χρησιμοποίησες και τα {n} δάνεια που επιτρέπονται σε όλο το παιχνίδι.',
      yearsOld: '{n} ετών', passiveShort: 'Παθητικό {v}', iquitAt: 'I QUIT στα {age}!', at65: 'στα 65',
      bankruptTag: 'Χρεοκοπία', bankruptNote: '💥 Χρεοκόπησες — αρνητικά μετρητά χωρίς περιουσία για πώληση. Εκτός παιχνιδιού.',
      // v1.5: αποχώρηση από topbar + player analytics
      leaveTitle: '🏠 Επιστροφή στην αρχική;', leaveBody: 'Θα σταματήσεις την παρτίδα. Είσαι σίγουρος/η;', leaveYes: 'Ναι, σταμάτα την παρτίδα',
      analyticsBtn: '📊 Αναλυτικά', analyticsTitle: '📊 Αναλυτικά παρτίδας',
      analyticsLegend: '✔ = αγόρασε · ✋ = απέρριψε ενώ τα μετρητά επαρκούσαν. Οι κάρτες μέσω Wild μετρούν στη δεύτερη κάρτα.',
      statBought: 'αγόρασε', statSkipped: 'απέρριψε ενώ μπορούσε',
      // v1.6: ΑΠΟΤΑΜΙΕΥΣΗ (Ταμείο Έκτακτης Ανάγκης)
      savings: 'Αποταμίευση', savTitle: 'ΤΑΜΕΙΟ ΕΚΤΑΚΤΗΣ ΑΝΑΓΚΗΣ',
      savAsk: 'Έκλεισες τα {age} — θα αποταμιεύσεις;',
      savExplain: 'Βάλε χρήματα στην άκρη για ώρα ανάγκης. Τα απρόοπτα είναι μέρος της ζωής και ένα οικονομικό μαξιλάρι μπορεί να σε βοηθήσει να τα αντιμετωπίσεις χωρίς να ανατρέψεις τον σχεδιασμό σου.',
      savBalance: 'Μετρητά: {c} · Αποταμίευση: {v}',
      savDeposit: '🐖 Κατάθεση', savSkip: '✋ Όχι τώρα', savWithdraw: '💶 Ανάληψη όλων ({v})',
      savTakeTip: 'Ανάληψη όλης της αποταμίευσης (επιτρέπεται: 60+ ή meter 100%)',
      lg_savDeposit: '🐖 {n}: αποταμίευσε {a} (σύνολο ταμείου {s})',
      lg_savWithdraw: '💶 {n}: ανάληψη όλης της αποταμίευσης (+{a})',
      lg_savPaid: '🐖 {n}: το «{title}» ({v}) πληρώθηκε από την ΑΠΟΤΑΜΙΕΥΣΗ με −30% → μόνο {d} (υπόλοιπο {s}). Η πρόνοια επιβραβεύεται!',
      lg_savRescue: '🆘 {n}: η αποταμίευση ({a}) ρευστοποιήθηκε in extremis για να αποφευχθεί η χρεοκοπία.',
      taxTitle: '💸 ΦΟΡΟΣ', taxBody: 'Πρέπει να πληρώσεις φόρο <b>{v}</b> — το 50% του παθητικού εισοδήματος των Big Business σου:', taxTotal: 'Σύνολο φόρου', taxPayBtn: '💸 Πληρωμή Φόρου', taxSavNote: '🐖 Η ΑΠΟΤΑΜΙΕΥΣΗ σου καλύπτει ολόκληρο τον φόρο — θα πληρώσεις μόνο {d} (−30% επιβράβευση πρόνοιας)!',
      celTitle: 'ΣΥΓΧΑΡΗΤΗΡΙΑ, ΤΑ ΚΑΤΑΦΕΡΕΣ!', celBody: 'Πέτυχες την οικονομική σου ελευθερία στα <b>{age}</b>! Το παθητικό σου εισόδημα καλύπτει πλέον όλα τα έξοδά σου. I QUIT!', celBtn: '🎉 Συνέχεια',
      lg_savTax: '🐖 {n}: ο φόρος BB ({v}) πληρώθηκε από την ΑΠΟΤΑΜΙΕΥΣΗ με −30% → μόνο {d} (υπόλοιπο {s}).',
      // v1.8: κάρτα απώλειας Crash/Funding Fails + host migration
      crashLostBody: 'Η επένδυση χάθηκε λόγω κακής αξιολόγησης ρίσκου. Οι υψηλές αποδόσεις κουβαλούν υψηλό ρίσκο!',
      ffailLostBody: 'Η Χρηματοδότηση απέτυχε.',
      hostLost: 'Χάθηκε η σύνδεση με τον host…',
      takingOver: 'Ο host χάθηκε — αναλαμβάνεις εσύ το δωμάτιο!',
      nowHost: 'Είσαι ο νέος host — το παιχνίδι συνεχίζεται!',
      roomTakenJoin: 'Το δωμάτιο συνεχίζεται από άλλον παίκτη — μπαίνεις ξανά ως παίκτης.',
      // v1.9: εκπαιδευτικό «συννεφάκι» δίπλα στο ταμπλό
      hintT_PG: '🟢 Αμοιβαίο Κεφάλαιο', hintB_PG: 'Πολλοί επενδυτές βάζουν μαζί χρήματα σε ένα «καλάθι» επενδύσεων που το διαχειρίζονται επαγγελματίες. Χαμηλό ρίσκο, μικρή αλλά σταθερή απόδοση.',
      hintT_PY: '🟡 REIT<br><span style="font-weight:400; font-size:11px;">Real Estate Investment Trust</span>', hintB_PY: 'Αγοράζεις ένα ποσοστό από ακίνητα και εισπράττεις μερίδιο από τα ενοίκιά τους. Μεσαίο ρίσκο, μεσαία απόδοση.',
      hintT_PR: '🔴 Μετοχή', hintB_PR: 'Αγοράζεις ένα κομμάτι ιδιοκτησίας μιας εταιρείας. Υψηλή δυνητική απόδοση — αλλά υψηλό ρίσκο: είναι ευάλωτη στα Crash!',
      hintT_funding: '💼 Χρηματοδότηση', hintB_funding: 'Χρηματοδοτείς ένα εγχείρημα (π.χ. μια επιχείρηση) και παίρνεις μερίδιο από τα κέρδη του. Προσοχή: μπορεί να χαθεί στο Funding Fails. Μπορείς και να τη μεταπωλήσεις σε άλλον παίκτη.',
      hintT_bond: '🏛️ Ομόλογο', hintB_bond: 'Δανείζεις τα χρήματά σου και εισπράττεις σταθερό τόκο 4% σε κάθε είσπραξη. Στη λήξη (10 tokens) παίρνεις πίσω το κεφάλαιο. Ασφάλεια & ρευστότητα — δεν μετρά όμως στο I QUIT meter.',
      hintT_masters: '🎓 Μεταπτυχιακό', hintB_masters: 'Η καλύτερη επένδυση είναι στον εαυτό σου: αυξάνει ΜΟΝΙΜΑ τον μισθό σου για όλο το υπόλοιπο παιχνίδι.',
      hintT_taxprepay: '🧾 Προκαταβολή Φόρου', hintB_taxprepay: 'Πληρώνεις κάτι τώρα για να μειώσεις ΜΟΝΙΜΑ τα μηνιαία σου έξοδα φόρων. Όσο νωρίτερα, τόσο περισσότερο αποδίδει.',
      hintT_betterloan: '🏦 Ευνοϊκότερο Δάνειο', hintB_betterloan: 'Καλύτεροι όροι δανεισμού: −3 δόσεις στο μεγαλύτερο ενεργό δάνειό σου (ή στο επόμενο που θα πάρεις).',
      hintT_bb: '🏆 BIG BUSINESS', hintB_bb: 'Μεγάλες, σταθερές επενδύσεις με αξία από 4.000€ έως 10.000€.',
      hintT_lifestyle: '🏠 LIFESTYLE', hintB_lifestyle: 'Ο τρόπος ζωής σου αλλάζει μόνιμα τα μηνιαία έξοδά σου.',
      hintT_moments: '🎁 MOMENTS', hintB_moments: 'Γεγονότα της ζωής. Κερδίζεις ή χάνεις χρήματα μία φορά. Η ΑΠΟΤΑΜΙΕΥΣΗ καλύπτει τα αρνητικά MOMENTS με έκπτωση 30%, εφόσον επαρκεί για ολόκληρο το ποσό. Τα ποσά από τις θετικές κάρτες προστίθενται στα ΜΕΤΡΗΤΑ.',
      hintT_inflation: '📈 INFLATION', hintB_inflation: 'Αυξάνει μόνιμα τα έξοδα όλων, καθώς και το κόστος των καρτών LIFESTYLE.',
      hintT_crash: '💥 CRASH', hintB_crash: 'Χάνεις μία επένδυση του αντίστοιχου χρώματος. Αν έχεις περισσότερες από μία, χάνεται εκείνη με τη μεγαλύτερη απόδοση.',
      hintT_ffail: '❌ FUNDING FAILS', hintB_ffail: 'Αποτυχία χρηματοδότησης. Χάνεις μία κάρτα χρηματοδότησης. Αν έχεις περισσότερες από μία, χάνεται εκείνη με τη μεγαλύτερη αξία.',
      hintT_savings: '🐖 ΑΠΟΤΑΜΙΕΥΣΗ', hintB_savings: 'Ταμείο Έκτακτης Ανάγκης. Κλείδωσε χρήματα για ώρα ανάγκης. Οι αρνητικές κάρτες MOMENTS πληρώνονται πρώτα από εκεί.',
      hintT_project: '📁 PROJECT', hintB_project: 'Κάρτες μικρότερου κόστους που περιλαμβάνουν επενδύσεις και οικονομικές ευκαιρίες. Οι επενδυτικές κάρτες μπορεί να χαθούν στο αντίστοιχο CRASH ή FAIL.',
      hintT_salary: '💰 SALARY / STARTING POINT', hintB_salary: 'Κάθε φορά που περνάς ή σταματάς εδώ, εισπράττεις: ΜΙΣΘΟΣ − ΕΞΟΔΑ + ΠΑΘΗΤΙΚΟ ΕΙΣΟΔΗΜΑ − ΔΟΣΕΙΣ ΔΑΝΕΙΩΝ. Παράλληλα, η ηλικία σου αυξάνεται κατά 1 έτος.',
      hintT_tax: '💸 TAX', hintB_tax: 'Πληρώνεις φόρο με βάση τις κάρτες BIG BUSINESS που διαθέτεις.',
      hintT_forced: '⚠️ Αναγκαστική Πώληση', hintB_forced: 'Τα μετρητά σου έγιναν αρνητικά — πουλάς ΜΟΝΟ Big Business (στο 80%) ή Ομόλογα (στο 100%). Αν δεν έχεις τίποτα από τα δύο, χρεοκοπείς! Γι’ αυτό χρειάζεσαι πάντα «μαξιλάρι» ρευστότητας.',
      hintT_offer: '🤝 Προσφορά Χρηματοδότησης', hintB_offer: 'Ένας παίκτης σου προσφέρει Χρηματοδότησή του. Σύγκρινε τιμή και εισόδημα πριν αποφασίσεις — καμιά φορά η μεταπώληση συμφέρει και τους δύο.',
      // v1.15: Ξενάγηση (guided tour)
      tourBtn: '🧭 Ξενάγηση',
      tourNext: 'Επόμενο →', tourBack: '← Πίσω', tourSkip: 'Παράλειψη ξενάγησης', tourFinish: 'Τέλος ✓',
      tourChat1: 'Καλή τύχη! 🎲', tourChat2: 'Θα σε κερδίσω! 😄',
      tourT_board: '🎲 Το ταμπλό', tourB_board: 'Εδώ εξελίσσεται το παιχνίδι. Ρίχνεις τα ζάρια, το πιόνι σου μετακινείται και ενεργοποιείς το κουτί στο οποίο προσγειώνεσαι.',
      tourT_stacks: '🃏 Οι στοίβες καρτών', tourB_stacks: 'Στις 4 γωνίες του ταμπλό (φωτίζονται τώρα): <b>Lifestyle</b> — μόνιμες αλλαγές στα μηνιαία έξοδά σου · <b>Moments</b> — εφάπαξ γεγονότα ζωής · <b>Project</b> — επενδύσεις (αμοιβαία, REITs, μετοχές, ομόλογα, σπουδές) · <b>Big Business</b> — μεγάλες, σταθερές επενδύσεις.',
      tourT_meter: '📊 Το I QUIT meter', tourB_meter: 'Δείχνει την αναλογία παθητικού εισοδήματος προς έξοδα. Όταν φτάσει το 100% (και έχεις μηδέν δάνεια), αποκτάς οικονομική ελευθερία — I QUIT!',
      tourT_stats: '💰 Τα οικονομικά σου', tourB_stats: 'Μετρητά, Αποταμίευση (το ταμείο έκτακτης ανάγκης), Παθητικό εισόδημα, Μισθός, Έξοδα. Σε κάθε πέρασμα από Salary ή Starting Point εισπράττεις: Μισθός − Έξοδα + Παθητικό − δόσεις δανείων.',
      tourT_portfolio: '📈 Το χαρτοφυλάκιό σου', tourB_portfolio: 'Οι επενδύσεις σου και το εισόδημα που αποδίδουν ανά είσπραξη. Εδώ βλέπεις και τα δάνειά σου — αποπληρώνεις δόσεις, πουλάς ομόλογα, παίρνεις νέο δάνειο.',
      tourT_log: '📜 Το ιστορικό', tourB_log: 'Ό,τι συμβαίνει στην παρτίδα καταγράφεται εδώ: ζαριές, αγορές, πληθωρισμοί, I QUIT.',
      tourT_chat: '💬 Η συνομιλία', tourB_chat: 'Κουβέντιασε ζωντανά με τους αντιπάλους σου όσο παίζετε.',
      tourT_roll: '🎯 Η σειρά σου', tourB_roll: 'Όταν έρθει η σειρά σου, εδώ εμφανίζεται το κουμπί για να ρίξεις τα ζάρια. Πάνω δεξιά βλέπεις πάντα ποιος παίζει.',
      tourT_done: '🚀 Έτοιμος!', tourB_done: 'Δημιούργησε ή μπες σε ένα δωμάτιο για να ξεκινήσεις. Καλή πορεία προς την οικονομική ελευθερία!',
      stat_G: '🟢 Πράσινα Projects', stat_Y: '🟡 Κίτρινα Projects', stat_R: '🔴 Κόκκινα Projects',
      stat_funding: '💼 Χρηματοδοτήσεις', stat_bb: '🏆 Big Business', stat_bond: '🏛️ Ομόλογα',
      stat_masters: '🎓 Μεταπτυχιακό', stat_taxprepay: '🧾 Προκαταβολή Φόρου', stat_betterloan: '🏦 Καλύτεροι Όροι Δανείου',
      // Cards & modals
      cost: 'Κόστος:', perCycle: '/ Είσπραξη', permanent: '/ Είσπραξη (μόνιμα)', each: ' — έκαστος',
      baseInfl: '(βασικό {v} + πληθωρισμός)', cancelsLS: 'Αναιρεί τις αντίστοιχες Lifestyle κάρτες σου ✨',
      yourCash: 'Μετρητά σου: {v}', buy: '✔ Αγορά {v}', decline: '✋ Όχι, ευχαριστώ',
      buyLoan: '🏦 Αγορά με δάνειο (λείπουν {v})',
      buyLoanInfo: 'Θα πάρεις δάνειο {a} → θα αποπληρώσεις {t} σε {n} δόσεις των {p}',
      buyLoanBtn: '🏦 Αγορά με δάνειο',
      buyLoanFlex: 'Διάλεξε ποσό (πολλαπλάσια 100€, έως {max}) — μπορείς να πάρεις παραπάνω για μαξιλάρι ρευστότητας. {n} δόσεις × 10% του ποσού.',
      wildBtn: '🃏 Wild Card → τράβα {deck} ({n} διαθέσιμες)',
      sellBondModal: '🏛️ Πώληση ομολόγου ({t}/10) → +{v}',
      discountOffer: 'Ο προηγούμενος παίκτης δεν την αγόρασε — τη θέλεις με έκπτωση 10%;',
      cardOf: 'Κάρτα του παίκτη <b>{name}</b>', decidesNow: 'Ο <b>{name}</b> αποφασίζει…',
      okRead: 'ΟΚ, το διάβασα ✔', everyoneSees: 'Όλοι οι παίκτες βλέπουν αυτή την κάρτα',
      inflTitle: 'ΠΛΗΘΩΡΙΣΜΟΣ', inflBody: 'Τα μηνιαία έξοδα όλων των παικτών αυξήθηκαν κατά {r}%, όπως και όλες οι κάρτες Lifestyle. (Όποιος έχει κάνει I QUIT δεν επηρεάζεται.)',
      landedBy: 'Την πάτησε ο <b>{name}</b>',
      bondEffect: '+{v} στο ταμείο σε κάθε είσπραξη',
      bondNote: 'Λήξη στα 10 tokens → επιστροφή κεφαλαίου {v} · πωλείται όποτε θες · ανεπηρέαστο από πληθωρισμό · δεν μετράει στο I QUIT meter ούτε στο όριο δανείου',
      mastersEffect: 'Μισθός +{v} μόνιμα', taxprepayEffect: 'Έξοδο «Φόροι» −{v} μόνιμα', betterloanEffect: '−{n} δόσεις δανείου',
      lsPartnerCat: 'LIFESTYLE — ΕΚΑΣΤΟΣ', lsPartnerBody: '{cat}: <b>{d}€</b> για σένα ΚΑΙ για όποιον διαλέξεις',
      forcedTitle: '⚠️ Αναγκαστική πώληση',
      forcedBody: 'Τα μετρητά σου είναι {v}. Πούλα Big Business (80% της αξίας) ή Ομόλογα (στο κεφάλαιό τους) μέχρι να καλύψεις το έλλειμμα — τα Projects ΔΕΝ πωλούνται εδώ.',
      offerCat: 'ΠΡΟΣΦΟΡΑ ΧΡΗΜΑΤΟΔΟΤΗΣΗΣ', offerBody: 'Ο {name} σου την προσφέρει για <b>{v}</b>',
      fundingSale: 'Πώληση Χρηματοδότησης', fundingMin: '«{title}» — ελάχιστη τιμή {v}', cancel: 'Άκυρο',
      noTargets: 'Δεν υπάρχουν διαθέσιμοι παίκτες.',
      loanConfirmTitle: '🏦 Πρόταση δανείου',
      loanC1: 'Θα λάβεις τώρα:', loanC2: 'Θα πληρώνεις σε κάθε είσπραξη:', loanC3: 'Συνολικά θα αποπληρώσεις:', loanC4: 'Δηλαδή κόστος δανεισμού (τόκοι):',
      loanC5: '💡 Το δάνειο αξίζει όταν το παθητικό εισόδημα που θα αγοράσεις ξεπερνά αυτό το κόστος — και θυμήσου: δεν κάνεις I QUIT όσο χρωστάς!',
      loanYes: 'Ναι, το παίρνω', loanNo: 'Άκυρο — το ξανασκέφτομαι',
      loanX100: '⚠️ Το δάνειο δίνεται σε πολλαπλάσια του 100€ — δοκίμασε {v}.',
      // End
      finalRank: 'Τελική Κατάταξη', iquitFree: 'I QUIT στα {age} — οικονομική ελευθερία!',
      survive: '🕒 Το κεφάλαιό {poss} άντεξε για {d} μετά τη συνταξιοδότηση', reached65: 'Έφτασε τα 65',
      scoreVictory: '🏆 Νίκη! +{points} πόντοι',
      scoreIQuit: '🏆 I QUIT! +{points} πόντοι',
      scoreIndependence: 'Απέκτησες οικονομική ανεξαρτησία στα {age}.',
      scorePendingRetry: 'Το αποτέλεσμα καταγράφηκε. Η πίστωση των seasonal πόντων θα επαναληφθεί αυτόματα.',
      scoreFreedom: 'Απέκτησες οικονομική ελευθερία στα {age}.',
      scoreWhy: 'Όσο νωρίτερα κάνεις I QUIT!, τόσο περισσότερους πόντους κερδίζεις.',
      scoreIneligible: 'Η παρτίδα δεν προσμετράται στο seasonal ranking.',
      recTitle: '🛠 Ανάκτηση παλιών νικών',
      recHint: 'Επικόλλησε gameIds (ένα ανά γραμμή) από το τοπικό audit. Ανακτώνται ΜΟΝΟ δικές σου, επιβεβαιωμένες νίκες.',
      recDry: 'Έλεγχος (χωρίς εγγραφή)',
      recApply: 'Ανάκτηση',
      recNone: 'Καμία ανακτήσιμη νίκη.',
      scoreRecovered: '✅ Ανακτήθηκαν {points} παλιοί πόντοι από {wins} προηγούμενες νίκες.',
      scoreRecovered1: '✅ Ανακτήθηκαν {points} παλιοί πόντοι από 1 προηγούμενη νίκη.',
      scorePending: 'Καταγράφεται το seasonal score…',
      scoreSaveError: 'Η νίκη καταγράφηκε, αλλά το seasonal score δεν αποθηκεύτηκε ακόμη. Θα γίνει ασφαλής επανάληψη στην επανασύνδεση.',
      playAgain: '🔁 Νέο παιχνίδι (ίδιοι παίκτες)', exit: 'Έξοδος', feedbackBtn: '📝 Πες μας τη γνώμη σου (1′)',
      // Feedback
      fbTitle: '📝 Η γνώμη σου μετράει!', fbIntro: 'Ανώνυμο, 14 σύντομες ερωτήσεις — βοηθάς το I QUIT! να γίνει καλύτερο.',
      fbSubmit: 'Αποστολή', fbThanks: '🙏 Ευχαριστούμε! Η απάντησή σου στάλθηκε.', fbErr: 'Δεν στάλθηκε — έλεγξε τη σύνδεση και δοκίμασε ξανά.',
      fbOptional: '(προαιρετικό)',
      reconn: '🔌 Ο {name} επανασυνδέθηκε', disconn: '🔌 Ο {name} αποσυνδέθηκε — αν δεν επιστρέψει, παίζει το AI για εκείνον.',
      autoMove: '🤖 Αυτόματη κίνηση για τον {name} (αποσυνδεδεμένος)',
      // Expense categories (τα κλειδιά του engine είναι ελληνικά)
      exp_Φόροι: 'Φόροι', exp_Ενοίκιο: 'Ενοίκιο', exp_Μεταφορικά: 'Μεταφορικά', exp_Διατροφή: 'Διατροφή',
      exp_Ένδυση: 'Ένδυση', exp_Ψυχαγωγία: 'Ψυχαγωγία', exp_Ασφάλεια: 'Ασφάλεια', exp_Παιδί: 'Παιδί',
      color_G: 'ΠΡΑΣΙΝΟ', color_Y: 'ΚΙΤΡΙΝΟ', color_R: 'ΚΟΚΚΙΝΟ',
      cat_funding: 'PROJECT — ΧΡΗΜΑΤΟΔΟΤΗΣΗ', cat_bond: 'PROJECT — ΟΜΟΛΟΓΟ', cat_masters: 'PROJECT — ΜΕΤΑΠΤΥΧΙΑΚΟ',
      cat_taxprepay: 'PROJECT — ΦΟΡΟΣ', cat_betterloan: 'PROJECT — ΔΑΝΕΙΟ',
      hideLog: 'Απόκρυψη', showLog: 'Εμφάνιση',
      // ---- Ιστορικό (δομημένα events v1.0) ----
      lg_start: '🎲 Το παιχνίδι ξεκίνησε! Η κλήρωση έδειξε: πρώτος παίζει {ol} {n}.',
      lg_endRet: '🏁 Τέλος παιχνιδιού! Νικητής: {n} (παραίτηση στα {age})',
      lg_endNo: '🏁 Τέλος παιχνιδιού! Νικητής: {n}',
      lg_roll: '🎲 {n} έριξε {d1}+{d2} = {s}',
      lg_collect: '💰 {n}: είσπραξη {net} · ηλικία {age}',
      lg_collectB: '💰 {n}: είσπραξη {net} (+{bi} τόκοι ομολόγων) · ηλικία {age}',
      lg_collectL: '💰 {n}: είσπραξη {net} (−{lp} δόσεις δανείων) · ηλικία {age}',
      lg_collectBL: '💰 {n}: είσπραξη {net} (+{bi} τόκοι ομολόγων, −{lp} δόσεις δανείων) · ηλικία {age}',
      lg_career: '🎖️ Career Bonus! {o} {n} έκλεισε τα {age} → μισθός +500€ (νέος: {s})',
      lg_bondMature: '🏛️ {n}: λήξη ομολόγου → επιστροφή κεφαλαίου +{v}',
      lg_quitBlocked: '⚠️ {n}: το παθητικό ({pas}) καλύπτει τα έξοδα ({exp}), αλλά για I QUIT πρέπει πρώτα να εξοφλήσει τα δάνειά του ({owed})!',
      lg_iquit: '🎉 I QUIT! {o} {n} παραιτήθηκε στα {age} (παθητικό {pas} ≥ έξοδα {exp}, χωρίς χρέη)',
      lg_iquitInstant: '🎉 I QUIT! {o} {n} πέτυχε την οικονομική ελευθερία στα {age} — παθητικό {pas} ≥ έξοδα {exp} και μηδέν χρέη!',
      lg_forcedLoanSettle: '🏦 {n}: υποχρεωτική εξόφληση δανείων −{v}',
      lg_reached65: '⏳ {o} {n} έφτασε τα 65 χωρίς παραίτηση.',
      lg_inflation: '📈 Πληθωρισμός {r}%: τα μηνιαία έξοδα όλων των παικτών αυξήθηκαν κατά {r}%, όπως και όλες οι κάρτες Lifestyle.',
      lg_forcedNeeded: '⚠️ {n}: δεν επαρκούν τα μετρητά ({v}) — αναγκαστική πώληση στο 80%.',
      lg_negNoAssets: '🔴 {n}: αρνητικά μετρητά χωρίς περιουσιακά στοιχεία ({v}).',
      lg_bankrupt: '💥 ΧΡΕΟΚΟΠΙΑ! {o} {n} έμεινε με {v} και τίποτα να πουλήσει — εκτός παιχνιδιού.',
      lg_emptyProject: 'ℹ️ Η στοίβα Project είναι άδεια.', lg_emptyBB: 'ℹ️ Δεν έχουν μείνει κάρτες Big Business.',
      lg_emptyLifestyle: 'ℹ️ Η στοίβα Lifestyle είναι άδεια.', lg_emptyMoments: 'ℹ️ Η στοίβα Moments είναι άδεια.',
      lg_tax: '🧾 Tax: {n} πληρώνει 50% του εισοδήματος BB = −{v}',
      lg_taxBot: '🤖 {o} {n} πλήρωσε φόρο {v}.',
      lg_taxNone: '🧾 Tax: {ol} {n} δεν έχει εισόδημα από Big Business.',
      lg_crashMiss: '💥 Crash ({colors}): {ol} {n} δεν έχει Project σε αυτά τα χρώματα — τη γλίτωσε!',
      lg_crashHit: '💥 Crash! {o} {n} χάνει: {title} ({v}, −{inc}/είσπραξη)',
      lg_ffMiss: '💥 Funding Fails: {ol} {n} δεν έχει Χρηματοδοτήσεις — τη γλίτωσε!',
      lg_ffHit: '💥 Funding Fails! {o} {n} χάνει: {title} ({v})',
      lg_lifestyle: '🏠 Lifestyle: {n} — «{title}» → {cat} {d}€',
      lg_lifestyleInfl: '🏠 Lifestyle: {n} — «{title}» → {cat} {d}€ (με πληθωρισμό)',
      lg_lifestyleEach: '🏠 Lifestyle (Έκαστος): «{title}» → {n} & {n2}: {cat} {d}€ ο καθένας',
      lg_momentCancel: '🌱 Moment: {n} — «{title}» → αναιρέθηκε: {list}',
      lg_momentCancelNone: '🌱 Moment: {n} — «{title}» (δεν είχε τις αντίστοιχες κάρτες — καμία επίδραση)',
      lg_moment: '{e} Moment: {n} — «{title}» → {v}',
      lg_momentInfl: '{e} Moment: {n} — «{title}» → {v} (με πληθωρισμό)',
      lg_buyBB: '🏆 {n} αγόρασε Big Business: «{title}» {v} → +{inc}/είσπραξη',
      lg_buyBBDisc: '🏆 {n} αγόρασε Big Business: «{title}» {v} (έκπτωση -10%) → +{inc}/είσπραξη',
      lg_buyP: '📊 {n} αγόρασε Project {colors}: «{title}» {v} → +{inc}/είσπραξη',
      lg_buyF: '🤝 {n} αγόρασε Χρηματοδότηση: «{title}» {v} → +{inc}/είσπραξη',
      lg_buyBond: '🏛️ {n} αγόρασε Κρατικό Ομόλογο {v} (4%/είσπραξη, λήξη στα 10 tokens)',
      lg_masters: '🎓 {n} έκανε Μεταπτυχιακό ({v}) → μισθός +{up} (νέος: {s})',
      lg_taxprepay: '🧾 {n} πλήρωσε Προκαταβολή Φόρου ({v}) → Φόροι −{d}/είσπραξη',
      lg_blActive: '🏦 {n} — Ευνοϊκότερο Δάνειο: −{f} δόσεις στο δάνειο των {a} (μένουν {r})',
      lg_blFuture: '🏦 {n} — Ευνοϊκότερο Δάνειο: −{f} δόσεις στο μελλοντικό δάνειο',
      lg_loanTaken: '🏦 {n} πήρε δάνειο {a} ({r} δόσεις × {pay})',
      lg_loanDone: '🏦 {n} εξόφλησε πλήρως το δάνειο των {a} ✓',
      lg_repayFull: '🏦 {n} εξόφλησε πλήρως το δάνειο των {a} (−{v}) ✓',
      lg_repayPart: '🏦 {n} πλήρωσε {c} δόσεις (−{v}) · μένουν {r}',
      lg_bondSold: '🏛️ {n} πούλησε ομόλογο ({t}/10 tokens) → επιστροφή κεφαλαίου +{v}',
      lg_offer: '🤝 {n} προσφέρει τη Χρηματοδότηση «{title}» {acc2} {n2} για {v}',
      lg_wildToBB: '🃏 {n} έπαιξε Wild Card: Project → Big Business ({w} απομένουν)',
      lg_wildToP: '🃏 {n} έπαιξε Wild Card: Big Business → Project ({w} απομένουν)',
      lg_passDisc: '➡️ {o} {n} δεν αγόρασε «{title}» — {ol2} {n2} μπορεί να την πάρει με -10% ({v})',
      lg_declined: '✋ {n} δεν αγόρασε: «{title}»',
      lg_forcedSold: '🔻 Αναγκαστική πώληση: {n} — «{title}» → +{v}',
      lg_offerAccepted: '🤝 {o} {n} αγόρασε τη «{title}» από {ton2} {n2} για {v}',
      lg_offerDeclined: '✋ {o} {n} αρνήθηκε την προσφορά Χρηματοδότησης.',
    },
    en: {
      tagline: 'A financial literacy game',
      yourName: 'Your name', namePh: 'e.g. George',
      newGame: 'New game', createRoom: '🎲 Create a room', creating: 'Creating…',
      joinRoom: 'Join a room', codePh: 'CODE', joinBtn: 'Join →',
      homeFoot: '1-5 players<br>Win: passive income ≥ expenses before age 65!',
      // v1.27 SEO
      pageTitle: 'I QUIT! — Online Financial Literacy Board Game',
      metaDesc: 'Play I QUIT!, an online financial literacy board game. Learn about saving, investing, loans and financial independence while playing with friends.',
      // August 2.4 — Welcome / Intro
      introTitle: 'I QUIT! — The financial literacy game.',
      introBody1: 'A simulation of financial life, where every decision has consequences.',
      introBody2: 'Invest, build passive income, and try to achieve financial independence before the age of 65.',
      introQuestion: 'Will you manage to say I QUIT!, or will obligations and risks keep you working?',
      introContinue: 'Tap to continue',
      // August 2.3 — Seasonal Leaderboard
      lbTitle: 'TOP PLAYERS', lbEnds: 'Ends', lbPts: 'pts', lbPoints: 'points', lbYou: 'You',
      lbYouNoWin: 'You do not have a ranked win yet.', lbEmpty: 'No ranked wins yet.',
      lbBeFirst: 'Be the first!', lbAccountNote: 'A verified account is required to participate.',
      lbPlayer: 'Player', lbLoading: 'Loading leaderboard…', lbUnavailable: 'The leaderboard is unavailable right now.',
      lbRetry: 'Try again', lbMonthsQ1: 'January–March', lbMonthsQ2: 'April–June',
      lbMonthsQ3: 'July–September', lbMonthsQ4: 'October–December',
      // Optional accounts — email is never shown to other players
      accTitle: 'Account (optional)',
      accSignup: 'Sign up', accLogin: 'Log in',
      accEmailPh: 'Email', accPassPh: 'Password (6+ characters)',
      accSignupBtn: '✉️ Create account', accLoginBtn: '🔑 Log in',
      accForgot: 'I forgot my password', accLogout: 'Log out',
      accGuestNote: 'You can keep playing as a guest — an account is completely optional.',
      accVerifySent: 'We sent a verification email to {email}. Open it, then press “Check”.',
      accResetSent: 'Password reset email sent to {email}.',
      accUnverified: 'Email not verified',
      accVerified: 'Email verified', accSignedIn: 'Signed in',
      accVerifyBody: 'Verify your email to choose a public username.',
      accResend: '✉️ Resend email', accRecheck: '🔄 Check',
      accVerifiedNow: 'Email verified! Now pick a username.',
      accStillUnverified: 'Not verified yet. Open the link in your email and try again.',
      accPickUserBody: 'Pick a unique username, 3-20 characters (Greek or Latin letters, numbers, _). This is what your fellow players see.',
      accUserPh: 'e.g. George_95', accClaimBtn: '✅ Claim username',
      accUserSet: 'Done! You will appear as “{name}”.',
      accUseNote: 'Other players only ever see your username — never your email.',
      accLoggedOut: 'Logged out. You continue as a guest.',
      accProfileLoading: 'Loading profile…',
      accProfileError: 'We could not load your profile',
      accRetry: '🔄 Try again',
      accErrUserEmpty: 'Enter a username.',
      accErrUserSpace: 'Usernames cannot contain spaces.',
      accErrUserLen: 'Username must be 3 to 20 characters.',
      accErrUserChars: 'Only Greek/Latin letters, numbers and _ are allowed.',
      accErrUserTaken: 'That username is already taken — try another one.',
      accErrEmailUsed: 'That email is already in use. Try “Log in”.',
      accErrEmailBad: 'Invalid email.',
      accErrWeakPass: 'Password must be at least 6 characters.',
      accErrWrongPass: 'Wrong email or password.',
      accErrNoUser: 'No account found with that email.',
      accErrFields: 'Fill in email and password.',
      accErrTooMany: 'Too many attempts — try again shortly.',
      accErrVerification: 'Your email verification or session is not up to date. Press “Check” and try again.',
      accErrPermission: 'The service rejected the claim. Check your session or access configuration and try again.',
      accErrNetwork: 'The connection was interrupted. Check your internet and try again.',
      accErrDatabase: 'The database is currently unavailable. Try again.',
      accErrUnexpected: 'An unexpected error occurred. Try again.',
      accErrBadLink: 'The verification link expired or is invalid. Request a new one.',
      accErrLinkFailed: 'Linking the account failed. Try logging out, then “Log in”.',
      accErrInRoom: 'Leave the room first to change account.',
      accErrGeneric: 'Something went wrong. Please try again.',
      aboutTitle: 'What is I QUIT!?',
      aboutBody: '<p><b>I QUIT!</b> is an online financial literacy board game. Learn about saving, investing, loans and financial independence while playing with friends.</p>' +
        '<p>You start at 25 with a salary and expenses, and every round you decide where your money goes: investments that generate passive income, an Emergency Fund, or paying off loans — all while facing inflation, taxes and life events.</p>' +
        '<p>The winner is whoever reaches financial freedom first: when your passive income covers all your expenses, you shout “I QUIT!”</p>',
      rulesBtn: '📜 Rules', resumeHost: '▶ Resume game “{code}” (host)', resumeGuest: '▶ Reconnect to room {code}',
      codeLen: 'Room codes have 4 characters.',
      roomFull: 'This room is full ({n} players).',
      roomStarted: 'The game in this room has already started.',
      inviteMsg: 'You are invited to room “{code}”! Type your name and press “Join”.',
      room: 'Room', shareBtn: '📤 Share invite link', players: 'Players', pickPawn: 'Pick your pawn',
      addBot: '🤖 Add a bot', botsLbl: 'Bots', startBtn: '🚀 Start game',
      guestWait: 'Waiting for the host to start the game…', leave: 'Leave',
      scoreLobbyHint: 'For the game to count toward the seasonal ranking, every human player must have a verified account.',
      you: '(you)', online: 'online', offline: 'offline',
      shareText: 'We are playing I QUIT! 🎲 Tap the link to join my room: {url}',
      copied: '📋 Invite link copied!',
      strat_aggressive: 'Aggressive', strat_defensive: 'Defensive', strat_balanced: 'Balanced',
      strat_tycoon: 'Tycoon', strat_stockpicker: 'Stock Picker', strat_scholar: 'Scholar',
      yourTurn: '▶ Your turn!', playing: 'Playing: {name}', gameOver: 'Game over',
      roll: '🎲 Roll the dice', deciding: ' is deciding…', rolling: ' is rolling…',
      yourDecision: 'Your decision — see the card window', results: '🏆 Results',
      chat: '💬 Chat', chatPh: 'Type a message…', chatHello: 'Say hi to your fellow players…', log: 'History',
      spectating: 'You are spectating.',
      retired: '🎉 You retired at {age}! Enjoy your financial freedom.',
      finished65: '⏳ You reached 65. Waiting for the final ranking…',
      meterLbl: 'I QUIT meter — expense coverage', age: 'Age',
      cash: 'Cash', passive: 'Passive', salary: 'Salary', expenses: 'Expenses',
      netPer: 'Net per payday:', wild: 'Wild',
      expByCat: 'Expenses by category', inflatedTag: '(inflated ×{m})', totalExp: 'Total expenses',
      portfolio: 'Portfolio', totalInv: 'Total investments', totalInvInc: 'Total income from investments', valueTag: 'value {v}', noInv: 'No investments yet.',
      perCollect: '/payday', sellBond: 'Sell +{v}', sellToPlayer: 'Sell to player',
      loans: '🏦 Loans', debt: '(debt {v})', loanRow: 'Loan {v}', installments: '{n} payments × {p}',
      pay1: '1 payment', payoff: 'Pay off {v}', newLoanPh: 'New loan up to {v}', loanBtn: '+ Loan',
      loanHint: 'Up to the value of your investments ({v}) − existing principal debt · multiples of €100 · 20 payments × 10% · max 3 loans per game · must be fully repaid before I QUIT',
      quitBlocked: '💡 Your passive income covers your expenses — pay off your loans to hit I QUIT!',
      loanCap: '🔒 You have used all {n} loans allowed for the whole game.',
      yearsOld: 'age {n}', passiveShort: 'Passive {v}', iquitAt: 'I QUIT at {age}!', at65: 'at 65',
      bankruptTag: 'Bankrupt', bankruptNote: '💥 You went bankrupt — negative cash with nothing to sell. Out of the game.',
      leaveTitle: '🏠 Back to home?', leaveBody: 'This will stop the current game. Are you sure?', leaveYes: 'Yes, stop the game',
      analyticsBtn: '📊 Details', analyticsTitle: '📊 Game analytics',
      analyticsLegend: '✔ = bought · ✋ = declined while having enough cash. Cards drawn via Wild count on the second card.',
      statBought: 'bought', statSkipped: 'declined while affordable',
      savings: 'Savings', savTitle: 'EMERGENCY FUND',
      savAsk: 'You just turned {age} — save some money?',
      savExplain: 'Put money aside for a rainy day. Surprises are part of life — a financial cushion helps you handle them without derailing your plan.',
      savBalance: 'Cash: {c} · Savings: {v}',
      savDeposit: '🐖 Deposit', savSkip: '✋ Not now', savWithdraw: '💶 Withdraw all ({v})',
      savTakeTip: 'Withdraw all savings (allowed: 60+ or meter at 100%)',
      lg_savDeposit: '🐖 {n}: saved {a} (fund total {s})',
      lg_savWithdraw: '💶 {n}: withdrew all savings (+{a})',
      lg_savPaid: '🐖 {n}: “{title}” ({v}) was paid from SAVINGS at −30% → only {d} (remaining {s}). Foresight pays off!',
      lg_savRescue: '🆘 {n}: savings ({a}) were liquidated in extremis to avoid bankruptcy.',
      taxTitle: '💸 TAX', taxBody: 'You must pay <b>{v}</b> in tax — 50% of your Big Business passive income:', taxTotal: 'Total tax', taxPayBtn: '💸 Pay Tax', taxSavNote: '🐖 Your SAVINGS cover the full tax — you will only pay {d} (−30% foresight reward)!',
      celTitle: 'CONGRATULATIONS, YOU MADE IT!', celBody: 'You reached financial freedom at <b>{age}</b>! Your passive income now covers all your expenses. I QUIT!', celBtn: '🎉 Continue',
      lg_savTax: '🐖 {n}: BB tax ({v}) was paid from SAVINGS at −30% → only {d} (remaining {s}).',
      crashLostBody: 'The investment was lost to poor risk assessment. High returns carry high risk!',
      ffailLostBody: 'The funding failed.',
      hostLost: 'Lost connection to the host…',
      takingOver: 'The host is gone — you are taking over the room!',
      nowHost: 'You are the new host — the game continues!',
      roomTakenJoin: 'The room continues under another player — rejoining as a player.',
      hintT_PG: '🟢 Mutual Fund', hintB_PG: 'Many investors pool their money into a professionally managed “basket” of investments. Low risk, small but steady returns.',
      hintT_PY: '🟡 REIT<br><span style="font-weight:400; font-size:11px;">Real Estate Investment Trust</span>', hintB_PY: 'You buy a share of real estate and collect part of the rents. Medium risk, medium return.',
      hintT_PR: '🔴 Stock', hintB_PR: 'You buy a piece of ownership in a company. High potential returns — but high risk: vulnerable to Crashes!',
      hintT_funding: '💼 Funding', hintB_funding: 'You fund a venture and take a share of its profits. Careful: it can be lost in Funding Fails. You can also resell it to another player.',
      hintT_bond: '🏛️ Bond', hintB_bond: 'You lend your money for a fixed 4% interest each payday. At maturity (10 tokens) you get the principal back. Safety & liquidity — but it doesn’t count toward the I QUIT meter.',
      hintT_masters: '🎓 Master’s Degree', hintB_masters: 'The best investment is in yourself: it PERMANENTLY raises your salary for the rest of the game.',
      hintT_taxprepay: '🧾 Tax Prepayment', hintB_taxprepay: 'Pay something now to PERMANENTLY lower your monthly taxes. The earlier, the better it pays off.',
      hintT_betterloan: '🏦 Better Loan Terms', hintB_betterloan: 'Better borrowing terms: −3 installments on your largest active loan (or your next one).',
      hintT_bb: '🏆 BIG BUSINESS', hintB_bb: 'Large, stable investments valued from €4,000 to €10,000.',
      hintT_lifestyle: '🏠 LIFESTYLE', hintB_lifestyle: 'Your lifestyle permanently changes your monthly expenses.',
      hintT_moments: '🎁 MOMENTS', hintB_moments: 'Life events. You gain or lose money once. SAVINGS cover negative MOMENTS at a 30% discount, as long as they cover the full amount. Positive amounts are added to your CASH.',
      hintT_inflation: '📈 INFLATION', hintB_inflation: 'Permanently raises everyone’s expenses, as well as the cost of LIFESTYLE cards.',
      hintT_crash: '💥 CRASH', hintB_crash: 'You lose one investment of the matching colour. If you own more than one, the one with the highest yield is lost.',
      hintT_ffail: '❌ FUNDING FAILS', hintB_ffail: 'Funding failure. You lose one funding card. If you own more than one, the one with the highest value is lost.',
      hintT_savings: '🐖 SAVINGS', hintB_savings: 'Emergency Fund. Lock money away for a rainy day. Negative MOMENTS cards are paid from here first.',
      hintT_project: '📁 PROJECT', hintB_project: 'Lower-cost cards with investments and financial opportunities. Investment cards can be lost to the matching CRASH or FAIL.',
      hintT_salary: '💰 SALARY / STARTING POINT', hintB_salary: 'Every time you pass or land here you collect: SALARY − EXPENSES + PASSIVE INCOME − LOAN INSTALLMENTS. Your age also increases by 1 year.',
      hintT_tax: '💸 TAX', hintB_tax: 'You pay tax based on the BIG BUSINESS cards you own.',
      hintT_forced: '⚠️ Forced Sale', hintB_forced: 'Your cash went negative — you may sell ONLY Big Business (at 80%) or Bonds (at 100%). If you own neither, you go bankrupt! That’s why you always need a cash cushion.',
      hintT_offer: '🤝 Funding Offer', hintB_offer: 'A player is offering you one of their Fundings. Compare price and income before deciding — sometimes a resale benefits both.',
      tourBtn: '🧭 Tour',
      tourNext: 'Next →', tourBack: '← Back', tourSkip: 'Skip tour', tourFinish: 'Done ✓',
      tourChat1: 'Good luck! 🎲', tourChat2: 'I will beat you! 😄',
      tourT_board: '🎲 The board', tourB_board: 'This is where the game unfolds. Roll the dice, your pawn moves, and you trigger the square you land on.',
      tourT_stacks: '🃏 The card stacks', tourB_stacks: 'In the 4 corners (glowing now): <b>Lifestyle</b> — permanent changes to your monthly expenses · <b>Moments</b> — one-off life events · <b>Project</b> — investments (funds, REITs, stocks, bonds, studies) · <b>Big Business</b> — big, stable investments.',
      tourT_meter: '📊 The I QUIT meter', tourB_meter: 'Shows your passive income vs expenses. When it hits 100% (with zero loans), you reach financial freedom — I QUIT!',
      tourT_stats: '💰 Your finances', tourB_stats: 'Cash, Savings (your emergency fund), Passive income, Salary, Expenses. Every pass over Salary or Starting Point you collect: Salary − Expenses + Passive − loan installments.',
      tourT_portfolio: '📈 Your portfolio', tourB_portfolio: 'Your investments and the income they yield per payday. Your loans live here too — repay installments, sell bonds, take a new loan.',
      tourT_log: '📜 The history', tourB_log: 'Everything that happens is recorded here: rolls, purchases, inflation, I QUIT.',
      tourT_chat: '💬 The chat', tourB_chat: 'Talk with your opponents while you play.',
      tourT_roll: '🎯 Your turn', tourB_roll: 'When it is your turn, the dice button appears here. Top right always shows whose turn it is.',
      tourT_done: '🚀 Ready!', tourB_done: 'Create or join a room to start. Enjoy the road to financial freedom!',
      stat_G: '🟢 Green Projects', stat_Y: '🟡 Yellow Projects', stat_R: '🔴 Red Projects',
      stat_funding: '💼 Funding', stat_bb: '🏆 Big Business', stat_bond: '🏛️ Bonds',
      stat_masters: '🎓 Master’s Degree', stat_taxprepay: '🧾 Tax Prepayment', stat_betterloan: '🏦 Better Loan Terms',
      cost: 'Cost:', perCycle: '/ payday', permanent: '/ payday (permanent)', each: ' — each',
      baseInfl: '(base {v} + inflation)', cancelsLS: 'Cancels your matching Lifestyle cards ✨',
      yourCash: 'Your cash: {v}', buy: '✔ Buy {v}', decline: '✋ No, thanks',
      buyLoan: '🏦 Buy with a loan (missing {v})',
      buyLoanInfo: 'You will borrow {a} → repay {t} in {n} payments of {p}',
      buyLoanBtn: '🏦 Buy with a loan',
      buyLoanFlex: 'Pick an amount (multiples of €100, up to {max}) — you may borrow extra as a cash cushion. {n} payments × 10% of the amount.',
      wildBtn: '🃏 Wild Card → draw {deck} ({n} left)',
      sellBondModal: '🏛️ Sell bond ({t}/10) → +{v}',
      discountOffer: 'The previous player passed — want it at a 10% discount?',
      cardOf: '<b>{name}</b>’s card', decidesNow: '<b>{name}</b> is deciding…',
      okRead: 'OK, got it ✔', everyoneSees: 'All players can see this card',
      inflTitle: 'INFLATION', inflBody: 'Everyone’s monthly expenses increased by {r}%, and so did all Lifestyle cards. (Players who already hit I QUIT are not affected.)',
      landedBy: 'Landed on by <b>{name}</b>',
      bondEffect: '+{v} to your cash every payday',
      bondNote: 'Matures at 10 tokens → principal {v} returned · sell any time · unaffected by inflation · does not count toward the I QUIT meter or the loan limit',
      mastersEffect: 'Salary +{v} permanently', taxprepayEffect: '“Taxes” expense −{v} permanently', betterloanEffect: '−{n} loan payments',
      lsPartnerCat: 'LIFESTYLE — EACH', lsPartnerBody: '{cat}: <b>€{d}</b> for you AND a player of your choice',
      forcedTitle: '⚠️ Forced sale',
      forcedBody: 'Your cash is {v}. Sell Big Business (80% of value) or Bonds (at principal) until you cover the shortfall — Projects can NOT be sold here.',
      offerCat: 'FUNDING OFFER', offerBody: '{name} offers it to you for <b>{v}</b>',
      fundingSale: 'Sell a Funding card', fundingMin: '“{title}” — minimum price {v}', cancel: 'Cancel',
      noTargets: 'No available players.',
      loanConfirmTitle: '🏦 Loan proposal',
      loanC1: 'You receive now:', loanC2: 'You pay every payday:', loanC3: 'You will repay in total:', loanC4: 'That is a borrowing cost (interest) of:',
      loanC5: '💡 A loan is worth it only when the passive income it buys exceeds this cost — and remember: no I QUIT while you owe money!',
      loanYes: 'Yes, take it', loanNo: 'Cancel — let me think',
      loanX100: '⚠️ Loans come in multiples of €100 — try {v}.',
      finalRank: 'Final Ranking', iquitFree: 'I QUIT at {age} — financial freedom!',
      survive: '🕒 Capital lasted {d} after retirement', reached65: 'Reached 65',
      scoreVictory: '🏆 Victory! +{points} points',
      scoreIQuit: '🏆 I QUIT! +{points} points',
      scoreIndependence: 'You achieved financial independence at age {age}.',
      scorePendingRetry: 'Your result was recorded. Your seasonal points will be credited automatically.',
      scoreFreedom: 'You reached financial freedom at {age}.',
      scoreWhy: 'The earlier you make I QUIT!, the more points you earn.',
      scoreIneligible: 'This game does not count toward the seasonal ranking.',
      recTitle: '🛠 Recover past wins',
      recHint: 'Paste gameIds (one per line) from the local audit. Only your own verified wins are recovered.',
      recDry: 'Check (no writes)',
      recApply: 'Recover',
      recNone: 'Nothing to recover.',
      scoreRecovered: '✅ Recovered {points} past points from {wins} previous wins.',
      scoreRecovered1: '✅ Recovered {points} past points from 1 previous win.',
      scorePending: 'Recording seasonal score…',
      scoreSaveError: 'The victory was recorded, but the seasonal score has not been saved yet. It will retry safely after reconnecting.',
      playAgain: '🔁 New game (same players)', exit: 'Exit', feedbackBtn: '📝 Give us your feedback (1′)',
      fbTitle: '📝 Your opinion matters!', fbIntro: 'Anonymous, 14 short questions — help make I QUIT! better.',
      fbSubmit: 'Send', fbThanks: '🙏 Thank you! Your answer was sent.', fbErr: 'Could not send — check your connection and try again.',
      fbOptional: '(optional)',
      reconn: '🔌 {name} reconnected', disconn: '🔌 {name} disconnected — if they don’t return, the AI plays for them.',
      autoMove: '🤖 Auto-move for {name} (disconnected)',
      exp_Φόροι: 'Taxes', exp_Ενοίκιο: 'Rent', exp_Μεταφορικά: 'Transport', exp_Διατροφή: 'Food',
      exp_Ένδυση: 'Clothing', exp_Ψυχαγωγία: 'Entertainment', exp_Ασφάλεια: 'Insurance', exp_Παιδί: 'Child',
      color_G: 'GREEN', color_Y: 'YELLOW', color_R: 'RED',
      cat_funding: 'PROJECT — FUNDING', cat_bond: 'PROJECT — BOND', cat_masters: 'PROJECT — MASTER’S',
      cat_taxprepay: 'PROJECT — TAX', cat_betterloan: 'PROJECT — LOAN',
      hideLog: 'Hide', showLog: 'Show',
      // ---- History (structured events v1.0) ----
      lg_start: '🎲 The game begins! The lottery picked {n} to go first.',
      lg_endRet: '🏁 Game over! Winner: {n} (retired at {age})',
      lg_endNo: '🏁 Game over! Winner: {n}',
      lg_roll: '🎲 {n} rolled {d1}+{d2} = {s}',
      lg_collect: '💰 {n}: payday {net} · age {age}',
      lg_collectB: '💰 {n}: payday {net} (+{bi} bond interest) · age {age}',
      lg_collectL: '💰 {n}: payday {net} (−{lp} loan payments) · age {age}',
      lg_collectBL: '💰 {n}: payday {net} (+{bi} bond interest, −{lp} loan payments) · age {age}',
      lg_career: '🎖️ Career Bonus! {n} turned {age} → salary +€500 (now {s})',
      lg_bondMature: '🏛️ {n}: bond matured → principal returned +{v}',
      lg_quitBlocked: '⚠️ {n}: passive income ({pas}) covers expenses ({exp}), but the loans ({owed}) must be repaid before I QUIT!',
      lg_iquit: '🎉 I QUIT! {n} retired at {age} (passive {pas} ≥ expenses {exp}, debt-free)',
      lg_iquitInstant: '🎉 I QUIT! {n} reached financial freedom at {age} — passive {pas} ≥ expenses {exp} and zero debt!',
      lg_forcedLoanSettle: '🏦 {n}: mandatory loan settlement −{v}',
      lg_reached65: '⏳ {n} reached 65 without retiring.',
      lg_inflation: '📈 Inflation {r}%: everyone’s monthly expenses rose by {r}%, and so did all Lifestyle cards.',
      lg_forcedNeeded: '⚠️ {n}: not enough cash ({v}) — forced sale at 80%.',
      lg_negNoAssets: '🔴 {n}: negative cash with no assets left ({v}).',
      lg_bankrupt: '💥 BANKRUPT! {n} ended up at {v} with nothing left to sell — out of the game.',
      lg_emptyProject: 'ℹ️ The Project deck is empty.', lg_emptyBB: 'ℹ️ No Big Business cards remain.',
      lg_emptyLifestyle: 'ℹ️ The Lifestyle deck is empty.', lg_emptyMoments: 'ℹ️ The Moments deck is empty.',
      lg_tax: '🧾 Tax: {n} pays 50% of BB income = −{v}',
      lg_taxBot: '🤖 {n} paid {v} in tax.',
      lg_taxNone: '🧾 Tax: {n} has no Big Business income.',
      lg_crashMiss: '💥 Crash ({colors}): {n} holds no Projects in these colours — lucky escape!',
      lg_crashHit: '💥 Crash! {n} loses: {title} ({v}, −{inc}/payday)',
      lg_ffMiss: '💥 Funding Fails: {n} holds no Funding cards — lucky escape!',
      lg_ffHit: '💥 Funding Fails! {n} loses: {title} ({v})',
      lg_lifestyle: '🏠 Lifestyle: {n} — “{title}” → {cat} {d}€',
      lg_lifestyleInfl: '🏠 Lifestyle: {n} — “{title}” → {cat} {d}€ (inflation-adjusted)',
      lg_lifestyleEach: '🏠 Lifestyle (Each): “{title}” → {n} & {n2}: {cat} {d}€ each',
      lg_momentCancel: '🌱 Moment: {n} — “{title}” → cancelled: {list}',
      lg_momentCancelNone: '🌱 Moment: {n} — “{title}” (no matching cards — no effect)',
      lg_moment: '{e} Moment: {n} — “{title}” → {v}',
      lg_momentInfl: '{e} Moment: {n} — “{title}” → {v} (inflation-adjusted)',
      lg_buyBB: '🏆 {n} bought Big Business: “{title}” {v} → +{inc}/payday',
      lg_buyBBDisc: '🏆 {n} bought Big Business: “{title}” {v} (10% off) → +{inc}/payday',
      lg_buyP: '📊 {n} bought a {colors} Project: “{title}” {v} → +{inc}/payday',
      lg_buyF: '🤝 {n} bought Funding: “{title}” {v} → +{inc}/payday',
      lg_buyBond: '🏛️ {n} bought a Government Bond {v} (4%/payday, matures at 10 tokens)',
      lg_masters: '🎓 {n} earned a Master’s ({v}) → salary +{up} (now {s})',
      lg_taxprepay: '🧾 {n} paid a Tax Prepayment ({v}) → Taxes −{d}/payday',
      lg_blActive: '🏦 {n} — Better Loan: −{f} payments on the {a} loan ({r} left)',
      lg_blFuture: '🏦 {n} — Better Loan: −{f} payments on their next loan',
      lg_loanTaken: '🏦 {n} took a loan of {a} ({r} payments × {pay})',
      lg_loanDone: '🏦 {n} fully repaid the {a} loan ✓',
      lg_repayFull: '🏦 {n} fully repaid the {a} loan (−{v}) ✓',
      lg_repayPart: '🏦 {n} paid {c} installments (−{v}) · {r} left',
      lg_bondSold: '🏛️ {n} sold a bond ({t}/10 tokens) → principal returned +{v}',
      lg_offer: '🤝 {n} offers the Funding “{title}” to {n2} for {v}',
      lg_wildToBB: '🃏 {n} played a Wild Card: Project → Big Business ({w} left)',
      lg_wildToP: '🃏 {n} played a Wild Card: Big Business → Project ({w} left)',
      lg_passDisc: '➡️ {n} passed on “{title}” — {n2} may take it at −10% ({v})',
      lg_declined: '✋ {n} passed on: “{title}”',
      lg_forcedSold: '🔻 Forced sale: {n} — “{title}” → +{v}',
      lg_offerAccepted: '🤝 {n} bought “{title}” from {n2} for {v}',
      lg_offerDeclined: '✋ {n} declined the Funding offer.',
    },
  };

  // ---------------- ΕΡΩΤΗΜΑΤΟΛΟΓΙΟ (οι 14 εγκεκριμένες ερωτήσεις) ----------------
  const QUEST = [
    { id: 'age', q: { el: 'Ηλικία', en: 'Age' }, opts: [{ el: 'έως 17', en: 'up to 17' }, { el: '18–25', en: '18–25' }, { el: '26–35', en: '26–35' }, { el: '36+', en: '36+' }] },
    { id: 'edu', q: { el: 'Εκπαίδευση', en: 'Education' }, opts: [{ el: 'Γυμνάσιο/Λύκειο', en: 'High school' }, { el: 'ΙΕΚ/Σχολή', en: 'Vocational' }, { el: 'ΑΕΙ/ΤΕΙ', en: 'University' }, { el: 'Μεταπτυχιακό+', en: 'Postgraduate+' }] },
    { id: 'finField', q: { el: 'Σπούδασες ή εργάζεσαι σε οικονομικό αντικείμενο;', en: 'Do you study or work in a financial field?' }, opts: [{ el: 'Ναι', en: 'Yes' }, { el: 'Όχι', en: 'No' }] },
    { id: 'finRel', scale: 5, q: { el: 'Πώς θα περιέγραφες τη σχέση σου με τα οικονομικά; (1 = «δεν τα καταλαβαίνω» … 5 = «τα κατέχω»)', en: 'How would you rate your understanding of finance? (1 = “not at all” … 5 = “very well”)' } },
    { id: 'fun', scale: 5, q: { el: 'Πόσο διασκεδαστικό ήταν το παιχνίδι; (1 κακό … 5 τέλειο)', en: 'How fun was the game? (1 bad … 5 excellent)' } },
    { id: 'rulesEasy', scale: 5, q: { el: 'Πόσο εύκολο ήταν να καταλάβεις τους κανόνες; (1 πολύ δύσκολο … 5 πανεύκολο)', en: 'How easy were the rules to understand? (1 very hard … 5 very easy)' } },
    { id: 'recommend', scale: 5, q: { el: 'Θα το πρότεινες σε φίλο; (1 σίγουρα όχι … 5 σίγουρα ναι)', en: 'Would you recommend it to a friend? (1 definitely not … 5 definitely yes)' } },
    { id: 'replay', q: { el: 'Θα το ξανάπαιζες;', en: 'Would you play again?' }, opts: [{ el: 'Ναι, σύντομα', en: 'Yes, soon' }, { el: 'Ναι, κάποια στιγμή', en: 'Yes, sometime' }, { el: 'Μάλλον όχι', en: 'Probably not' }] },
    { id: 'liked', q: { el: 'Ποιο σημείο σου άρεσε περισσότερο;', en: 'What did you like most?' }, opts: [{ el: 'Επενδύσεις/κάρτες', en: 'Investments/cards' }, { el: 'Ζάρια & κίνηση', en: 'Dice & movement' }, { el: 'Ανταγωνισμός', en: 'Competition' }, { el: 'Ότι μαθαίνω κάτι', en: 'Learning something' }, { el: 'Τα bots', en: 'The bots' }] },
    { id: 'confusing', q: { el: 'Ποιο σημείο σε μπέρδεψε ή σε κούρασε περισσότερο;', en: 'What confused or tired you most?' }, opts: [{ el: 'Δάνεια', en: 'Loans' }, { el: 'Πληθωρισμός', en: 'Inflation' }, { el: 'Ομόλογα', en: 'Bonds' }, { el: 'Φόροι', en: 'Taxes' }, { el: 'Τίποτα', en: 'Nothing' }], other: true },
    { id: 'learned', scale: 5, q: { el: 'Έμαθες κάτι που δεν ήξερες; (1 τίποτα … 5 πολλά)', en: 'Did you learn something new? (1 nothing … 5 a lot)' } },
    { id: 'concept', q: { el: 'Ποια έννοια κατάλαβες καλύτερα χάρη στο παιχνίδι;', en: 'Which concept did the game help you understand best?' }, opts: [{ el: 'Πληθωρισμός', en: 'Inflation' }, { el: 'Παθητικό εισόδημα', en: 'Passive income' }, { el: 'Δάνεια', en: 'Loans' }, { el: 'Ομόλογα', en: 'Bonds' }, { el: 'Ρίσκο/απόδοση', en: 'Risk/return' }, { el: 'Καμία', en: 'None' }] },
    { id: 'explain', q: { el: 'Θα ήθελες το παιχνίδι να εξηγεί περισσότερα ή σε κούρασαν οι επεξηγήσεις;', en: 'Would you like more explanations, or were they too much?' }, opts: [{ el: 'Θέλω περισσότερα', en: 'More please' }, { el: 'Ήταν ιδανικά', en: 'Just right' }, { el: 'Λιγότερα', en: 'Fewer' }] },
    { id: 'change', text: true, q: { el: 'Τι ΕΝΑ πράγμα θα άλλαζες στο παιχνίδι;', en: 'What ONE thing would you change about the game?' } },
  ];
  const FEEDBACK_EMAIL = 'Paraitoumai2023@gmail.com';

  // ---------------- ΚΑΝΟΝΕΣ (κείμενο εγκεκριμένο από τον Γιώργο) ----------------
  const RULES = {
    el: `
<h2>📜 Κανόνες I QUIT!</h2>
<h3>🌍 Η φιλοσοφία του παιχνιδιού</h3>
<p>Καλωσόρισες στο <b>I QUIT!</b></p>
<p>Είσαι 25 ετών και ξεκινάς το ταξίδι σου προς την οικονομική ελευθερία. Έχεις έναν σταθερό μισθό, καθημερινά έξοδα και ένα μεγάλο ερώτημα:</p>
<p><b>Θα συνεχίσεις να δουλεύεις για τα χρήματα ή θα μάθεις να κάνεις τα χρήματα να δουλεύουν για εσένα;</b></p>
<p>Κατά τη διάρκεια του παιχνιδιού θα επενδύσεις, θα αποταμιεύσεις, θα διαχειριστείς δάνεια και θα αποφασίσεις πόσο ρίσκο είσαι διατεθειμένος να αναλάβεις. Παράλληλα, θα αντιμετωπίσεις πληθωρισμό, φόρους, οικονομικές κρίσεις, γεγονότα της καθημερινότητας και νέες οικονομικές ευκαιρίες.</p>
<p>Δεν υπάρχει μία μοναδική σωστή στρατηγική. Κάθε απόφαση έχει κόστος, όφελος και ρίσκο. Στο <b>I QUIT!</b> δεν κερδίζει απλώς εκείνος που συγκεντρώνει τα περισσότερα χρήματα. <b>Κερδίζει εκείνος που αποκτά την οικονομική του ελευθερία νωρίτερα.</b></p>
<h3>🎯 Ο στόχος</h3>
<p>Κάθε παίκτης ξεκινά στην ηλικία των <b>25 ετών</b> με: 💵 Μετρητά 2.000€ · 💼 Μισθό 2.000€ · 🏠 Έξοδα 1.500€.</p>
<p>Στόχος σου είναι να αποκτήσεις επενδύσεις που δημιουργούν παθητικό εισόδημα. Όταν <b>ΠΑΘΗΤΙΚΟ ΕΙΣΟΔΗΜΑ ≥ ΕΞΟΔΑ</b> και δεν έχεις κανένα ενεργό δάνειο, αποκτάς οικονομική ελευθερία και κάνεις <b>I QUIT!</b></p>
<p>Νικητής είναι ο παίκτης που πετυχαίνει το I QUIT! στη μικρότερη ηλικία.</p>
<h3>🎲 Πώς παίζεις</h3>
<p>Όταν έρθει η σειρά σου: <b>1.</b> Ρίχνεις δύο ζάρια. <b>2.</b> Μετακινείς το πιόνι σου. <b>3.</b> Εκτελείς την ενέργεια του κουτιού στο οποίο σταμάτησες. Ο πρώτος παίκτης καθορίζεται με κλήρωση.</p>
<h3>💰 Salary / Starting Point</h3>
<p>Κάθε φορά που περνάς ή σταματάς στο Salary / Starting Point, εισπράττεις: <b>ΜΙΣΘΟΣ − ΕΞΟΔΑ + ΠΑΘΗΤΙΚΟ ΕΙΣΟΔΗΜΑ − ΔΟΣΕΙΣ ΔΑΝΕΙΩΝ</b>. Παράλληλα, η ηλικία σου αυξάνεται κατά 1 έτος.</p>
<p>Σε συγκεκριμένες ηλικίες μπορεί επίσης να ενεργοποιηθεί: αύξηση μισθού μέσω του Career Bonus, νέα δυνατότητα κατάθεσης στο Ταμείο Έκτακτης Ανάγκης, και δυνατότητα ανάληψης της αποταμίευσης στην ηλικία των 60 ετών.</p>
<h3>🟦 Τα κουτάκια του παιχνιδιού</h3>
<p><b>📁 Project</b> — Κάρτες μικρότερου κόστους που περιλαμβάνουν επενδύσεις και οικονομικές ευκαιρίες: Αμοιβαία Κεφάλαια, REITs, Μετοχές, Χρηματοδοτήσεις, Ομόλογα, Ευκαιρία για Μεταπτυχιακό, Προκαταβολή Φόρου, Ευνοϊκότερο Δάνειο. Οι επενδυτικές κάρτες Project μπορεί να χαθούν στο αντίστοιχο Crash ή στο Funding Fails.</p>
<p><b>🏆 Big Business</b> — Μεγάλες και σταθερές επενδύσεις με αξία από <b>4.000€ έως 10.000€</b>. Δημιουργούν παθητικό εισόδημα, δεν χάνονται σε Crash, επηρεάζονται από τη φορολογία και αφαιρούνται οριστικά από τη στοίβα όταν αγοραστούν. Αν δεν αγοράσεις μία Big Business, ο επόμενος παίκτης μπορεί να την αποκτήσει με έκπτωση 10%.</p>
<p><b>🏠 Lifestyle</b> — Αλλάζουν μόνιμα τα μηνιαία έξοδά σου, προς τα πάνω ή προς τα κάτω. Οι κάρτες «Έκαστος» επηρεάζουν εσένα και έναν ακόμη παίκτη της επιλογής σου. Το κόστος των μελλοντικών καρτών Lifestyle αυξάνεται όταν ενεργοποιείται ο πληθωρισμός.</p>
<p><b>🎁 Moments</b> — Γεγονότα της ζωής: κερδίζεις ή χάνεις χρήματα μία φορά. Τα θετικά ποσά προστίθενται στα Μετρητά σου. Τα αρνητικά Moments μπορούν να καλυφθούν από το Ταμείο Έκτακτης Ανάγκης, εφόσον η αποταμίευση επαρκεί για ολόκληρο το ποσό. Υπάρχουν και ειδικές κάρτες που αναιρούν αρνητικές συνήθειες Lifestyle.</p>
<p><b>💥 Crash</b> — Χάνεις μία επένδυση Project του αντίστοιχου χρώματος. Αν έχεις περισσότερες, χάνεται εκείνη με τη μεγαλύτερη απόδοση· σε ισοπαλία, εκείνη με τη μεγαλύτερη αξία. Οι Big Business και τα Ομόλογα δεν χάνονται σε Crash.</p>
<p><b>⚓ Funding Fails</b> — Αποτυχία χρηματοδότησης: χάνεις μία κάρτα Χρηματοδότησης. Αν έχεις περισσότερες, χάνεται εκείνη με τη μεγαλύτερη αξία.</p>
<p><b>💸 Tax</b> — Πληρώνεις φόρο ίσο με <b>το 50% του παθητικού εισοδήματος των Big Business</b> που διαθέτεις. Πριν αφαιρεθεί ο φόρος, εμφανίζεται ενημερωτικό παράθυρο με τις Big Business που φορολογούνται, τον φόρο καθεμίας και το συνολικό ποσό — η πληρωμή γίνεται όταν πατήσεις το κουμπί επιβεβαίωσης. Αν το Ταμείο Έκτακτης Ανάγκης επαρκεί για ολόκληρο τον φόρο, ενεργοποιείται η έκπτωση πρόνοιας 30%.</p>
<p><b>📈 Inflation</b> — Ο πληθωρισμός αυξάνει μόνιμα τα έξοδα όλων των παικτών και το κόστος των μελλοντικών καρτών Lifestyle. Το ποσοστό εξαρτάται από τον αριθμό των παικτών:</p>
<p style="text-align:center;"><b>1 παίκτης: 8% · 2 παίκτες: 5% · 3 παίκτες: 4%<br>4 παίκτες: 3% · 5 παίκτες: 2% · 6 παίκτες: 1%</b></p>
<p>Ο πληθωρισμός δεν επηρεάζει τα Μετρητά, την αξία των επενδύσεων και τα ποσά των καρτών Moments.</p>
<h3>🐖 Ταμείο Έκτακτης Ανάγκης</h3>
<p>Από την ηλικία των 25 ετών και κάθε 5 χρόνια, μπορείς να τοποθετήσεις χρήματα στο Ταμείο Έκτακτης Ανάγκης, σε πολλαπλάσια των 50€. Τα χρήματα αυτά αφαιρούνται από τα Μετρητά, παραμένουν κλειδωμένα, δεν χρησιμοποιούνται για αγορές ή επενδύσεις, και μπορούν να καλύψουν αρνητικά Moments και φόρους Big Business.</p>
<p>Αν η αποταμίευσή σου επαρκεί για <b>ολόκληρο</b> το απαιτούμενο ποσό, πληρώνεις από την αποταμίευση μόνο το 70% — έκπτωση <b>30%</b>, ως επιβράβευση της οικονομικής πρόνοιας. Αν δεν επαρκεί, η πληρωμή γίνεται κανονικά από τα Μετρητά, χωρίς έκπτωση.</p>
<p>Μπορείς να κάνεις ανάληψη ολόκληρου του ποσού στην ηλικία των 60 ετών — ή νωρίτερα, μόλις το I QUIT! Meter φτάσει το <b>100%</b> (το παθητικό σου εισόδημα καλύπτει όλα τα έξοδά σου). Η αποταμίευση προσμετράται στο συνολικό κεφάλαιό σου κατά την τελική κατάταξη.</p>
<h3>🏛️ Ομόλογα</h3>
<p>Μπορείς να αγοράσεις Ομόλογα διαφορετικής αξίας (1.000€, 1.500€, 2.000€). Σε κάθε είσπραξη στο Salary / Starting Point λαμβάνεις τόκο 4% και κερδίζεις ένα Bond Token. Στα 10 Bond Tokens το Ομόλογο λήγει και επιστρέφεται το αρχικό κεφάλαιο. Μπορείς επίσης να το πουλήσεις οποιαδήποτε στιγμή στο αρχικό του κεφάλαιο.</p>
<p>Τα Ομόλογα δεν χάνονται σε Crash, δεν προσμετρώνται στο I QUIT! Meter και δεν αυξάνουν το όριο δανεισμού. Αποτελούν εργαλείο ασφάλειας και ρευστότητας.</p>
<h3>🏦 Δάνεια</h3>
<p>Μπορείς να δανειστείς μέχρι το ύψος της αξίας των επενδύσεών σου, εξαιρουμένων των Ομολόγων και αφαιρώντας όσα ήδη χρωστάς. Δεν μπορείς να έχεις περισσότερα από <b>3 δάνεια</b>. Κάθε δάνειο αποπληρώνεται σε <b>20 δόσεις × 10% του αρχικού ποσού</b> — συνολικά επιστρέφεις το διπλάσιο. Οι δόσεις αφαιρούνται σε κάθε πέρασμα από το Salary / Starting Point. Μπορείς να αποπληρώσεις πρόωρα μέρος ή ολόκληρο το υπόλοιπο. <b>Δεν μπορείς να κάνεις I QUIT! όσο έχεις ενεργό δάνειο.</b> Η κάρτα «Ευνοϊκότερο Δάνειο» αφαιρεί 3 δόσεις από ένα ενεργό δάνειο.</p>
<h3>🎖️ Career Bonus</h3>
<p>Στα 35, 45 και 55 ο μισθός σου αυξάνεται μόνιμα κατά 500€. Η επαγγελματική εξέλιξη βοηθά, αλλά από μόνη της δεν εξασφαλίζει την οικονομική ελευθερία.</p>
<h3>🃏 Wild Cards</h3>
<p>Κάθε παίκτης ξεκινά με 5 Wild Cards. Όταν τραβάς Project μπορείς να τραβήξεις Big Business, και αντίστροφα. Κάθε Wild Card χρησιμοποιείται μία φορά — η σωστή στιγμή είναι μέρος της στρατηγικής.</p>
<h3>💶 Δεν φτάνουν τα Μετρητά;</h3>
<p>Όταν τα Μετρητά σου δεν φτάνουν για μια υποχρεωτική πληρωμή, ενεργοποιείται <b>αναγκαστική πώληση</b>: πουλάς <b>Big Business στο 80%</b> της αξίας τους ή <b>Ομόλογα στο 100%</b> του κεφαλαίου τους, μέχρι να καλυφθεί το ποσό. Οι κάρτες Project και οι Χρηματοδοτήσεις δεν πωλούνται. Η ρευστότητα έχει αξία — μία κερδοφόρα επένδυση δεν αντικαθιστά πάντα τα διαθέσιμα Μετρητά.</p>
<h3>⚠️ Χρεοκοπία</h3>
<p>Αν δεν μπορείς να καλύψεις μία υποχρεωτική πληρωμή, γίνεται αναγκαστική πώληση (Big Business στο 80%, Ομόλογα στο 100%). Αν κινδυνεύεις να χρεοκοπήσεις, το παιχνίδι χρησιμοποιεί αυτόματα την Αποταμίευσή σου ως έσχατη λύση — αφαιρείται μόνο το ποσό που απαιτείται (ή όλη, αν δεν επαρκεί), χωρίς την έκπτωση 30%.</p>
<p>Αν, μετά τη χρήση των Μετρητών, της πωλήσιμης περιουσίας και της Αποταμίευσης, το υπόλοιπό σου παραμένει αρνητικό, χρεοκοπείς και τίθεσαι εκτός παιχνιδιού.</p>
<h3>🏁 Τέλος παιχνιδιού</h3>
<p>Μόλις <b>ΠΑΘΗΤΙΚΟ ΕΙΣΟΔΗΜΑ ≥ ΕΞΟΔΑ</b> και δεν έχεις ενεργά δάνεια, πετυχαίνεις την οικονομική ανεξαρτησία και κάνεις I QUIT! Το παιχνίδι συνεχίζεται μέχρι να ολοκληρώσουν όλοι οι παίκτες ή μέχρι τα 65.</p>
<p><b>Τελική κατάταξη:</b> <b>1.</b> Όσοι πέτυχαν I QUIT! — με βάση την ηλικία (μικρότερη = καλύτερη θέση). <b>2.</b> Όσοι έφτασαν στα 65 χωρίς I QUIT! — υπολογίζεται για πόσο θα κάλυπταν το έλλειμμά τους μετά τη συνταξιοδότηση:</p>
<p><b>Διαθέσιμο κεφάλαιο</b> = Μετρητά + Αποταμίευση + Αξία επενδύσεων<br>
<b>Μηνιαίο έλλειμμα</b> = Έξοδα − Παθητικό Εισόδημα<br>
<b>Διάρκεια κεφαλαίου</b> = Διαθέσιμο κεφάλαιο ÷ Μηνιαίο έλλειμμα</p>
<p>Το αποτέλεσμα εμφανίζεται σε χρόνια και μήνες, π.χ. «🕒 Το κεφάλαιό σου άντεξε για 12 χρόνια και 8 μήνες μετά τη συνταξιοδότηση».</p>
<h3>💡 Πέντε μαθήματα ζωής</h3>
<p>🌱 <b>Επένδυσε όσο πιο νωρίς μπορείς.</b> Ο χρόνος και ο ανατοκισμός μπορούν να ενισχύσουν σημαντικά το αποτέλεσμα.<br>
🎯 <b>Διαφοροποίησε το χαρτοφυλάκιό σου.</b> Η υψηλότερη δυνητική απόδοση συνοδεύεται συνήθως από μεγαλύτερο κίνδυνο.<br>
🐖 <b>Δημιούργησε ένα Ταμείο Έκτακτης Ανάγκης.</b> Τα απρόοπτα δεν προβλέπονται πάντα, αλλά μπορείς να είσαι προετοιμασμένος.<br>
🏦 <b>Χρησιμοποίησε το δάνειο ως εργαλείο και όχι ως μόνιμη λύση.</b> Μπορεί να επιταχύνει την πρόοδό σου, αλλά δημιουργεί μακροχρόνιες υποχρεώσεις.<br>
📈 <b>Μην υποτιμάς τον πληθωρισμό.</b> Η οικονομική ελευθερία χτίζεται όταν το εισόδημά σου αυξάνεται γρηγορότερα από τα έξοδά σου.</p>`,
    en: `
<h2>📜 I QUIT! Rules</h2>
<h3>🌍 The philosophy</h3>
<p>Welcome to <b>I QUIT!</b></p>
<p>You are 25 years old, starting your journey toward financial freedom. You have a steady salary, everyday expenses and one big question:</p>
<p><b>Will you keep working for money, or will you learn to make money work for you?</b></p>
<p>During the game you will invest, save, manage loans and decide how much risk you are willing to take — while facing inflation, taxes, financial crises, life events and new opportunities.</p>
<p>There is no single correct strategy. Every decision has a cost, a benefit and a risk. In I QUIT! the winner is not simply whoever gathers the most money. <b>The winner is whoever reaches financial freedom first.</b></p>
<h3>🎯 The goal</h3>
<p>Every player starts at age <b>25</b> with: 💵 Cash €2,000 · 💼 Salary €2,000 · 🏠 Expenses €1,500.</p>
<p>Your goal is to build investments that generate passive income. When <b>PASSIVE INCOME ≥ EXPENSES</b> and you have no active loan, you reach financial freedom and shout <b>I QUIT!</b></p>
<p>The winner is the player who achieves I QUIT! at the youngest age.</p>
<h3>🎲 How to play</h3>
<p>On your turn: <b>1.</b> Roll two dice. <b>2.</b> Move your pawn. <b>3.</b> Resolve the square you land on. The first player is chosen by lottery.</p>
<h3>💰 Salary / Starting Point</h3>
<p>Every time you pass or land here you collect: <b>SALARY − EXPENSES + PASSIVE INCOME − LOAN INSTALLMENTS</b>. Your age also increases by 1 year.</p>
<p>At specific ages you may also trigger: a Career Bonus salary raise, a new Emergency Fund deposit window, and the option to withdraw your savings at age 60.</p>
<h3>🟦 The squares</h3>
<p><b>📁 Project</b> — Lower-cost cards with investments and opportunities: Mutual Funds, REITs, Stocks, Funding, Bonds, a Master’s Degree, Tax Prepayment, Better Loan Terms. Investment Project cards can be lost to the matching Crash or Funding Fails.</p>
<p><b>🏆 Big Business</b> — Large, stable investments valued from <b>€4,000 to €10,000</b>. They generate passive income, never crash, are affected by tax, and are permanently removed from the stack once bought. If you pass, the next player can buy at a 10% discount.</p>
<p><b>🏠 Lifestyle</b> — Permanently changes your monthly expenses, up or down. “Each” cards affect you and one player of your choice. Future Lifestyle cards get more expensive when inflation hits.</p>
<p><b>🎁 Moments</b> — Life events: you gain or lose money once. Positive amounts go to your Cash. Negative Moments can be covered by the Emergency Fund if your savings cover the full amount. Special cards can cancel bad Lifestyle habits.</p>
<p><b>💥 Crash</b> — You lose one Project investment of the matching colour. With several, the one with the highest yield is lost; on a tie, the one with the highest value. Big Business and Bonds never crash.</p>
<p><b>⚓ Funding Fails</b> — A funding failure: you lose one Funding card. With several, the one with the highest value is lost.</p>
<p><b>💸 Tax</b> — You pay <b>50% of the passive income of your Big Business</b>. Before the tax is deducted, a window shows which Big Business are taxed, the tax for each, and the total — payment happens when you press the confirmation button. If your Emergency Fund covers the full tax, the 30% foresight discount applies.</p>
<p><b>📈 Inflation</b> — Permanently raises everyone’s expenses and the cost of future Lifestyle cards. The rate depends on player count:</p>
<p style="text-align:center;"><b>1 player: 8% · 2 players: 5% · 3 players: 4%<br>4 players: 3% · 5 players: 2% · 6 players: 1%</b></p>
<p>Inflation does not affect Cash, investment values, or Moments amounts.</p>
<h3>🐖 Emergency Fund</h3>
<p>From age 25 and every 5 years, you may deposit money into the Emergency Fund, in multiples of €50. This money is deducted from Cash, stays locked, cannot be used for purchases or investments, and can cover negative Moments and Big Business taxes.</p>
<p>If your savings cover the <b>full</b> required amount, you pay only 70% from savings — a <b>30%</b> discount rewarding financial foresight. If not, you pay normally from Cash with no discount.</p>
<p>You may withdraw the full amount at age 60 — or earlier, once the I QUIT! Meter reaches <b>100%</b> (your passive income covers all your expenses). Savings count toward your total capital in the final ranking.</p>
<h3>🏛️ Bonds</h3>
<p>Bonds come in different values (€1,000, €1,500, €2,000). On every payday you receive 4% interest and earn a Bond Token. At 10 Tokens the bond matures and returns its principal. You can also sell it at principal at any time.</p>
<p>Bonds never crash, don’t count toward the I QUIT! Meter and don’t raise your borrowing limit. They are a safety and liquidity tool.</p>
<h3>🏦 Loans</h3>
<p>You can borrow up to the value of your investments, excluding Bonds and minus what you already owe. You cannot have more than <b>3 loans</b>. Each loan is repaid in <b>20 installments × 10% of the amount</b> — you repay double in total. Installments are deducted on every payday. You can repay early, partly or fully. <b>You cannot I QUIT! with an active loan.</b> The “Better Loan Terms” card removes 3 installments from an active loan.</p>
<h3>🎖️ Career Bonus</h3>
<p>At 35, 45 and 55 your salary permanently rises by €500. Career progress helps, but by itself does not secure financial freedom.</p>
<h3>🃏 Wild Cards</h3>
<p>Each player starts with 5 Wild Cards. When drawing Project you may draw Big Business instead, and vice versa. Each Wild Card is used once — timing is part of the strategy.</p>
<h3>💶 Short on Cash?</h3>
<p>When your Cash cannot cover a mandatory payment, a <b>forced sale</b> kicks in: you sell <b>Big Business at 80%</b> of their value or <b>Bonds at 100%</b> of their principal, until the amount is covered. Project cards and Funding cannot be sold. Liquidity matters — a profitable investment doesn’t always replace available Cash.</p>
<h3>⚠️ Bankruptcy</h3>
<p>If you cannot cover a mandatory payment, a forced sale takes place (Big Business at 80%, Bonds at 100%). If bankruptcy looms, the game automatically uses your Savings as a last resort — only the amount needed is taken (or all of it, if insufficient), with no 30% discount.</p>
<p>If, after using Cash, sellable assets and Savings, your balance is still negative, you go bankrupt and leave the game.</p>
<h3>🏁 End of the game</h3>
<p>Once <b>PASSIVE INCOME ≥ EXPENSES</b> with no active loans, you reach financial independence — I QUIT! The game continues until everyone finishes or reaches 65.</p>
<p><b>Final ranking:</b> <b>1.</b> Players who achieved I QUIT! — by age (younger = better). <b>2.</b> Players who reached 65 without I QUIT! — ranked by how long their capital would cover their shortfall after retirement:</p>
<p><b>Available capital</b> = Cash + Savings + Investment value<br>
<b>Monthly shortfall</b> = Expenses − Passive income<br>
<b>Capital duration</b> = Available capital ÷ Monthly shortfall</p>
<p>The result is shown in years and months, e.g. “🕒 Your capital lasted 12 years and 8 months after retirement”.</p>
<h3>💡 Five life lessons</h3>
<p>🌱 <b>Invest as early as you can.</b> Time and compounding can amplify the result.<br>
🎯 <b>Diversify your portfolio.</b> Higher potential returns usually come with higher risk.<br>
🐖 <b>Build an Emergency Fund.</b> Surprises can’t always be predicted — but you can be prepared.<br>
🏦 <b>Use loans as a tool, not a permanent fix.</b> They can speed up progress but create long-term obligations.<br>
📈 <b>Never underestimate inflation.</b> Financial freedom is built when your income grows faster than your expenses.</p>`,
  };

  let lang = 'el';
  try { lang = localStorage.getItem('iquit_lang') || 'el'; } catch (e) {}
  function t(key, params) {
    let s = (D[lang] && D[lang][key]) != null ? D[lang][key] : (D.el[key] != null ? D.el[key] : key);
    if (params) Object.keys(params).forEach(k => { s = s.split('{' + k + '}').join(params[k]); });
    return s;
  }
  // v1.9: γένος ονόματος για σωστό άρθρο (Ο/Η) στο ιστορικό — λίστα + ευριστική κατάληξης
  const FEMALE_NAMES = ['Καλυψώ', 'Δανάη', 'Αθηνά', 'Ηλέκτρα'];
  function isFemale(name) {
    const n = String(name || '').replace('🤖 ', '').trim();
    if (FEMALE_NAMES.indexOf(n) !== -1) return true;
    return /[αηώ]$/i.test(n); // Ελένη/Μαρία/Αργυρώ… (τα αρσενικά τελειώνουν σε -ς/-ος/-ης/-ας)
  }

  return {
    t, QUEST, RULES, FEEDBACK_EMAIL, isFemale,
    get lang() { return lang; },
    setLang(l) { lang = (l === 'en' ? 'en' : 'el'); try { localStorage.setItem('iquit_lang', lang); } catch (e) {} },
    cardTitle(c) { return (lang === 'en' && c && c.en) ? c.en : (c ? c.title : ''); },
    expName(k) { return t('exp_' + k); },
  };
});
