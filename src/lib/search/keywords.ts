// Comprehensive Adverse Media Keyword Taxonomy
// 11 Categories with risk weights and term variations

export interface SearchTermCategory {
  id: string
  name: string
  description: string
  riskWeight: number // 1-5, higher = more severe
  terms: SearchTerm[]
}

export interface SearchTerm {
  term: string
  variations: string[]
}

export const SEARCH_TERM_CATEGORIES: SearchTermCategory[] = [
  {
    id: 'financial-crimes',
    name: 'Financial Crimes',
    description: 'Fraud, embezzlement, money laundering, bribery, and related financial offenses',
    riskWeight: 5,
    terms: [
      { term: 'launder', variations: ['laundering', 'laundered', 'money laundering', 'AML violation'] },
      { term: 'fraud', variations: ['fraudulent', 'defraud', 'defrauded', 'fraudster', 'wire fraud', 'bank fraud'] },
      { term: 'embezzle', variations: ['embezzlement', 'embezzled', 'embezzling', 'misappropriation'] },
      { term: 'bribe', variations: ['bribery', 'bribed', 'bribing', 'kickback', 'kickbacks', 'payoff'] },
      { term: 'corrupt', variations: ['corruption', 'corrupted', 'corrupt official', 'corrupt practices'] },
      { term: 'tax evasion', variations: ['tax fraud', 'tax cheat', 'tax crime', 'tax avoidance scheme'] },
      { term: 'insider trading', variations: ['securities fraud', 'market manipulation', 'stock manipulation'] },
      { term: 'Ponzi', variations: ['Ponzi scheme', 'pyramid scheme', 'investment fraud', 'investment scam'] },
      { term: 'forgery', variations: ['forged', 'forger', 'counterfeiting', 'counterfeit', 'falsified documents'] },
      { term: 'misappropriation', variations: ['misappropriated', 'theft of funds', 'diversion of funds'] },
    ],
  },
  {
    id: 'violent-crimes',
    name: 'Violent Crimes',
    description: 'Murder, assault, kidnapping, and other violent offenses',
    riskWeight: 5,
    terms: [
      { term: 'murder', variations: ['murdered', 'murderer', 'homicide', 'manslaughter', 'killing', 'slaying'] },
      { term: 'assault', variations: ['assaulted', 'battery', 'violent attack', 'aggravated assault', 'attacked'] },
      { term: 'kidnap', variations: ['kidnapping', 'kidnapped', 'abduction', 'abducted', 'hostage'] },
      { term: 'armed robbery', variations: ['robbery', 'robber', 'robbed', 'heist', 'hold-up'] },
      { term: 'domestic violence', variations: ['domestic abuse', 'spousal abuse', 'family violence'] },
      { term: 'threatening', variations: ['death threats', 'threats', 'intimidation', 'menacing'] },
    ],
  },
  {
    id: 'organized-crime',
    name: 'Organized Crime',
    description: 'Mafia, trafficking, cartels, and criminal organizations',
    riskWeight: 5,
    terms: [
      { term: 'mafia', variations: ['mob', 'organized crime', 'crime syndicate', 'crime family', 'crime boss'] },
      { term: 'trafficking', variations: ['trafficked', 'trafficker', 'human trafficking', 'drug trafficking', 'sex trafficking'] },
      { term: 'cartel', variations: ['drug cartel', 'gang', 'criminal organization', 'crime ring'] },
      { term: 'racketeering', variations: ['RICO', 'racket', 'extortion ring', 'protection racket'] },
      { term: 'smuggling', variations: ['smuggled', 'smuggler', 'contraband', 'illegal import'] },
    ],
  },
  {
    id: 'terrorism-security',
    name: 'Terrorism & Security',
    description: 'Terrorism, sanctions, extremism, and national security threats',
    riskWeight: 5,
    terms: [
      { term: 'terrorism', variations: ['terrorist', 'terror attack', 'terror financing', 'terrorist organization'] },
      { term: 'extremist', variations: ['extremism', 'radicalized', 'radical', 'militant'] },
      { term: 'sanctions', variations: ['sanctioned', 'OFAC', 'SDN list', 'sanctions violation', 'sanctions evasion'] },
      { term: 'weapons', variations: ['arms dealing', 'illegal arms', 'weapons trafficking', 'arms smuggling'] },
    ],
  },
  {
    id: 'sexual-offenses',
    name: 'Sexual Offenses',
    description: 'Sexual assault, harassment, and related offenses',
    riskWeight: 5,
    terms: [
      { term: 'sexual assault', variations: ['sexual harassment', 'sexual misconduct', 'sexual abuse', 'groping'] },
      { term: 'rape', variations: ['rapist', 'sexual violence'] },
      { term: 'child abuse', variations: ['child exploitation', 'pedophile', 'child pornography', 'minor abuse'] },
      { term: 'indecent', variations: ['indecency', 'indecent exposure', 'lewd conduct'] },
    ],
  },
  {
    id: 'legal-proceedings',
    name: 'Legal/Criminal Proceedings',
    description: 'Arrests, convictions, prosecutions, and court cases',
    riskWeight: 4,
    terms: [
      { term: 'arrest', variations: ['arrested', 'detention', 'detained', 'taken into custody', 'apprehended'] },
      { term: 'convict', variations: ['convicted', 'conviction', 'convictions', 'found guilty'] },
      { term: 'prosecute', variations: ['prosecuted', 'prosecution', 'prosecutor', 'criminal prosecution'] },
      { term: 'indict', variations: ['indicted', 'indictment', 'grand jury indictment'] },
      { term: 'guilty', variations: ['guilt', 'guilty verdict', 'guilty plea', 'pleaded guilty'] },
      { term: 'sentence', variations: ['sentenced', 'sentencing', 'prison sentence', 'jail sentence'] },
      { term: 'prison', variations: ['imprisoned', 'imprisonment', 'jail', 'jailed', 'incarcerated', 'incarceration'] },
      { term: 'felon', variations: ['felony', 'felonies', 'felony conviction', 'convicted felon'] },
      { term: 'verdict', variations: ['court ruling', 'court verdict', 'jury verdict'] },
      { term: 'plea', variations: ['plea deal', 'plea bargain', 'plea agreement', 'nolo contendere'] },
      { term: 'trial', variations: ['criminal trial', 'on trial', 'court trial', 'jury trial'] },
      { term: 'charges', variations: ['charged', 'criminal charges', 'facing charges', 'charge filed'] },
    ],
  },
  {
    id: 'regulatory-actions',
    name: 'Regulatory Actions',
    description: 'Fines, bans, license revocations, and compliance failures',
    riskWeight: 3,
    terms: [
      { term: 'fine', variations: ['fined', 'penalty', 'penalized', 'monetary penalty', 'civil penalty'] },
      { term: 'ban', variations: ['banned', 'barred', 'disbarred', 'prohibited', 'exclusion'] },
      { term: 'license revoked', variations: ['license suspended', 'deregistered', 'license cancelled'] },
      { term: 'violation', variations: ['violated', 'breach', 'breached', 'infringement', 'non-compliance'] },
      { term: 'regulatory action', variations: ['enforcement action', 'regulatory enforcement', 'SEC action', 'FCA action'] },
      { term: 'cease and desist', variations: ['injunction', 'restraining order', 'court order'] },
      { term: 'compliance failure', variations: ['non-compliance', 'compliance breach', 'regulatory breach'] },
    ],
  },
  {
    id: 'civil-business',
    name: 'Civil/Business Issues',
    description: 'Lawsuits, bankruptcy, and business disputes',
    riskWeight: 2,
    terms: [
      { term: 'lawsuit', variations: ['sued', 'suing', 'litigation', 'litigated', 'legal action', 'civil suit'] },
      { term: 'bankruptcy', variations: ['bankrupt', 'insolvent', 'insolvency', 'Chapter 11', 'Chapter 7', 'liquidation'] },
      { term: 'default', variations: ['defaulted', 'loan default', 'debt default', 'payment default'] },
      { term: 'settlement', variations: ['settled', 'legal settlement', 'out of court settlement'] },
      { term: 'dispute', variations: ['disputed', 'legal dispute', 'contract dispute', 'business dispute'] },
      { term: 'malpractice', variations: ['negligence', 'negligent', 'professional misconduct', 'gross negligence'] },
    ],
  },
  {
    id: 'reputational-ethical',
    name: 'Reputational/Ethical',
    description: 'Scandals, controversies, and ethical concerns',
    riskWeight: 2,
    terms: [
      { term: 'scandal', variations: ['scandalous', 'embroiled in scandal', 'scandal-hit'] },
      { term: 'controversy', variations: ['controversial', 'controversies', 'public outcry'] },
      { term: 'allegation', variations: ['alleged', 'accused', 'accusations', 'claims against'] },
      { term: 'unethical', variations: ['misconduct', 'ethical violation', 'ethics breach'] },
      { term: 'whistleblower', variations: ['exposed', 'leak', 'leaked', 'revealed wrongdoing'] },
      { term: 'cover-up', variations: ['concealed', 'concealment', 'hidden', 'suppressed'] },
    ],
  },
  {
    id: 'environmental-crimes',
    name: 'Environmental Crimes',
    description: 'Pollution, illegal dumping, and environmental violations',
    riskWeight: 3,
    terms: [
      { term: 'environmental crime', variations: ['eco crime', 'environmental offense', 'green crime'] },
      { term: 'pollution', variations: ['polluter', 'polluted', 'polluting', 'contamination', 'toxic release'] },
      { term: 'illegal dumping', variations: ['toxic waste', 'hazardous waste', 'waste dumping', 'fly-tipping'] },
      { term: 'environmental violation', variations: ['EPA violation', 'environmental breach', 'emissions violation'] },
    ],
  },
  {
    id: 'cyber-crimes',
    name: 'Cyber Crimes',
    description: 'Hacking, data breaches, and digital fraud',
    riskWeight: 4,
    terms: [
      { term: 'hacking', variations: ['hacker', 'hacked', 'cyber attack', 'cyberattack', 'computer intrusion'] },
      { term: 'data breach', variations: ['data theft', 'data leak', 'information breach', 'privacy breach'] },
      { term: 'identity theft', variations: ['identity fraud', 'stolen identity', 'impersonation fraud'] },
      { term: 'ransomware', variations: ['malware', 'computer virus', 'cyber extortion', 'cryptolocker'] },
    ],
  },
]

// Get all terms flattened for a specific risk level or higher
export function getTermsByMinRiskWeight(minWeight: number): string[] {
  const terms: string[] = []
  
  SEARCH_TERM_CATEGORIES
    .filter(category => category.riskWeight >= minWeight)
    .forEach(category => {
      category.terms.forEach(term => {
        terms.push(term.term)
        terms.push(...term.variations)
      })
    })
  
  return [...new Set(terms)]
}

// Get all high-risk terms (weight 4-5)
export function getHighRiskTerms(): string[] {
  return getTermsByMinRiskWeight(4)
}

// Get category by term
export function getCategoryByTerm(searchTerm: string): SearchTermCategory | undefined {
  const lowerTerm = searchTerm.toLowerCase()
  
  return SEARCH_TERM_CATEGORIES.find(category =>
    category.terms.some(term =>
      term.term.toLowerCase() === lowerTerm ||
      term.variations.some(v => v.toLowerCase() === lowerTerm)
    )
  )
}

// Build search query string from category
export function buildCategoryQueryString(category: SearchTermCategory): string {
  const terms = category.terms.flatMap(t => [t.term, ...t.variations.slice(0, 2)])
  return terms.slice(0, 10).join(' OR ')
}
