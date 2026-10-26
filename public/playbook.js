// Laptop Business Mastery playbook. Edit this file to change what students read AND what the AI knows.
export const PLAYBOOK = [
{id:"model", title:"How the business works", body:`
The business is one loop, repeated: **source → intake → test → wipe & install → repair → grade → photograph → list → ship → support**. Profit comes from buying below what the market pays for a tested, clean, honestly described laptop.

### The four numbers that decide everything
- **Landed cost**: winning bid + buyer's premium + tax + pickup or freight.
- **Sale-ready cost**: parts per unit (chargers, batteries, SSDs, keyboards) + your time.
- **Net sale**: sold price minus marketplace fees, shipping and packaging.
- **Cycle time**: days from paying for a lot to the last unit selling. Cash sitting in unsold inventory is the most common reason students stall.

### First-90-days targets
- Days 1–30: set up the business basics, register on auction sites, study sold comps for 5 target models, win a first small lot (5–15 units).
- Days 31–60: test, grade and list the whole first lot within 14 days of pickup. First sales.
- Days 61–90: reinvest profit into a second, larger lot. Build a repeatable weekly routine.
`},
{id:"setup", title:"Business setup checklist", body:`
- Pick a business name and open a separate bank account for the business.
- Check what your state requires for a **seller's permit / resale certificate**. With one, many auction sites and suppliers can exempt you from sales tax on inventory. Rules differ by state; check your state's revenue department website.
- Register on **GovDeals**, **Public Surplus**, and any regional surplus or university auction sites. Read each site's buyer's premium, payment deadline, and pickup rules.
- Create seller accounts on your main marketplace (most students start on **eBay**) and set up payouts.
- Set up a simple inventory sheet (see *Intake & inventory*).
- Buy the starter toolkit: precision screwdriver set, spudgers, anti-static wrist strap, isopropyl alcohol 90%+, microfiber cloths, a bootable USB drive, a USB-C PD charger plus common barrel chargers, a known-good test SSD.
- Questions about taxes, business structure or legal requirements go to a qualified accountant or attorney, not the AI Coach.
`},
{id:"sourcing", title:"Sourcing & what to buy", body:`
### Where lots come from
- **Government & school surplus**: GovDeals, Public Surplus, state surplus sites. Large lots of business laptops, often missing drives and chargers.
- **Business IT refreshes**: local companies, MSPs, ITADs, e-waste recyclers. Build relationships; repeat supply beats one-off auctions.
- **Local marketplaces**: Facebook Marketplace, OfferUp, Craigslist for single units and small lots.

### Models to favor
- Business lines hold value and have cheap, available parts: **Lenovo ThinkPad (T, X, P series)**, **Dell Latitude (5000/7000 series)**, **HP EliteBook / ProBook**, plus **MacBook Air/Pro with Apple silicon**.
- Prefer machines that officially support **Windows 11**: Intel 8th gen Core or newer, or AMD Ryzen 2000 series or newer.
- Socketed RAM and M.2 SSD slots make upgrades and repairs easy.

### Models to avoid as a beginner
- Celeron/Pentium machines with 4GB soldered RAM and eMMC storage.
- Pre-8th-gen Intel laptops (no official Windows 11 support), unless the price is very low.
- Consumer models with known hinge or board failures, and anything heavily water-damaged.

### Red flags in a listing
- "BIOS locked", "password protected", "Computrace", "MDM", "managed device", "activation lock" or "iCloud locked". You may not be able to legally use or resell these.
- Chromebooks with enterprise enrollment. They can't be reset to a normal consumer device.
- Photos that hide the screens, or lots described only as "untested, as is" with no power-on statement.
- Short pickup windows far away, which add freight cost and risk.

### The bidding rule
Decide your **maximum bid before the auction** with the Deal Analyzer and do not go over it. Start with a **30–40% ROI target** on your first lots; you need room for surprises. A missed lot costs nothing. An overpaid lot can cost you a month.
`},
{id:"diligence", title:"Due diligence before bidding", body:`
Ask the seller or check the listing for:
- Exact models and CPU generation (look for model numbers on bottom labels in photos).
- Are drives included? Are chargers included?
- Do units power on? Any known BIOS passwords, asset management or MDM enrollment?
- Are units released from management (Intune/Autopilot, Apple Business Manager, Computrace)? Ask for written confirmation.
- Cosmetic condition range: cracked screens, missing keys, broken hinges.
- Pickup: location, window, loading help, and whether you need a pallet jack or a truck.
- Payment deadline and the exact buyer's premium.
`},
{id:"intake", title:"Intake & inventory", body:`
Log every laptop the day it arrives. One row per unit:
- **SKU** in the format \`LBM-YYMM-###\` (e.g. \`LBM-2610-014\`). Write it on painter's tape on the bottom of the laptop.
- Lot ID, purchase date, cost per unit (landed lot cost ÷ units).
- Brand, model, CPU, RAM, storage, screen, serial number.
- Status: *Received → Testing → Repair → Ready to list → Listed → Sold → Shipped*.
- Grade, parts used and their cost, list date, list price, sold price, fees, shipping, profit.

Flag anything **listed for 30+ days** as aging inventory (see *Pricing*).
`},
{id:"qc", title:"QC testing checklist", body:`
Test every unit with the same checklist and record pass/fail for each item. Never list a unit you haven't fully tested.

1. **Power & charging**: powers on with a known-good charger; charging LED and OS both show charging.
2. **BIOS**: enters BIOS, no supervisor password, correct date/time, no Computrace/absolute persistence enabled. Record the serial number.
3. **Battery**: health as a percentage of design capacity (Windows: \`powercfg /batteryreport\`; Mac: System Information → Power). Check for swelling: a lifted trackpad or a gap in the case means stop (see *Repairs & safety*).
4. **Display**: no dead pixels, lines, backlight bleed or pressure marks. Test on full white, black, red, green and blue. Test touch if it has it.
5. **Keyboard**: every key, plus backlight. Use an online keyboard tester.
6. **Trackpad**: click, tap, two-finger scroll.
7. **Webcam & microphone**: open the camera app; record a short voice memo.
8. **Speakers & headphone jack**: left/right audio test.
9. **Wi-Fi & Bluetooth**: connect to Wi-Fi, pair a Bluetooth device.
10. **Ports**: every USB-A, USB-C (data and charging), HDMI/DisplayPort, SD reader, Ethernet.
11. **Storage**: SSD health with CrystalDiskInfo or similar; status should read Good.
12. **RAM**: matches spec; run a memory test if you see crashes.
13. **Hinges & chassis**: hinges hold the screen at any angle; no cracks; all screws and rubber feet present.
14. **Final record**: grade, notes, photos taken, tester initials, date.
`},
{id:"wipe", title:"Data wipe & OS install", body:`
- **Every drive is wiped before resale.** Use a secure-erase tool or the manufacturer's SSD utility, or replace the drive. Never sell a laptop with a previous owner's data on it.
- Install a fresh, genuine copy of Windows from Microsoft's official media. Most business laptops have a Windows license in the firmware and activate automatically. If it won't activate, don't sell it as "activated".
- Install drivers from the manufacturer's support site or Windows Update. Run all updates before listing.
- For Macs, erase and reinstall macOS through Recovery. The previous owner's Apple ID must be removed; an activation-locked Mac can't be sold as working.
- **Never bypass a BIOS password, MDM lock, Computrace or activation lock you don't own the rights to remove.** Ask the seller to release it. If they won't, sell the unit for parts and say so clearly.
`},
{id:"grading", title:"Condition grading", body:`
Grade honestly. Over-grading is the number one cause of returns and bad feedback.

- **Grade A – Excellent**: fully functional; minimal signs of use visible only up close; screen flawless; battery 80%+.
- **Grade B – Good**: fully functional; light scratches or scuffs visible at arm's length; screen has no defects that show while on; battery 70%+.
- **Grade C – Fair**: fully functional; heavy wear, dents, worn keys, or minor screen marks visible while on; battery may be below 70%.
- **For parts / not working**: any failed function, BIOS or MDM lock, cracked screen, missing parts, or no power. Describe exactly what does and doesn't work.

The lowest-scoring area sets the grade. A pristine laptop with a 60% battery is Grade C unless you replace the battery.
`},
{id:"repairs", title:"Repairs & safety", body:`
### Safety first
- **Swollen battery**: stop. Don't charge, puncture, or press on it. Disconnect it if you can do so without pressure, store it in a fireproof container away from anything flammable, and take it to a battery recycling drop-off. Never ship a swollen battery.
- Unplug the charger and disconnect the battery before opening a laptop.
- Use an anti-static strap when touching RAM, SSDs or the motherboard.

### Common fixes
- **No power**: try a known-good charger → hard reset (unplug, hold power 30 s) → disconnect battery and power on from the charger alone → reseat RAM → try one RAM stick at a time. If nothing works, it's likely a board issue; sell for parts.
- **Powers on, no display**: connect an external monitor. Picture on the external monitor means a screen, cable or backlight issue. No picture anywhere means reseat RAM, then a board issue.
- **Keys not working**: clean under keys first; if several adjacent keys fail, replace the keyboard (many business laptops have easily replaceable keyboards).
- **Wi-Fi missing**: install the manufacturer driver; check the BIOS wireless setting; reseat the Wi-Fi card antennas.
- **Slow / freezing**: check SSD health; replace failing drives.

Anything involving board-level soldering, burning smells, liquid damage, or a repair costing more than 25% of the expected resale goes to your coach before you spend money.
`},
{id:"photos", title:"Photos", body:`
- 10–12 photos minimum on a plain, clean background in daylight or bright, even light.
- Shots: front open with the screen ON showing the desktop, lid, bottom, each side showing ports, keyboard close-up, trackpad, charger, every flaw close up, and the "About" screen showing specs.
- Show flaws clearly. A buyer who saw the scratch in your photos doesn't open a return over it.
`},
{id:"listing", title:"Listing standards", body:`
### Title formula (eBay allows 80 characters)
**Brand + Model + CPU + RAM + Storage + Screen + OS + key feature**
Example: \`Lenovo ThinkPad T14 Gen 2 14" FHD i5-1145G7 16GB 512GB SSD Win 11 Pro Backlit\`
Leave out filler like "WOW", "L@@K", or "Great deal".

### Description template
1. One-sentence summary (model, specs, grade).
2. Specs list.
3. **Tested and working**: list what you tested.
4. **Condition**: grade plus every flaw, plainly described.
5. Battery health percentage.
6. What's included (charger: genuine or compatible).
7. Data: wiped and fresh OS installed.
8. Shipping and return policy.

### Rules
- Disclose every known flaw. Never claim "like new" unless it is.
- Fill in every item specific the marketplace offers; they drive search filters.
- Charger listed as "genuine" only if it is the manufacturer's original.
`},
{id:"pricing", title:"Pricing", body:`
- Price from **sold** listings, not active ones. On eBay, filter by *Sold items* and use the last 30–90 days, same model, CPU, RAM, storage and condition.
- Take 5+ comparable sales. Start Grade A near the top of the range, Grade B near the median, Grade C below the median.
- Turn on **Best Offer** with an auto-decline floor at your minimum acceptable price.
- **Aging schedule**: no sale after 14 days → check photos and title; 30 days → drop 5–8%; 45 days → drop again or move to another marketplace. Cash back in your pocket beats a perfect price.
`},
{id:"shipping", title:"Shipping & packing", body:`
- Use a laptop box or a box with at least 2 inches of padding on every side. Double-box higher-value machines.
- Laptop in an anti-static or poly bag; charger bagged separately so it can't scratch the lid.
- Put a strip of paper or foam between the keyboard and the screen to prevent keyboard marks on the display.
- Shake test: nothing should move.
- Ship within your stated handling time. Add insurance for higher-value machines and consider signature confirmation above the threshold your marketplace recommends.
- Include a small note with the SKU and a thank-you; it makes support easier.
- Photograph the packed laptop and the label before sealing.
`},
{id:"support", title:"Buyer messages & returns", body:`
Reply within 24 hours, polite and short. Templates:
- **Question before buying**: "Thanks for asking! [Answer]. It's fully tested, wiped and ready to use. Let me know if you have any other questions."
- **Missing charger claim**: "Sorry about that. I photographed every package before shipping and want to make this right. Could you check the box padding? If it's not there, I'll send a replacement charger today."
- **Battery question**: "The battery tested at [X]% of its original capacity, which typically gives about [estimate] hours of light use."
- **Windows not activated**: "Please connect to the internet and go to Settings → System → Activation, then select Troubleshoot. If it still shows not activated, send me a screenshot and I'll sort it out."
- **Return request**: accept returns that match your policy without arguing. Ask for photos, issue the label, and inspect the laptop when it comes back.
- Escalate to your coach: threats of chargebacks, buyers asking you to ship outside the marketplace, anything that sounds like a scam, or any dispute over $200.
`},
{id:"rhythm", title:"Weekly rhythm & milestones", body:`
### Weekly rhythm
- **Monday**: check auctions closing this week; run the Deal Analyzer on anything interesting.
- **Tuesday–Thursday**: test, repair, grade, photograph.
- **Friday**: list everything that's ready; ship sold orders.
- **Sunday**: Weekly Check-in; send the report to your coach.

### Milestones
1. Business setup complete
2. First lot won
3. First 10 laptops tested
4. First listing live
5. First sale
6. First $1,000 profit
7. First lot of 25+ units
8. Consistent $1,000+ profit per month

### Bring it to a coaching call
- Any lot over 25% of your available capital.
- Repair decisions over 25% of expected resale.
- Supplier relationships and negotiations.
- Locked devices, legal questions, buyer disputes, and anything the AI Coach says it isn't sure about.
`}
];

export const PLAYBOOK_TEXT = PLAYBOOK.map(s => "## " + s.title + "\n" + s.body.trim()).join("\n\n");
export const section = ids => PLAYBOOK.filter(s => ids.includes(s.id)).map(s => "## " + s.title + "\n" + s.body.trim()).join("\n\n");
