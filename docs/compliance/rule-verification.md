# Rulebook verification (research, not legal advice)

- **What this is:** the owner checked the rules in `packages/content/library/rules/*.yaml` against public sources. This is research. It is **not legal advice** and no attorney reviewed it.
- **Date:** 2026-10-02.
- **Decision recorded:** the owner decided that attorney review does not block launch of this **internal** training tool. **Before any pilot that involves real customers**, look at this again and have a Florida dealer attorney review it (spec 4.5 and 23.1).
- **Method and its limit:** the network egress policy blocked every direct page fetch: leg.state.fl.us, flsenate.gov, m.flsenate.gov, law.justia.com, codes.findlaw.com, ecfr.gov, govinfo.gov, law.cornell.edu and ftc.gov. All findings below come from **web-search result excerpts** of those primary pages, plus law-firm and agency summaries. Quotes marked "(excerpt)" are statute or rule text as the search excerpt showed it. Statute subsection numbers marked "(unconfirmed)" could not be checked against the official page. Before a customer pilot, check every quote marked this way against leg.state.fl.us or eCFR.

## Rule table

| Rule | Basis found | Verdict | Note |
| --- | --- | --- | --- |
| PRICE-01 | Law: Fla. s. 501.976(16) and (11); FTC guidance: Pricing Transparency FAQs (Sept 15, 2026); Lindsay order (Apr 2026) | Supported by law | Florida requires an advertised price to include every fee the customer must pay. Only "state and local taxes, tags, registration fees, and title fees" may be left out. The FTC excludes only charges "a Federal, State, or local government agency requires the consumer to pay directly". Quoting all-in on the sales floor goes beyond the advertising rules. Keep it. Dealer-imposed tag-agency or electronic-filing fees are not government charges. |
| PRICE-02 | FTC guidance: the FAQs treat staff phone calls and texts as advertising; Fla. s. 501.976(16) | Supported by law | Per the FAQ summaries, "Phone calls and text messages from dealership staff are considered to be advertisements." |
| PRICE-03 | FTC guidance: FAQs; Lindsay complaint and order | Supported by law | The advertised price cannot rely on a rebate that not every buyer qualifies for, and a disclaimer does not fix it. Lindsay is alleged to have told buyers they "did not qualify for a variety of rebates included in the advertised price". |
| PRICE-04 | FTC guidance: FAQs; Lindsay | **Needs a fix** | The rule itself is sound. The `fact` overstates the law: the FAQ allows a separate discount for dealer financing, as long as the price available with any financing is shown most prominently. See Fix 1. |
| PRICE-05 | House rule; FAQ and Manchester City Nissan order make the total price the most prominent figure | Stricter than law (house rule, keep) | For live conversation there is no rule on the order in which charges are spoken. |
| PAY-01 | FTC Act s. 5 deception; FTC Napleton order (2022); Asbury allegations (pending) | Supported by law | Napleton: consumers were "falsely told the add-ons were free or were a requirement". Asbury: payments "larger than needed... then 'packed' add-on items". |
| PAY-02 | Credit Acceptance multistate judgment (41 AGs including Florida, effective Nov 2, 2026) | Stricter than law (house rule, keep) | The judgment binds Credit Acceptance and the deals assigned to it. It is not a general rule for the store. Clarify `legal_basis` (L1). |
| PAY-03 | FTC Act s. 5 deception; Asbury payment-packing allegations | Supported by law | The Asbury allegations are not proven. The case was still stayed as of Aug 2026. |
| ADD-01 | Law: Fla. s. 634.121 written notice; FTC guidance: FAQs; Napleton; Manchester City Nissan (Aug 2026) | Supported by law | The s. 634.121 notice covers service agreements only. The FAQ covers every add-on: dealers cannot "suggest an add-on is required when it is in fact optional". The `fact` is true only when no lender in the scenario truly requires the product, so keep it tied to the scenario facts. |
| ADD-02 | FTC guidance: FAQs | **Needs a fix** | The FAQ allows a non-removable pre-installed item if it is included in the advertised price. "Pre-installed options are optional" (the `none_configured` text) is not a legal fact. See Fix 2. |
| ADD-03 | FTC "Free" Guide (16 CFR 251); FDUTPA s. 501.204; Napleton | Supported by law | No "free" clause was found in s. 501.976. Re-cite (L2). |
| ADD-04 | Law: Fla. s. 634.121 | **Needs a fix** | The 60 days is the **full-refund** window, not a deadline to cancel. The contract can also be cancelled after 60 days for a prorated refund. See Fix 3. |
| RATE-01 | House rule; misstating a rate or approval is deception (FTC Act s. 5, FDUTPA) | Stricter than law (house rule, keep) | No Florida statute was found that bans spot delivery outright. The rule bans only false approval claims. |
| TRADE-01 | House rule (FDUTPA covers outright misstatements) | Stricter than law (house rule, keep) | |
| TRADE-02 | House rule | Stricter than law (house rule, keep) | |
| DEAD-01 | House rule | Stricter than law (house rule, keep) | |
| AVAIL-01 | House rule; FAQ bars advertising cars that are not available | Stricter than law (house rule, keep) | No source specifically addresses "invented other buyer" claims. They are treated as a general misstatement of fact. |
| AVAIL-02 | FTC guidance: FAQs | Supported by law | The FAQ says ads for in-transit or off-site cars must "clearly indicate that they are not physically on the lot". Applying this to conversation goes beyond the ad rule. Keep it. |
| AUTH-01 | House rule | Stricter than law (house rule, keep) | |
| CANCEL-01 | Law: 16 CFR 429.0 and 429.3; Fla. s. 501.021; Florida DHSMV consumer guidance | Supported by law | Neither federal nor Florida law gives a 3-day right for sales at the dealership. One narrow edge case is a signing at the buyer's home (see Q3). Optional wording change at O1. |
| LANG-01 | FTC Cowboy AG order (final Jan 2018); FTC Used Car Rule 16 CFR 455.5 | **Needs a fix** | California Civil Code 1632 does not apply in Florida, and no general Florida equivalent was found. Replace that citation (Fix 4). |
| FAIR-01 | ECOA 15 U.S.C. 1691(a); Reg B 12 CFR 1002.4(a) (disparate treatment) | **Needs a fix** (`legal_basis` only) | The FTC removed the ECOA count from its Asbury complaint on Jul 17, 2025, so "Asbury allegations" is out of date. The rule itself stands (Fix 5). |
| COERCE-01 | House rule | Stricter than law (house rule, keep) | |
| ID-01 | House rule | Stricter than law (house rule, keep) | |
| REVIEW-01 | 16 CFR 465.4; Endorsement Guides 16 CFR 255.2(d); FTC Q&A | Supported by law | Part 465 bars incentives conditioned on sentiment. Review gating is not in Part 465, but the FTC Q&A says it "could violate the FTC Act" (255.2(d)). Re-cite (L3). |
| CONSENT-01 | TCPA 47 U.S.C. 227(b) and (c); 47 CFR 64.1200; Fla. s. 501.059 (FTSA) | Stricter than law (house rule, keep) | Manual one-to-one texts need no written consent by law. Automated or prerecorded messages do under the FTSA. See Q6. Re-cite (L4). |

**Counts:** Supported by law 10 · Stricter than law (house rule, keep) 11 · Needs a fix 5 · Could not verify 0. Several underlying texts are verified only through search excerpts; see "Could not verify" below.

## Needs a fix

**Fix 1: PRICE-04 `fact`.** Current text: "The price stands the same with any financing, including the customer's own bank or cash." This holds only if the store offers no discount for dealer financing. The FAQs allow one, as long as the price available with any financing is shown most prominently. Source (summary of the FAQ): "a dealer advertising a $39,999 vehicle can offer a $2,000 discount for using dealer financing, as long as the $39,999 price that any consumer would pay using any financing is listed most prominently." Recommended:
> "The price you quote must be one the customer can pay with any financing, including their own bank or cash. If the store offers a discount for financing with us, say it after that price and say it is conditional."

**Fix 2: ADD-02 `fact_by_policy.none_configured` and `explanation`.** Current text: "Pre-installed options are optional..." / "A pre-installed option can be declined." FTC FAQ (summary): dealers cannot "imply that an installed 'option' cannot be removed and that the consumer must pay for it". Also: "anything pre-installed that the buyer cannot remove from the deal must be included in the advertised price." Recommended:
> explanation: "A pre-installed item is either optional, so the customer can decline paying for it, or already included in the advertised price. It cannot be charged on top of the price and also be impossible to remove."
> none_configured: "The store has not set its policy for pre-installed items. Do not say the item cannot be removed. Offer to find a solution with the manager."

**Fix 3: ADD-04 `fact`, `description` and `explanation`.** Fla. s. 634.121 (excerpt; subsection numbers unconfirmed):
- "Before the sale of any service agreement, written notice must be given to the prospective purchaser by the service agreement company or its agent or salesperson that purchase of the service agreement is not required in order to purchase or obtain financing for a motor vehicle."
- "Any service agreement is cancelable by the purchaser within 60 days after purchase", with a refund of "100 percent of the gross premium paid, less any claims paid on the agreement".
- "A reasonable administrative fee may be charged not to exceed 5 percent of the gross premium paid".
- "If, after 60 days, the service agreement is canceled by the service agreement holder... the insurer or service agreement company shall return directly to the agreement holder not less than 90 percent of the unearned pro rata premium, less any claims paid on the agreement."

The Florida CFO consumer page says the same. The current text "can be cancelled within 60 days" implies the customer cannot cancel after day 60, which is false. Recommended:
> fact: "In Florida a service contract is optional: buying it is not required to buy or finance the car. The customer can cancel it. Within 60 days the refund is the full amount paid, minus any claims paid and any administrative fee (Florida caps it at 5 percent). After 60 days the refund is prorated."
> description: "Service contracts are described as optional, with a full refund if cancelled within 60 days in Florida."
> explanation: "A service contract was discussed without saying it is optional and fully refundable within 60 days. {fact}"

Note: this applies to motor vehicle service agreements under Part I of ch. 634. Check each product's contract (GAP, tire and wheel, coatings) before applying the 60-day statement to it. The `required_all` check for "60 days" can stay.

**Fix 4: LANG-01 `legal_basis`.** "California Civil Code 1632 as reference" points reps to a law that does not bind a Florida store. Recommended:
> "FTC Cowboy AG order (2018): material limitations must be stated in the same language as the claim; FTC Used Car Rule 16 CFR 455.5 (Spanish Buyers Guide and contract disclosure when a used-car sale is conducted in Spanish); FTC Act s. 5. Florida has no general contract-translation statute found."

Source (FTC press release, Jan 2018, via excerpt): "if Cowboy Toyota makes a representation in one language, it must state clearly and conspicuously any material limitations in the same language." 16 CFR 455.5 (excerpt): "If you conduct a sale in Spanish, the window form required by § 455.2 and the contract disclosures required by § 455.3 must be in that language."

**Fix 5: FAIR-01 `legal_basis`.** "Asbury allegations" is outdated. The FTC issued an amended Asbury complaint on Jul 17, 2025 that removed the ECOA count, and its Aug 2026 policy statement says it "will no longer pursue disparate-impact claims in any context". Disparate *treatment* is still prohibited. ECOA bars discrimination on national origin "with respect to any aspect of a credit transaction", and Reg B 1002.4(a) says the same. The CFPB's final rule of Apr 22, 2026 (effective Jul 21, 2026) removed the "effects test" from Reg B but, per summaries, "preserves disparate treatment liability, including claims based on facially neutral criteria that are used as proxies for prohibited basis characteristics." Offering different terms by language can serve as a proxy for national origin. Recommended:
> "ECOA 15 U.S.C. 1691(a) and Reg B 12 CFR 1002.4(a): no disparate treatment on national origin in any aspect of credit; language used as a proxy counts. Cash-price parity across languages is a house rule. Disparate-impact theories dropped by CFPB (Reg B, eff. Jul 21, 2026) and FTC (Aug 2026)."

### `legal_basis` citations to update (no change to the rule's substance)

- **L1 PAY-02:** "Credit Acceptance multistate consent judgment (41 AGs incl. Florida; effective Nov 2, 2026), which binds deals assigned to Credit Acceptance; applied to all deals as a house rule." PAY-01 and PAY-03 cite the same decree. Add "for Credit Acceptance deals".
- **L2 ADD-03:** "FTC Guide on use of the word 'Free', 16 CFR 251; FDUTPA s. 501.204; FTC Napleton complaint." No "free" clause was found in s. 501.976.
- **L3 REVIEW-01:** "16 CFR 465.4 (no incentives conditioned on sentiment); 16 CFR 255.2(d) and FTC Rule Q&A (selective solicitation that distorts reviews)." The explanation "Reviews must be asked of every customer" is stricter than the law. That is fine as a house standard.
- **L4 CONSENT-01:** "Fla. s. 501.059 (FTSA): prior express written consent for automated (select-and-dial), recorded or prerecorded-voicemail sales calls and texts; TCPA 47 U.S.C. 227(b) and 47 CFR 64.1200(a) for autodialed or prerecorded calls; do-not-call rules 64.1200(c) and s. 501.059. Texting without consent on file is a house rule." Also add `WhatsApp` to the English `send_text` patterns. The Spanish patterns already include it.
- **O1 CANCEL-01 (optional wording):** "Florida has no three-day cooling-off right for buying a vehicle at the dealership. Once signed, the contract binds both sides unless it says otherwise."

## Research answers (Q1 to Q9)

**Q1. Fla. s. 501.976** (excerpt; 2025 statutes):
- Lead-in: "It is an unfair or deceptive act or practice, actionable under the Florida Deceptive and Unfair Trade Practices Act, for a dealer to..."
- (11): add to the cash price "any fee or charge other than those provided in [s. 520.02(2)] and in rule 3D-50.001 ... All fees or charges permitted to be added to the cash price ... must be fully disclosed to customers in all binding contracts concerning the vehicle's selling price."
- (16): the advertised price "must include all fees or charges that the customer must pay, including freight or destination charge, dealer preparation charge, and charges for undercoating or rustproofing. State and local taxes, tags, registration fees, and title fees, unless otherwise required by local law or standard, need not be disclosed in the advertisement." The text of (16) traces back to former rule 2-19.005(16) F.A.C. (AGO 88-58).
- (17): no charge for predelivery service that the manufacturer requires and reimburses.
- (18): predelivery charges require this sentence printed on every document with that line item: **"This charge represents costs and profit to the dealer for items such as inspecting, cleaning, and adjusting vehicles, and preparing documents related to the sale."** This is the statutory wording that spec 4.5 asks for.
- The Florida Attorney General announced dealer-advertising enforcement from Sept 1, 2024.

**Q2. Fla. s. 634.121:** the written "not required" notice exists, and so do the 60-day full-refund and post-60-day pro-rata rules (Fix 3). Other required disclosures: the agreement can be assigned to a later buyer, and the rate "is not subject to regulation by the Office of Insurance Regulation".

**Q3. Cooling-off:**
- The federal rule covers only sales away from the seller's place of business. 16 CFR 429.0 (excerpt) says it does not apply to a sale "pursuant to prior negotiations in the course of a visit by the buyer to a retail business establishment having a fixed permanent location". 429.3 exempts motor vehicles sold "at auctions, tent sales or other temporary places of business, provided that the seller is a seller of vehicles with a permanent place of business".
- Florida's home-solicitation 3-business-day right (s. 501.021-.025) excludes "a sale made by a motor vehicle dealer licensed under s. 320.27 which occurs at a location or facility open to the general public". It also excludes sales that result from the buyer's request for specific goods.
- Florida DHSMV: "there is no cooling off period under Florida law."
- Narrow edge case (not verified): a dealer who solicits and signs a deal at the buyer's home without the buyer having asked for that specific vehicle. Attorney question.
- Florida has no statutory "contract cancellation option". California's Civ. Code 2982.2 does not apply.

**Q4. CARS Rule:** the Fifth Circuit vacated it on Jan 27, 2025 (NADA v. FTC, No. 24-60013) for failing to issue an advance notice of proposed rulemaking. The FTC withdrew Part 463 effective Feb 12, 2026 (FR Doc. 2026-02866). No rule file cites it.

FTC "Automobile Industry Pricing Transparency: FAQs" (Sept 15, 2026; staff guidance, "do not create any new rules"), per summaries:
- The advertised price must be "the actual price any consumer can walk in and pay". The only exclusion is "amounts a Federal, State, or local government agency requires the consumer to pay directly".
- Doc fee example: a $40,000 car with an $85 fee must be advertised at $40,085.
- Required packages, etch, nitrogen, or "anything pre-installed that the buyer cannot remove" go in the price.
- Optional add-ons cannot be called required, called non-removable, mispriced, or charged without consent.
- Rebates that only some buyers get cannot be in the headline price.
- A dealer-financing discount is allowed only below the any-financing price.
- In-transit cars must be disclosed.
- The guidance applies to calls and texts.

The ftc.gov page itself was blocked.

**Q5. Reviews:**
- 465.4 (excerpt): it is unlawful "to provide compensation or other incentives in exchange for, or conditioned expressly or by implication on, the writing or creation of consumer reviews expressing a particular sentiment, whether positive or negative".
- 465.7 covers suppression: threats or intimidation, and misrepresenting displayed reviews while suppressing negative ones.
- 465.5 covers reviews solicited from staff and relatives.
- Review gating: the FTC Q&A says the Rule "does not contain a specific prohibition against such conduct, but this practice could violate the FTC Act. See Endorsement Guides 16 C.F.R 255.2(d) and (e)(11)."
- 255.2(d): "advertisers should not take actions that have the effect of distorting or otherwise misrepresenting what consumers think of their products".
- An incentive that does not depend on sentiment is not barred by 465.4.

**Q6. Texts and voicemail consent (concrete):**
1. **Automated texts.** These are bulk or campaign texts from a platform that selects and dials numbers. The FTSA (as amended May 25, 2023 by HB 761, "selection *and* dialing") requires **prior express written consent**. The 2023 amendment let "signature" include "an act that demonstrates consent", such as a checkbox. It also requires the recipient to text "STOP" and wait 15 days before suing over texts.
2. **Federal law.** After *Facebook v. Duguid* (2021), an autodialer must use "a random or sequential number generator", so most CRM texting falls outside 227(b). The FCC rule still requires written consent for autodialed or prerecorded telemarketing. *Bradford v. Sovereign Pest Control* (5th Cir., Feb 25, 2026) held that oral consent suffices, but the Fifth Circuit does not bind Florida, which is in the 11th Circuit.
3. **A rep texting by hand, one to one, a customer who gave their number on the lot.** Neither the FTSA nor 227(b) requires written consent. Do-not-call rules still apply. The federal established-business-relationship exemption covers an inquiry for 3 months and a purchase for 18 months (64.1200(f)(5)). The FTSA's definition of an unsolicited call excludes calls made "in response to an express request" or to "a person with whom the telephone solicitor has a prior or existing business relationship". Whether a text counts as a "telephone call" for TCPA do-not-call suits is split: no in the 7th Cir. (*Steidinger*, Jul 14, 2026); pending in the 11th Cir. (*Radvansky*).
4. **Voicemail.** A prerecorded or "ringless" voicemail is a call that needs consent (FCC ruling of Nov 21, 2022), and the FTSA needs written consent for a "prerecorded voicemail". A **live, personal voicemail** left by a rep is neither automated nor prerecorded, so it is outside 227(b) and the FTSA's automated-call clause. Do-not-call rules and calling hours still apply.
5. **WhatsApp.** No primary authority found. **Could not verify.** Treat it as a text.
6. **Calling hours.** Florida limits commercial solicitation calls to 8 a.m. to 8 p.m. and 3 per 24 hours (s. 501.616(6), excerpt). Whether a licensed dealer is exempt was not verified.

**Q7. Language:**
- Cowboy AG (Cowboy Toyota) final order, Jan 2018: any material limitation goes in the same language as the claim. This is an order against one dealer and illustrates the FTC's theory. It is not a statute.
- No general Florida equivalent of Cal. Civ. Code 1632 was found. This was confirmed only through secondary sources. Chapter 520 has no translation requirement in the summaries.
- A binding federal rule does exist for used cars: 16 CFR 455.5.

**Q8. Payment packing and add-ons:**
- Asbury (Part 3 complaint, Aug 2024; amended Jul 2025; stayed as of Aug 2026): dealers "convinced consumers to agree to monthly payments that were larger than needed to pay for the agreed-upon price of the car, and then 'packed' add-on items to the sales contract to make up that difference". Up to "75 percent of consumers reported being charged for unauthorized or falsely required add-on products".
- Napleton (FTC and Illinois, Apr 2022, $10M): the dealer would "wait until the end of the hours-long negotiation process to sneak junk fees for add-on products into consumers' purchase contracts". Consumers were "falsely told the add-ons were free or were a requirement".
- Credit Acceptance (summaries only; the decree PDF was not reachable): before closing, the buyer signs a form showing that service contracts and GAP are optional, with the payment shown with and without them. A written reminder follows within 10 days, and cancellation goes through Credit Acceptance.

**Q9. ECOA:** see Fix 5. ECOA and Reg B still prohibit national-origin disparate treatment. The 2026 change the spec mentions is real and limited to disparate impact: CFPB final rule of Apr 22, 2026 (eff. Jul 21, 2026) and the FTC policy statement of Aug 2026.

## Could not verify

- Verbatim official text and subsection numbers of s. 501.976 and s. 634.121. Every Florida statute host was blocked, so these come from search excerpts.
- The FTC FAQ page itself and the Credit Acceptance decree PDF. Their content comes from law-firm and AG summaries.
- Whether WhatsApp messages are "calls" or "text messages" under the TCPA or FTSA.
- Whether a dealer's at-home signing could trigger Florida's home-solicitation 3-day right.
- Whether licensed dealers are exempt from s. 501.616(6) calling limits.

## Sources

All were accessed 2026-10-02 **through web-search result excerpts**. Direct fetches of ftc.gov, ecfr.gov, govinfo.gov, law.cornell.edu, leg.state.fl.us, flsenate.gov, law.justia.com and codes.findlaw.com were blocked by network policy.

- Fla. Stat. 501.976 (2025): https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599%2F0501%2FSections%2F0501.976.html ; https://trellis.law/state-rules/fl/statutes/title-xxxiii/chapter-501/part-vi/501976
- AGO 88-58, dealer advertising: https://www.myfloridalegal.com/ag-opinions/advertising-by-motor-vehicle-dealers
- Florida AG dealer advertising enforcement: https://bsm-law.com/floridas-attorney-general-is-claiming-violations-of-laws-regarding-dealer-advertising/
- Fla. Stat. 634.121: https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&Search_String=&URL=0600-0699%2F0634%2FSections%2F0634.121.html ; https://flsenate.gov/Laws/Statutes/2024/0634.121
- Florida CFO, service agreement overview: https://www.myfloridacfo.com/division/consumers/understanding-insurance/motor-vehicle-service-agreement-overview
- Fla. Stat. 501.021, 501.025: https://florida.public.law/statutes/fla._stat._501.021 ; https://www.flsenate.gov/Laws/Statutes/2021/0501.025
- Florida DHSMV, buying from a dealer: https://www.flhsmv.gov/safety-center/consumer-education/buying-vehicle-florida/buying-licensed-dealer/
- 16 CFR 429: https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-429 ; https://www.govinfo.gov/content/pkg/CFR-2024-title16-vol1/pdf/CFR-2024-title16-vol1-part429.pdf
- CARS Rule vacatur: https://www.ca5.uscourts.gov/opinions/pub/24/24-60013-CV0.pdf ; withdrawal: https://www.federalregister.gov/documents/2026/02/12/2026-02866/revision-of-the-negative-option-rule-withdrawal-of-the-cars-rule-removal-of-the-non-compete-rule-to
- FTC Pricing Transparency FAQs: https://www.ftc.gov/business-guidance/resources/automobile-industry-pricing-transparency-faqs ; summaries: https://www.hklaw.com/en/insights/publications/2026/09/ftc-publishes-price-transparency-faqs , https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/ftc-releases-faqs-on-auto-pricing-what-dealers-and-advertisers-need-to-know , https://natlawreview.com/article/ftc-issues-price-transparency-faqs-auto-dealers , https://vada.com/blog/2026/09/21/barrie-deceptive-pricing/
- FTC Lindsay: https://www.ftc.gov/news-events/news/press-releases/2026/04/ftc-maryland-attorney-general-secure-full-refunds-additional-penalties-against-lindsay-auto-group
- FTC Manchester City Nissan: https://www.ftc.gov/news-events/news/press-releases/2026/08/ftc-connecticut-secure-4-million-settlement-manchester-city-nissan-over-deceptive-fees-allegations
- FTC Napleton: https://www.ftc.gov/news-events/news/press-releases/2022/04/ftc-takes-action-against-multistate-auto-dealer-napleton-sneaking-illegal-junk-fees-bills
- FTC Asbury complaint and docket: https://www.ftc.gov/system/files/ftc_gov/pdf/611899.2024.10.08_asbury_part_3_administrative_complaint_public.pdf ; https://www.ftc.gov/legal-library/browse/cases-proceedings/222-3135-asbury-automotive-group-inc-et-al-matter ; https://www.ftc.gov/system/files/ftc_gov/pdf/ferguson-joined-by-holyoak-meador-asbury-statement-2025.07.17.pdf
- Credit Acceptance: https://ag.ny.gov/press-release/2026/attorney-general-james-secures-700-million-abusive-subprime-auto-lender-credit ; https://www.ag.state.mn.us/Office/Communications/2026/09/17_Credit-Acceptance-Corp.asp
- 16 CFR 465 and FTC Q&A: https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465 ; https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers
- 16 CFR 255.2: https://www.govinfo.gov/content/pkg/CFR-2026-title16-vol1/pdf/CFR-2026-title16-vol1-sec255-2.pdf
- 16 CFR 251: https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-251
- Fla. Stat. 501.204: https://www.flsenate.gov/Laws/Statutes/2011/501.204
- Fla. Stat. 501.059 (2025): https://flsenate.gov/Laws/Statutes/2025/501.059 ; HB 761 (2023) analysis: https://www.flsenate.gov/Session/Bill/2023/761/Analyses/h0761e.COM.PDF ; https://www.klgates.com/Florida-Legislature-Passes-Bill-to-Bring-Common-Sense-Changes-to-the-Florida-Telephone-Solicitation-Act-5-9-2023
- 47 CFR 64.1200: https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200
- Facebook v. Duguid: https://supreme.justia.com/cases/federal/us/592/19-511/
- Bradford (5th Cir. 2026): https://www.hklaw.com/en/insights/publications/2026/03/tcpa-reset-fifth-circuit-rejects-prior-express-written-consent-rule
- Steidinger (7th Cir. 2026): https://www.cooley.com/news/insight/2026/2026-07-21-seventh-circuit-holds-texts-not-telephone-calls-under-key-tcpa-provision ; 11th Cir. district courts: https://tcpablog.com/2026/courts-in-eleventh-circuit-find-no-private-right-of-action-under-227c-for-texts/
- FCC ringless voicemail ruling (2022): https://www.daypitney.com/insights/publications/2022/11/28-fcc-concludes-ringless-voicemails-calls-tcpa
- Fla. Stat. 501.616 hours: https://natlawreview.com/article/part-2-definitive-guide-to-new-florida-robocall-bill-you-ve-been-waiting-section
- Cowboy AG: https://www.ftc.gov/news-events/news/press-releases/2018/01/ftc-approves-final-consent-order-cowboy-toyota-deceptive-advertising-case ; https://www.federalregister.gov/documents/2017/12/08/2017-26443/cowboy-ag-llc-analysis-to-aid-public-comment
- 16 CFR 455.5: https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-455
- Florida translation law (secondary): https://theperfecttranslation.com/requirements-to-translate-consumer-contracts/
- Reg B 2026 final rule: https://public-inspection.federalregister.gov/2026-07804.pdf ; https://www.gtlaw.com/en/insights/2026/5/cfpb-final-rule-revises-ecoa-framework-narrows-disparate-impact-and-discouragement-standards
- FTC disparate-impact policy: https://www.ftc.gov/system/files/ftc_gov/pdf/disparate%20Impact-policy-statement.pdf ; https://www.consumerfinancemonitor.com/2026/08/14/ftc-abandons-disparate-impact-and-unfair-discrimination-theories-a-major-shift-in-federal-consumer-protection-law/
