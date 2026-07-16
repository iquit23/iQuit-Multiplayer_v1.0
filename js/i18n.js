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
      tagline: 'Το παιχνίδι οικονομικού αλφαβητισμού — online με φίλους',
      yourName: 'Το όνομά σου', namePh: 'π.χ. Γιώργος',
      newGame: 'Νέο παιχνίδι', createRoom: '🎲 Δημιουργία δωματίου', creating: 'Δημιουργία…',
      joinRoom: 'Μπες σε δωμάτιο', codePh: 'ΚΩΔ.', joinBtn: 'Είσοδος →',
      homeFoot: '2–6 παίκτες · οι κενές θέσεις γεμίζουν με 🤖 bots<br>Νίκη: παθητικό εισόδημα ≥ έξοδα πριν τα 65!',
      rulesBtn: '📜 Κανόνες', resumeHost: '▶ Συνέχεια παιχνιδιού «{code}» (host)', resumeGuest: '▶ Επανασύνδεση στο δωμάτιο {code}',
      codeLen: 'Ο κωδικός δωματίου έχει 4 χαρακτήρες.',
      inviteMsg: 'Πρόσκληση στο δωμάτιο «{code}»! Γράψε το όνομά σου και πάτα «Είσοδος».',
      // Lobby
      room: 'Δωμάτιο', shareBtn: '📤 Κοινοποίηση κωδικού', players: 'Παίκτες', pickPawn: 'Διάλεξε το πιόνι σου',
      addBot: '🤖 Πρόσθεσε bot (διάλεξε στρατηγική)', startBtn: '🚀 Έναρξη παιχνιδιού',
      guestWait: 'Περιμένουμε τον host να ξεκινήσει το παιχνίδι…', leave: 'Αποχώρηση',
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
      savExplain: 'Βάλε χρήματα στην άκρη (πολλαπλάσια του 50€). Είναι <b>κλειδωμένα</b>: χρησιμοποιούνται ΜΟΝΟ όταν σε χτυπήσει αρνητική κάρτα Moment ή φόρος BB — και τότε, αν η αποταμίευση καλύπτει ΟΛΟ το ποσό, πληρώνεις μόνο το 70% (<b>−30% επιβράβευση πρόνοιας</b>) χωρίς να αγγίξεις τα μετρητά σου. Αν δεν φτάνει, πληρώνεις κανονικά από τα μετρητά. Νέα κατάθεση κάθε 5 χρόνια · ανάληψη στα 60 <b>ή όταν το I QUIT meter φτάσει το 100%</b>.',
      savBalance: 'Αποταμίευση: {v} · Μετρητά: {c}',
      savDeposit: '🐖 Κατάθεση', savSkip: '✋ Όχι τώρα', savWithdraw: '💶 Ανάληψη όλων ({v})',
      savTakeTip: 'Ανάληψη όλης της αποταμίευσης (επιτρέπεται: 60+ ή meter 100%)',
      lg_savDeposit: '🐖 {n}: αποταμίευσε {a} (σύνολο ταμείου {s})',
      lg_savWithdraw: '💶 {n}: ανάληψη όλης της αποταμίευσης (+{a})',
      lg_savPaid: '🐖 {n}: το «{title}» ({v}) πληρώθηκε από την ΑΠΟΤΑΜΙΕΥΣΗ με −30% → μόνο {d} (υπόλοιπο {s}). Η πρόνοια επιβραβεύεται!',
      lg_savRescue: '🆘 {n}: η αποταμίευση ({a}) ρευστοποιήθηκε in extremis για να αποφευχθεί η χρεοκοπία.',
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
      hintT_bb: '🏆 Big Business', hintB_bb: 'Μεγάλες, σταθερές επενδύσεις που ΔΕΝ χάνονται ποτέ σε Crash — αλλά φορολογούνται 50% στο κουτί Tax. Αν την αφήσεις, ο επόμενος παίκτης την παίρνει με −10%.',
      hintT_lifestyle: '🏠 Lifestyle', hintB_lifestyle: 'Ο τρόπος ζωής σου αλλάζει ΜΟΝΙΜΑ τα μηνιαία έξοδά σου — προς τα πάνω ή προς τα κάτω. Τα μικρά μόνιμα έξοδα κοστίζουν πολύ σε βάθος χρόνου.',
      hintT_moments: '🎁 Moment', hintB_moments: 'Απρόοπτα της ζωής: κερδίζεις ή χάνεις χρήματα ΜΙΑ φορά. Η ΑΠΟΤΑΜΙΕΥΣΗ απορροφά τα αρνητικά με έκπτωση 30% — αν καλύπτει όλο το ποσό.',
      hintT_inflation: '📈 Πληθωρισμός', hintB_inflation: 'Τα έξοδα ΟΛΩΝ αυξάνονται μόνιμα. Δεν τον σταματάς — τον προσπερνάς: το εισόδημά σου πρέπει να τρέχει πιο γρήγορα από αυτόν.',
      hintT_crash: '💥 Crash', hintB_crash: 'Κραχ αγοράς: χάνεται μια Project επένδυση στο χρώμα που χτυπήθηκε. Γι’ αυτό αξίζει η διαφοροποίηση του χαρτοφυλακίου.',
      hintT_ffail: '📉 Funding Fails', hintB_ffail: 'Μια Χρηματοδότηση χάνεται. Μην στηρίζεις το πλάνο σου σε μία μόνο πηγή εισοδήματος.',
      hintT_savings: '🐖 ΑΠΟΤΑΜΙΕΥΣΗ', hintB_savings: 'Ταμείο έκτακτης ανάγκης: κλειδωμένα χρήματα που απορροφούν αρνητικά Moments και φόρους με έκπτωση 30%. Η πρόνοια επιβραβεύεται!',
      hintT_forced: '⚠️ Αναγκαστική Πώληση', hintB_forced: 'Τα μετρητά σου έγιναν αρνητικά — πουλάς περιουσία στο 80% της αξίας της. Γι’ αυτό χρειάζεσαι πάντα «μαξιλάρι» ρευστότητας!',
      hintT_offer: '🤝 Προσφορά Χρηματοδότησης', hintB_offer: 'Ένας παίκτης σου προσφέρει Χρηματοδότησή του. Σύγκρινε τιμή και εισόδημα πριν αποφασίσεις — καμιά φορά η μεταπώληση συμφέρει και τους δύο.',
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
      forcedBody: 'Τα μετρητά σου είναι {v}. Πούλα επενδύσεις στην τράπεζα (80% της αξίας — ομόλογα στο κεφάλαιό τους) μέχρι να καλύψεις το έλλειμμα.',
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
      survive: 'Έφτασε τα 65 · επιβίωση {n} μήνες με το κεφάλαιό του', reached65: 'Έφτασε τα 65',
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
      tagline: 'The financial-literacy board game — online with friends',
      yourName: 'Your name', namePh: 'e.g. George',
      newGame: 'New game', createRoom: '🎲 Create a room', creating: 'Creating…',
      joinRoom: 'Join a room', codePh: 'CODE', joinBtn: 'Join →',
      homeFoot: '2–6 players · empty seats are filled with 🤖 bots<br>Win: passive income ≥ expenses before age 65!',
      rulesBtn: '📜 Rules', resumeHost: '▶ Resume game “{code}” (host)', resumeGuest: '▶ Reconnect to room {code}',
      codeLen: 'Room codes have 4 characters.',
      inviteMsg: 'You are invited to room “{code}”! Type your name and press “Join”.',
      room: 'Room', shareBtn: '📤 Share invite link', players: 'Players', pickPawn: 'Pick your pawn',
      addBot: '🤖 Add a bot (pick a strategy)', startBtn: '🚀 Start game',
      guestWait: 'Waiting for the host to start the game…', leave: 'Leave',
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
      savExplain: 'Put money aside (multiples of €50). It is <b>locked</b>: it is used ONLY when a negative Moment card or BB tax hits you — and if your savings cover the FULL amount, you pay just 70% (<b>−30% foresight reward</b>) without touching your cash. If it does not cover it, you pay normally from cash. New deposit every 5 years · withdrawal at 60 <b>or once your I QUIT meter hits 100%</b>.',
      savBalance: 'Savings: {v} · Cash: {c}',
      savDeposit: '🐖 Deposit', savSkip: '✋ Not now', savWithdraw: '💶 Withdraw all ({v})',
      savTakeTip: 'Withdraw all savings (allowed: 60+ or meter at 100%)',
      lg_savDeposit: '🐖 {n}: saved {a} (fund total {s})',
      lg_savWithdraw: '💶 {n}: withdrew all savings (+{a})',
      lg_savPaid: '🐖 {n}: “{title}” ({v}) was paid from SAVINGS at −30% → only {d} (remaining {s}). Foresight pays off!',
      lg_savRescue: '🆘 {n}: savings ({a}) were liquidated in extremis to avoid bankruptcy.',
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
      hintT_bb: '🏆 Big Business', hintB_bb: 'Large, stable investments that are NEVER lost in a Crash — but taxed 50% on the Tax square. If you pass, the next player can buy it at −10%.',
      hintT_lifestyle: '🏠 Lifestyle', hintB_lifestyle: 'Your lifestyle PERMANENTLY changes your monthly expenses — up or down. Small permanent costs add up over time.',
      hintT_moments: '🎁 Moment', hintB_moments: 'Life’s surprises: you gain or lose money ONCE. SAVINGS absorb negative hits at a 30% discount — if they cover the full amount.',
      hintT_inflation: '📈 Inflation', hintB_inflation: 'Everyone’s expenses rise permanently. You can’t stop it — you outrun it: your income must grow faster.',
      hintT_crash: '💥 Crash', hintB_crash: 'Market crash: a Project investment in the hit color is lost. That’s why diversification matters.',
      hintT_ffail: '📉 Funding Fails', hintB_ffail: 'A Funding is lost. Never rely on a single source of income.',
      hintT_savings: '🐖 SAVINGS', hintB_savings: 'Emergency fund: locked money that absorbs negative Moments and taxes at a 30% discount. Foresight pays!',
      hintT_forced: '⚠️ Forced Sale', hintB_forced: 'Your cash went negative — you must sell assets at 80% of value. That’s why you always need a cash cushion!',
      hintT_offer: '🤝 Funding Offer', hintB_offer: 'A player is offering you one of their Fundings. Compare price and income before deciding — sometimes a resale benefits both.',
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
      forcedBody: 'Your cash is {v}. Sell investments to the bank (80% of value — bonds at principal) until you cover the shortfall.',
      offerCat: 'FUNDING OFFER', offerBody: '{name} offers it to you for <b>{v}</b>',
      fundingSale: 'Sell a Funding card', fundingMin: '“{title}” — minimum price {v}', cancel: 'Cancel',
      noTargets: 'No available players.',
      loanConfirmTitle: '🏦 Loan proposal',
      loanC1: 'You receive now:', loanC2: 'You pay every payday:', loanC3: 'You will repay in total:', loanC4: 'That is a borrowing cost (interest) of:',
      loanC5: '💡 A loan is worth it only when the passive income it buys exceeds this cost — and remember: no I QUIT while you owe money!',
      loanYes: 'Yes, take it', loanNo: 'Cancel — let me think',
      loanX100: '⚠️ Loans come in multiples of €100 — try {v}.',
      finalRank: 'Final Ranking', iquitFree: 'I QUIT at {age} — financial freedom!',
      survive: 'Reached 65 · could survive {n} months on their capital', reached65: 'Reached 65',
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
<h2>🎲 Κανόνες I QUIT!</h2>
<h3>🌍 Η φιλοσοφία του παιχνιδιού</h3>
<p>Καλωσόρισες στο I QUIT!</p>
<p>Είσαι 25 ετών και ξεκινάς το ταξίδι σου προς την οικονομική ελευθερία. Ξεκινάς με έναν σταθερό μισθό, καθημερινά έξοδα και ένα μεγάλο ερώτημα:</p>
<p><b>Θα δουλεύεις για τα χρήματα ή θα μάθεις να κάνεις τα χρήματα να δουλεύουν για εσένα;</b></p>
<p>Σε κάθε γύρο θα παίρνεις αποφάσεις που θυμίζουν την πραγματική ζωή. Θα επιλέγεις αν θα επενδύσεις, αν θα δανειστείς, αν θα αναλάβεις μεγαλύτερο ρίσκο για υψηλότερες αποδόσεις ή αν θα κινηθείς πιο συντηρητικά. Παράλληλα, θα αντιμετωπίζεις οικονομικές κρίσεις, πληθωρισμό, φόρους, απρόβλεπτα γεγονότα και νέες ευκαιρίες.</p>
<p>Δεν υπάρχει μία σωστή στρατηγική. Κάθε επιλογή έχει κόστος, όφελος και ρίσκο.<br>
Στο I QUIT! δεν κερδίζει όποιος βγάζει τα περισσότερα χρήματα. <b>Κερδίζει όποιος αποκτά την οικονομική του ελευθερία νωρίτερα.</b></p>
<h3>🎯 Ο στόχος</h3>
<p>Ξεκινάς στα 25 σου χρόνια με: 💼 Μισθό 2.000€ · 🏠 Έξοδα 1.500€ ανά κύκλο.</p>
<p>Στόχος σου είναι να δημιουργήσεις παθητικό εισόδημα μέσω επενδύσεων, μέχρι το σημείο που αυτό θα καλύπτει πλήρως τα έξοδά σου. Όταν το παθητικό σου εισόδημα γίνει ίσο ή μεγαλύτερο από τα έξοδά σου (και δεν έχεις ενεργά δάνεια), μπορείς να φωνάξεις: <b>I QUIT!</b></p>
<p>Νικητής είναι όποιος φτάσει πρώτος στην οικονομική ελευθερία, δηλαδή στη μικρότερη ηλικία. Αν κανείς δεν τα καταφέρει μέχρι τα 65, νικητής αναδεικνύεται εκείνος που βρίσκεται πιο κοντά στον στόχο.</p>
<h3>🎲 Πώς παίζεις</h3>
<p>Στη σειρά σου: <b>1.</b> Ρίχνεις δύο ζάρια. <b>2.</b> Μετακινείς το πιόνι σου. <b>3.</b> Αν περάσεις ή σταματήσεις στο Salary ή στο Starting Point: εισπράττεις Μισθό − Έξοδα + Παθητικό Εισόδημα, πληρώνεις τις δόσεις των δανείων σου και μεγαλώνεις κατά 1 έτος. <b>4.</b> Εκτελείς την ενέργεια του κουτιού στο οποίο προσγειώθηκες. Ο πρώτος παίκτης καθορίζεται με κλήρωση.</p>
<h3>🟦 Τα κουτάκια</h3>
<p><b>🔵 Project</b> — Τραβάς μία κάρτα επένδυσης: 🟢 Πράσινες → Αμοιβαία Κεφάλαια (~6%) • χαμηλό ρίσκο · 🟡 Κίτρινες → REITs / Ακίνητα (~13%) • μεσαίο ρίσκο · 🔴 Κόκκινες → Μετοχές (~20%) • υψηλό ρίσκο · ⚓ Χρηματοδοτήσεις (~8%) · 🏛️ Ομόλογα · 🎓 Μεταπτυχιακό (+μόνιμος μισθός) · 🧾 Προκαταβολή Φόρου (μείωση φόρων) · 🏦 Ευνοϊκότερο Δάνειο (−2 δόσεις).</p>
<p><b>🟧 Big Business</b> — Μεγάλες και σταθερές επενδύσεις (5,5–7%). Δεν χάνονται ποτέ σε Crash. Επηρεάζονται μόνο από τη φορολογία. Αν δεν αγοράσεις μία επένδυση, ο επόμενος παίκτης μπορεί να την αποκτήσει με έκπτωση 10%. Μόλις αγοραστεί, αφαιρείται οριστικά από τη στοίβα.</p>
<p><b>🟥 Lifestyle</b> — Κάρτες που αλλάζουν μόνιμα τον τρόπο ζωής σου. Αυξάνουν ή μειώνουν τα έξοδά σου. Οι κάρτες «Έκαστος» επηρεάζουν εσένα και έναν ακόμη παίκτη της επιλογής σου.</p>
<p><b>🟩 Moments</b> — Γεγονότα της καθημερινότητας. Κερδίζεις ή χάνεις χρήματα μία φορά. Υπάρχουν επίσης δύο ειδικές κάρτες που μπορούν να αναιρέσουν αρνητικές συνήθειες Lifestyle.</p>
<p><b>💥 Crash</b> — Χάνεις ολόκληρη την Project επένδυσή σου στο αντίστοιχο χρώμα με τη μεγαλύτερη απόδοση. Αν υπάρχει ισοπαλία, χάνεται εκείνη με τη μεγαλύτερη αξία. Υπενθύμιση: οι υψηλές αποδόσεις συνοδεύονται από υψηλότερο ρίσκο.</p>
<p><b>⚓ Funding Fails</b> — Χάνεις τη Χρηματοδότηση με τη μεγαλύτερη απόδοση.</p>
<p><b>🧾 Tax</b> — Πληρώνεις φόρο ίσο με το 50% του εισοδήματος που λαμβάνεις από τις Big Business επενδύσεις.</p>
<p><b>📈 Inflation</b> — Όλοι οι παίκτες αυξάνουν τα μηνιαία έξοδά τους κατά 5%. Οι μελλοντικές κάρτες Lifestyle προσαρμόζονται επίσης στον πληθωρισμό. Οι επενδύσεις και τα μετρητά σου δεν επηρεάζονται.</p>
<h3>🏛️ Ομόλογα</h3>
<p>Αγοράζεις ένα ομόλογο (π.χ. 1.000€). Σε κάθε είσπραξη: λαμβάνεις τόκο 4% και κερδίζεις ένα Bond Token. Μετά από 10 Tokens το ομόλογο λήγει και επιστρέφεται το αρχικό κεφάλαιο. Μπορείς να το πουλήσεις οποιαδήποτε στιγμή και να πάρεις πίσω το κεφάλαιό σου. Τα ομόλογα δεν μετρούν στο I QUIT Meter και δεν αυξάνουν το όριο δανεισμού. Είναι εργαλείο ασφάλειας και ρευστότητας.</p>
<h3>🏦 Δάνεια</h3>
<p>Μπορείς να δανειστείς μέχρι το ύψος της αξίας των επενδύσεών σου (εκτός ομολόγων), αφαιρώντας όσα ήδη χρωστάς. Η αποπληρωμή γίνεται σε <b>20 δόσεις × 10% του ποσού</b> — συνολικά επιστρέφεις το διπλάσιο ποσό. Μπορείς να έχεις περισσότερα από ένα δάνεια και να αποπληρώσεις πρόωρα μέρος ή όλο το δάνειο. <b>Δεν μπορείς να κάνεις I QUIT! όσο έχεις ενεργά δάνεια.</b></p>
<h3>🎖️ Career Bonus</h3>
<p>Στα 35, 45 και 55 ο μισθός σου αυξάνεται μόνιμα κατά 500€. Η καριέρα εξελίσσεται, αλλά από μόνη της δεν αρκεί για την οικονομική ελευθερία.</p>
<h3>🃏 Wild Cards</h3>
<p>Κάθε παίκτης ξεκινά με 5 Wild Cards. Όταν τραβάς Project → μπορείς να τραβήξεις Big Business. Όταν τραβάς Big Business → μπορείς να τραβήξεις Project. Η σωστή στιγμή χρήσης τους αποτελεί σημαντικό κομμάτι της στρατηγικής.</p>
<h3>💶 Δεν φτάνουν τα μετρητά;</h3>
<p>Αν χρειάζεσαι άμεσα χρήματα, μπορείς να πουλήσεις οποιαδήποτε επένδυσή σου στην τράπεζα στο 80% της αξίας της. Η ρευστότητα έχει αξία. Κράτα πάντα ένα οικονομικό «μαξιλάρι».</p>
<h3>🏁 Τέλος παιχνιδιού</h3>
<p>Μόλις το παθητικό σου εισόδημα γίνει ίσο ή μεγαλύτερο από τα έξοδά σου (χωρίς ενεργά δάνεια), πετυχαίνεις την οικονομική ανεξαρτησία και κάνεις I QUIT! Το παιχνίδι συνεχίζεται μέχρι να ολοκληρώσουν όλοι οι παίκτες ή μέχρι την ηλικία των 65 ετών. Η τελική κατάταξη: <b>1.</b> Όσοι πέτυχαν I QUIT! (νωρίτερη ηλικία = καλύτερη θέση). <b>2.</b> Οι υπόλοιποι, με βάση πόσους μήνες θα μπορούσαν να συντηρηθούν με το διαθέσιμο κεφάλαιό τους.</p>
<h3>💡 Πέντε μαθήματα ζωής</h3>
<p>🌱 Επένδυσε όσο πιο νωρίς μπορείς — ο ανατοκισμός χρειάζεται χρόνο.<br>
🎯 Διαφοροποίησε το χαρτοφυλάκιό σου — το μεγάλο κέρδος συνοδεύεται από μεγάλο ρίσκο.<br>
💰 Διατήρησε πάντα ένα ταμειακό απόθεμα — οι αναγκαστικές πωλήσεις κοστίζουν.<br>
🏦 Το δάνειο είναι εργαλείο, όχι λύση — μπορεί να επιταχύνει την πρόοδο, αλλά και να την ανατρέψει.<br>
📈 Ο πληθωρισμός δεν σταματά ποτέ. Η οικονομική ελευθερία χτίζεται όταν το εισόδημά σου αυξάνεται γρηγορότερα από τα έξοδά σου.</p>`,
    en: `
<h2>🎲 I QUIT! Rules</h2>
<h3>🌍 The philosophy</h3>
<p>Welcome to I QUIT!</p>
<p>You are 25 years old, starting your journey toward financial freedom. You begin with a steady salary, everyday expenses and one big question:</p>
<p><b>Will you work for money, or will you learn to make money work for you?</b></p>
<p>Every round you make decisions that mirror real life: invest or not, borrow or not, take bigger risks for bigger returns or play it safe — while facing crashes, inflation, taxes, surprises and new opportunities.</p>
<p>There is no single correct strategy. Every choice has a cost, a benefit and a risk.<br>
In I QUIT! the winner is not whoever makes the most money. <b>The winner is whoever reaches financial freedom first.</b></p>
<h3>🎯 The goal</h3>
<p>You start at age 25 with: 💼 a €2,000 salary · 🏠 €1,500 expenses per cycle.</p>
<p>Your goal is to build passive income through investments until it fully covers your expenses. When your passive income is equal to or greater than your expenses (and you have no active loans), you can shout: <b>I QUIT!</b></p>
<p>The winner is whoever reaches financial freedom first — at the youngest age. If nobody makes it by 65, the winner is whoever got closest.</p>
<h3>🎲 How to play</h3>
<p>On your turn: <b>1.</b> Roll two dice. <b>2.</b> Move your pawn. <b>3.</b> If you pass or land on Salary or Starting Point: collect Salary − Expenses + Passive Income, pay your loan installments, and age by 1 year. <b>4.</b> Resolve the square you landed on. The first player is chosen by lottery.</p>
<h3>🟦 The squares</h3>
<p><b>🔵 Project</b> — Draw an investment card: 🟢 Green → Mutual Funds (~6%) • low risk · 🟡 Yellow → REITs / Real estate (~13%) • medium risk · 🔴 Red → Stocks (~20%) • high risk · ⚓ Funding (~8%) · 🏛️ Bonds · 🎓 Master’s degree (+permanent salary) · 🧾 Tax prepayment (lower taxes) · 🏦 Better loan (−2 payments).</p>
<p><b>🟧 Big Business</b> — Large, stable investments (5.5–7%). Never lost in a Crash; only taxed. If you pass, the next player may buy it at a 10% discount. Once bought, it is removed from the deck for good.</p>
<p><b>🟥 Lifestyle</b> — Cards that permanently change your way of life, raising or lowering your expenses. “Each” cards affect you AND one player of your choice.</p>
<p><b>🟩 Moments</b> — Everyday events: win or lose money once. Two special cards can cancel bad Lifestyle habits.</p>
<p><b>💥 Crash</b> — You lose your entire Project investment of the matching colour with the highest return. On a tie, the one with the greater value is lost. Reminder: high returns come with high risk.</p>
<p><b>⚓ Funding Fails</b> — You lose the Funding card with the highest return.</p>
<p><b>🧾 Tax</b> — You pay 50% of the income you receive from Big Business investments.</p>
<p><b>📈 Inflation</b> — All players’ monthly expenses rise by 5%. Future Lifestyle cards also adjust for inflation. Your investments and cash are not affected.</p>
<h3>🏛️ Bonds</h3>
<p>You buy a bond (e.g. €1,000). Every payday you receive 4% interest and one Bond Token. After 10 tokens the bond matures and the principal is returned. You can sell it any time and get your principal back. Bonds do not count toward the I QUIT Meter and do not raise your loan limit. They are a tool for safety and liquidity.</p>
<h3>🏦 Loans</h3>
<p>You can borrow up to the value of your investments (excluding bonds), minus what you already owe. Repayment: <b>20 payments × 10% of the amount</b> — you repay double in total. You may hold several loans and repay part or all of them early. <b>You cannot I QUIT! while you have active loans.</b></p>
<h3>🎖️ Career Bonus</h3>
<p>At 35, 45 and 55 your salary permanently rises by €500. Careers progress — but a career alone won’t set you free.</p>
<h3>🃏 Wild Cards</h3>
<p>Each player starts with 5 Wild Cards. Drawing a Project → you may draw a Big Business instead, and vice versa. Timing them well is a key part of the strategy.</p>
<h3>💶 Out of cash?</h3>
<p>If you urgently need money, you may sell any of your investments to the bank at 80% of its value. Liquidity matters — always keep a cash cushion.</p>
<h3>🏁 End of the game</h3>
<p>The moment your passive income is equal to or greater than your expenses (with no active loans), you achieve financial independence and shout I QUIT! The game continues until everyone finishes or reaches 65. Final ranking: <b>1.</b> Those who achieved I QUIT! (younger age = better rank). <b>2.</b> Everyone else, by how many months they could survive on their available capital.</p>
<h3>💡 Five life lessons</h3>
<p>🌱 Invest as early as you can — compounding needs time.<br>
🎯 Diversify your portfolio — big gains come with big risk.<br>
💰 Always keep a cash reserve — forced sales are costly.<br>
🏦 A loan is a tool, not a solution — it can speed up your progress or wreck it.<br>
📈 Inflation never stops. Financial freedom is built when your income grows faster than your expenses.</p>`,
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
