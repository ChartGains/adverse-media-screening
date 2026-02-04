-- Seed data for search term categories and terms
-- This populates the comprehensive adverse media keyword taxonomy

-- ============================================
-- INSERT SEARCH TERM CATEGORIES
-- ============================================

INSERT INTO public.search_term_categories (category_name, description, risk_weight, display_order, is_active) VALUES
('Financial Crimes', 'Fraud, embezzlement, money laundering, bribery, and related financial offenses', 5, 1, true),
('Violent Crimes', 'Murder, assault, kidnapping, and other violent offenses', 5, 2, true),
('Organized Crime', 'Mafia, trafficking, cartels, and criminal organizations', 5, 3, true),
('Terrorism & Security', 'Terrorism, sanctions, extremism, and national security threats', 5, 4, true),
('Sexual Offenses', 'Sexual assault, harassment, and related offenses', 5, 5, true),
('Legal/Criminal Proceedings', 'Arrests, convictions, prosecutions, and court cases', 4, 6, true),
('Regulatory Actions', 'Fines, bans, license revocations, and compliance failures', 3, 7, true),
('Civil/Business Issues', 'Lawsuits, bankruptcy, and business disputes', 2, 8, true),
('Reputational/Ethical', 'Scandals, controversies, and ethical concerns', 2, 9, true),
('Environmental Crimes', 'Pollution, illegal dumping, and environmental violations', 3, 10, true),
('Cyber Crimes', 'Hacking, data breaches, and digital fraud', 4, 11, true);

-- ============================================
-- INSERT SEARCH TERMS BY CATEGORY
-- ============================================

-- Category 1: Financial Crimes
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('launder', ARRAY['laundering', 'laundered', 'money laundering', 'AML violation']),
    ('fraud', ARRAY['fraudulent', 'defraud', 'defrauded', 'fraudster', 'wire fraud', 'bank fraud']),
    ('embezzle', ARRAY['embezzlement', 'embezzled', 'embezzling', 'misappropriation']),
    ('bribe', ARRAY['bribery', 'bribed', 'bribing', 'kickback', 'kickbacks', 'payoff']),
    ('corrupt', ARRAY['corruption', 'corrupted', 'corrupt official', 'corrupt practices']),
    ('tax evasion', ARRAY['tax fraud', 'tax cheat', 'tax crime', 'tax avoidance scheme']),
    ('insider trading', ARRAY['securities fraud', 'market manipulation', 'stock manipulation']),
    ('Ponzi', ARRAY['Ponzi scheme', 'pyramid scheme', 'investment fraud', 'investment scam']),
    ('forgery', ARRAY['forged', 'forger', 'counterfeiting', 'counterfeit', 'falsified documents']),
    ('misappropriation', ARRAY['misappropriated', 'theft of funds', 'diversion of funds'])
) AS t(term, variations)
WHERE category_name = 'Financial Crimes';

-- Category 2: Violent Crimes
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('murder', ARRAY['murdered', 'murderer', 'homicide', 'manslaughter', 'killing', 'slaying']),
    ('assault', ARRAY['assaulted', 'battery', 'violent attack', 'aggravated assault', 'attacked']),
    ('kidnap', ARRAY['kidnapping', 'kidnapped', 'abduction', 'abducted', 'hostage']),
    ('armed robbery', ARRAY['robbery', 'robber', 'robbed', 'heist', 'hold-up']),
    ('domestic violence', ARRAY['domestic abuse', 'spousal abuse', 'family violence']),
    ('threatening', ARRAY['death threats', 'threats', 'intimidation', 'menacing'])
) AS t(term, variations)
WHERE category_name = 'Violent Crimes';

-- Category 3: Organized Crime
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('mafia', ARRAY['mob', 'organized crime', 'crime syndicate', 'crime family', 'crime boss']),
    ('trafficking', ARRAY['trafficked', 'trafficker', 'human trafficking', 'drug trafficking', 'sex trafficking']),
    ('cartel', ARRAY['drug cartel', 'gang', 'criminal organization', 'crime ring']),
    ('racketeering', ARRAY['RICO', 'racket', 'extortion ring', 'protection racket']),
    ('smuggling', ARRAY['smuggled', 'smuggler', 'contraband', 'illegal import'])
) AS t(term, variations)
WHERE category_name = 'Organized Crime';

-- Category 4: Terrorism & Security
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('terrorism', ARRAY['terrorist', 'terror attack', 'terror financing', 'terrorist organization']),
    ('extremist', ARRAY['extremism', 'radicalized', 'radical', 'militant']),
    ('sanctions', ARRAY['sanctioned', 'OFAC', 'SDN list', 'sanctions violation', 'sanctions evasion']),
    ('weapons', ARRAY['arms dealing', 'illegal arms', 'weapons trafficking', 'arms smuggling'])
) AS t(term, variations)
WHERE category_name = 'Terrorism & Security';

-- Category 5: Sexual Offenses
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('sexual assault', ARRAY['sexual harassment', 'sexual misconduct', 'sexual abuse', 'groping']),
    ('rape', ARRAY['rapist', 'sexual violence']),
    ('child abuse', ARRAY['child exploitation', 'pedophile', 'child pornography', 'minor abuse']),
    ('indecent', ARRAY['indecency', 'indecent exposure', 'lewd conduct'])
) AS t(term, variations)
WHERE category_name = 'Sexual Offenses';

-- Category 6: Legal/Criminal Proceedings
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('arrest', ARRAY['arrested', 'detention', 'detained', 'taken into custody', 'apprehended']),
    ('convict', ARRAY['convicted', 'conviction', 'convictions', 'found guilty']),
    ('prosecute', ARRAY['prosecuted', 'prosecution', 'prosecutor', 'criminal prosecution']),
    ('indict', ARRAY['indicted', 'indictment', 'grand jury indictment']),
    ('guilty', ARRAY['guilt', 'guilty verdict', 'guilty plea', 'pleaded guilty']),
    ('sentence', ARRAY['sentenced', 'sentencing', 'prison sentence', 'jail sentence']),
    ('prison', ARRAY['imprisoned', 'imprisonment', 'jail', 'jailed', 'incarcerated', 'incarceration']),
    ('felon', ARRAY['felony', 'felonies', 'felony conviction', 'convicted felon']),
    ('verdict', ARRAY['court ruling', 'court verdict', 'jury verdict']),
    ('plea', ARRAY['plea deal', 'plea bargain', 'plea agreement', 'nolo contendere']),
    ('trial', ARRAY['criminal trial', 'on trial', 'court trial', 'jury trial']),
    ('charges', ARRAY['charged', 'criminal charges', 'facing charges', 'charge filed'])
) AS t(term, variations)
WHERE category_name = 'Legal/Criminal Proceedings';

-- Category 7: Regulatory Actions
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('fine', ARRAY['fined', 'penalty', 'penalized', 'monetary penalty', 'civil penalty']),
    ('ban', ARRAY['banned', 'barred', 'disbarred', 'prohibited', 'exclusion']),
    ('license revoked', ARRAY['license suspended', 'deregistered', 'license cancelled']),
    ('violation', ARRAY['violated', 'breach', 'breached', 'infringement', 'non-compliance']),
    ('regulatory action', ARRAY['enforcement action', 'regulatory enforcement', 'SEC action', 'FCA action']),
    ('cease and desist', ARRAY['injunction', 'restraining order', 'court order']),
    ('compliance failure', ARRAY['non-compliance', 'compliance breach', 'regulatory breach'])
) AS t(term, variations)
WHERE category_name = 'Regulatory Actions';

-- Category 8: Civil/Business Issues
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('lawsuit', ARRAY['sued', 'suing', 'litigation', 'litigated', 'legal action', 'civil suit']),
    ('bankruptcy', ARRAY['bankrupt', 'insolvent', 'insolvency', 'Chapter 11', 'Chapter 7', 'liquidation']),
    ('default', ARRAY['defaulted', 'loan default', 'debt default', 'payment default']),
    ('settlement', ARRAY['settled', 'legal settlement', 'out of court settlement']),
    ('dispute', ARRAY['disputed', 'legal dispute', 'contract dispute', 'business dispute']),
    ('malpractice', ARRAY['negligence', 'negligent', 'professional misconduct', 'gross negligence'])
) AS t(term, variations)
WHERE category_name = 'Civil/Business Issues';

-- Category 9: Reputational/Ethical
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('scandal', ARRAY['scandalous', 'embroiled in scandal', 'scandal-hit']),
    ('controversy', ARRAY['controversial', 'controversies', 'public outcry']),
    ('allegation', ARRAY['alleged', 'accused', 'accusations', 'claims against']),
    ('unethical', ARRAY['misconduct', 'ethical violation', 'ethics breach']),
    ('whistleblower', ARRAY['exposed', 'leak', 'leaked', 'revealed wrongdoing']),
    ('cover-up', ARRAY['concealed', 'concealment', 'hidden', 'suppressed'])
) AS t(term, variations)
WHERE category_name = 'Reputational/Ethical';

-- Category 10: Environmental Crimes
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('environmental crime', ARRAY['eco crime', 'environmental offense', 'green crime']),
    ('pollution', ARRAY['polluter', 'polluted', 'polluting', 'contamination', 'toxic release']),
    ('illegal dumping', ARRAY['toxic waste', 'hazardous waste', 'waste dumping', 'fly-tipping']),
    ('environmental violation', ARRAY['EPA violation', 'environmental breach', 'emissions violation'])
) AS t(term, variations)
WHERE category_name = 'Environmental Crimes';

-- Category 11: Cyber Crimes
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('hacking', ARRAY['hacker', 'hacked', 'cyber attack', 'cyberattack', 'computer intrusion']),
    ('data breach', ARRAY['data theft', 'data leak', 'information breach', 'privacy breach']),
    ('identity theft', ARRAY['identity fraud', 'stolen identity', 'impersonation fraud']),
    ('ransomware', ARRAY['malware', 'computer virus', 'cyber extortion', 'cryptolocker'])
) AS t(term, variations)
WHERE category_name = 'Cyber Crimes';
