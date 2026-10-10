/*
 * assets/js/toolkit/tours.js
 *
 * Demo scripts for every tool in the Marketing Toolkit Hub, played by
 * toolkit-tour.js. Keyed by the id of the element each tool mounts into.
 * Every demo uses the tool's own sample, the European hotel group from the
 * classroom case, and ends on the export buttons.
 */
(function () {
  "use strict";
  const X = (id) => `#${id} .tk-export-row`;
  const R = (id) => `#${id} .tk-report`;

  window.TKTours = {

    // ---------------- Strategic analysis ----------------
    "swot-app": { steps: [
      { sel: "#swot-app .scored-grid", title: "Four boxes, each scored", text: "SWOT lists strengths, weaknesses, opportunities and threats. Here every item also gets two scores, so the list turns into a ranking." },
      { sel: '#swot-app form[data-category="strengths"]', title: "Add a strength", text: "Type the item, then score its impact and its likelihood from 1 to 5.",
        do: [["type", '#swot-app form[data-category="strengths"] .scored-add-text', "Direct website shows all-in prices"], ["select", '#swot-app form[data-category="strengths"] .scored-add-impact', 4], ["select", '#swot-app form[data-category="strengths"] .scored-add-likelihood', 5], ["submit", '#swot-app form[data-category="strengths"] .scored-add-text']] },
      { sel: '#swot-app form[data-category="threats"]', title: "Add a threat", text: "The same scoring works for threats. This one is likely and would hurt.",
        do: [["type", '#swot-app form[data-category="threats"] .scored-add-text', "Booking platforms raise commission"], ["select", '#swot-app form[data-category="threats"] .scored-add-impact', 5], ["select", '#swot-app form[data-category="threats"] .scored-add-likelihood', 4], ["submit", '#swot-app form[data-category="threats"] .scored-add-text']] },
      { sel: '#swot-app form[data-category="opportunities"]', title: "And an opportunity", text: "Each item's priority is impact times likelihood, from 1 to 25.",
        do: [["type", '#swot-app form[data-category="opportunities"] .scored-add-text', "Remote workers extending business trips"], ["select", '#swot-app form[data-category="opportunities"] .scored-add-impact', 3], ["select", '#swot-app form[data-category="opportunities"] .scored-add-likelihood', 4], ["submit", '#swot-app form[data-category="opportunities"] .scored-add-text']] },
      { sel: "#swot-app .scored-chart-wrap", title: "Impact against likelihood", text: "Items in the top right need a plan now. Items in the bottom left can wait." },
      { sel: "#swot-app .scored-priorities-wrap", title: "The ranked priorities", text: "The top five across all four boxes. This is what the planning session should act on." }
    ] },

    "pestel-app": { steps: [
      { sel: "#pestel-app .scored-grid", title: "Six outside forces", text: "PESTEL scans the political, economic, social, technological, environmental and legal forces around a European hotel group." },
      { sel: '#pestel-app form[data-category="technological"]', title: "Add a factor", text: "Type the factor and score its impact and likelihood for the planning period.",
        do: [["type", '#pestel-app form[data-category="technological"] .scored-add-text', "Hotel search inside AI assistants"], ["select", '#pestel-app form[data-category="technological"] .scored-add-impact', 5], ["select", '#pestel-app form[data-category="technological"] .scored-add-likelihood', 4], ["submit", '#pestel-app form[data-category="technological"] .scored-add-text']] },
      { sel: "#pestel-app .scored-chart-wrap", title: "Where each factor sits", text: "The new factor lands in the top right. High impact and high likelihood means it needs a response." },
      { sel: "#pestel-app .scored-priorities-wrap", title: "Ranked across all six", text: "The priority list mixes categories, so a legal risk can outrank an economic one. Carry the top items into a SWOT." }
    ] },

    "forces-app": { steps: [
      { sel: '#forces-app [data-k="subject"]', title: "Name the industry", text: "The demo scores boutique hotels in Lisbon.", do: [["click", '#forces-app [data-a="sample"]']] },
      { sel: "#forces-app .rs-cards", title: "Five forces, a few statements each", text: "Agreeing with a statement means that force is stronger. Each force's score is the mean of its statements." },
      { sel: '#forces-app [data-d="rivalry"]', title: "Change a score", text: "Say rivalry is sharper than first thought. Offers really are hard to tell apart.", do: [["click", '#forces-app [data-d="rivalry"] .rs-q:nth-of-type(3) [data-v="5"]'], ["click", '#forces-app [data-d="rivalry"] .rs-q:nth-of-type(2) [data-v="4"]']] },
      { sel: "#forces-app .rs-summary", title: "The verdict", text: "Attractiveness is 6 minus the mean force. The strongest forces are listed as the main pressures on profit." },
      { sel: "#forces-app .rs-chart", title: "The shape of the pressure", text: "A long spike points to the force to manage first. A large, even shape means a tough industry." },
      { sel: X("forces-app"), title: "Take it to the meeting", text: "Export the result as a PNG or PDF." }
    ] },

    "ansoff-app": { steps: [
      { sel: "#ansoff-app .bm-input", title: "Growth options", text: "Five initiatives for a hotel group, each scored 0 to 10 for how new the market is and how new the product is.", do: [["click", '#ansoff-app [data-a="sample"]']] },
      { sel: "#ansoff-app .bm-chart", title: "Four strategies, one grid", text: "Penetration sits bottom left, diversification top right. Bubble size shows the investment." },
      { sel: "#ansoff-app .bm-input", title: "Make one bolder", text: "Suppose the wellness packages go to a new market too. Watch the bubble move.", do: [["set", '#ansoff-app .bm-input tr[data-r="2"] [data-f="market"]', 7]] },
      { sel: "#ansoff-app .bm-out", title: "Risk and advice", text: "Wellness packages are now diversification, with a higher risk score and advice to pilot small." },
      { sel: X("ansoff-app"), title: "Export", text: "Save the chart and table as PNG, PDF or CSV." }
    ] },

    // ---------------- Customer understanding ----------------
    "stp-app": { steps: [
      { sel: "#stp-app", title: "From a whole market to one position", text: "STP narrows a market in three moves: split it into segments, choose one, then write the claim it will hear.", do: [["click", "#stp-restart"]] },
      { sel: "#stp-panel", title: "Name the segments", text: "Three hotel guest segments, each with a size from 1 to 10.",
        do: [["type", "#stp-seg-name", "Business travellers who book direct"], ["set", "#stp-seg-size", 4], ["click", "#stp-add-segment"], ["type", "#stp-seg-name", "Leisure couples"], ["set", "#stp-seg-size", 3], ["click", "#stp-add-segment"], ["type", "#stp-seg-name", "Families on school holidays"], ["set", "#stp-seg-size", 3], ["click", "#stp-add-segment"]] },
      { sel: "#stp-canvas", title: "Segmentation", text: "The dots regroup into one cluster per segment, sized by how large each segment is.", do: [["click", "#stp-run-segmentation"], ["wait", 800]] },
      { sel: "#stp-canvas", title: "Targeting", text: "Pick the business travellers. The other segments fall away and the funnel narrows.", do: [["pick", "#stp-target-select", 1], ["click", "#stp-confirm-target"], ["wait", 800]] },
      { sel: "#stp-panel", title: "Positioning", text: "Three parts make the statement: the frame of reference, the point of difference and the evidence.",
        do: [["type", "#stp-frame", "a city hotel for a work trip"], ["type", "#stp-pod", "answers every practical question before they pay"], ["type", "#stp-evidence", "all-in prices and Wi-Fi speeds shown at booking"], ["click", "#stp-generate-position"], ["wait", 600]] },
      { sel: "#stp-panel", title: "The campaign brief", text: "The positioning is saved on this device. The 7Ps Planner and the Campaign Brief Generator read it from here.", do: [["click", "#stp-make-brief"]] }
    ] },

    "journey-app": { steps: [
      { sel: "#journey-app .jm-toolbar", title: "The classroom case", text: "Three hotel guests from O'Rourke et al. (2026), one per delight segment, on a 6-stage resort journey.", do: [["click", '#journey-app [data-act="preset"]']] },
      { sel: "#journey-app-editor", title: "Stages", text: "Pick a template or edit the stages. The phase groups neighbouring stages into bands above the chart.", do: [["click", '#journey-app [data-tab="stages"]']] },
      { sel: "#journey-app-editor", title: "Personas as goal-states", text: "Each persona has a goal, feeling, deciding factor and segment at every stage. The card changes as the journey goes on.", do: [["click", '#journey-app [data-tab="personas"]']] },
      { sel: "#journey-app-editor .jm-card:nth-child(3)", title: "Score an emotion", text: "Move the slider and the tool explains the score in terms of expectations, with feeling words to pick from.", do: [["set", "#journey-app-editor .jm-card:nth-child(3) [data-f=\"emotion\"]", -1]] },
      { sel: "#journey-app svg.jm-chart", title: "Three guests, one journey", text: "The same stages feel very different to each segment. Hollow points are assumptions, and a ring marks a change of segment." },
      { sel: "#journey-app .jm-table-wrap", title: "The service blueprint", text: "Below the lines of interaction, visibility and internal interaction sits the backstage work, each tagged to the silo that owns it." },
      { sel: "#journey-app-editor", title: "Log a pain point", text: "Tag it to a service gap and an owning silo, and flag it as a moment of truth.",
        do: [["click", '#journey-app [data-tab="pains"]'], ["pick", "#jm-pain-stage", 3], ["type", "#jm-pain-text", "Pre-arrival email arrives after the guest has left home"], ["select", "#jm-pain-gap", "3"], ["select", "#jm-pain-silo", "IT"], ["check", "#jm-pain-mot", true], ["click", "#jm-pain-add"]] },
      { sel: "#journey-app .jm-summary", title: "Gaps and owners", text: "Tagged gaps carry into SERVQUAL next week, and the silo table shows who owns each fix." },
      { sel: "#journey-app .jm-export-row", title: "Export for Moodle", text: "PNG or PDF for the blueprint upload, or JSON to reopen the map later." }
    ] },

    "personaCard": { steps: [
      { sel: "#templateSelect", title: "Four detail levels", text: "Basic, Standard and Full build a profile. Journey records the persona stage by stage." },
      { sel: "#personaCard", title: "The sample persona", text: "Lukas Hoffmann, an IT project manager from Munich, built on the Content but cautious segment.", do: [["click", "#sampleBtn"], ["wait", 500]] },
      { sel: 'fieldset[data-tier="journey"]', title: "The Journey level", text: "Segment, delight level and what could move him to another segment, then a goal and feeling at each stage." },
      { sel: "#journeyStages .stage-edit:nth-child(3)", title: "Score a stage", text: "The slider explains each score. Picking a suggested word fills in the feeling.", do: [["set", '#journeyStages .stage-edit:nth-child(3) [data-s="emotion"]', -1], ["click", '#journeyStages .stage-edit:nth-child(3) .word-chip']] },
      { sel: "#personaCard .card-journey", title: "Data or assumption", text: "Filled dots come from data, hollow dots are assumptions, so readers can see what rests on evidence." },
      { sel: ".preview-toolbar", title: "Share it", text: "Export a PNG or PDF, save JSON or send the persona straight to the Customer Journey Mapper." }
    ] },

    "rfm-app": { steps: [
      { sel: '#rfm-app [data-k="csv"]', title: "Transactions in", text: "Two years of hotel bookings for 420 guests: a guest ID, a date and an amount per row.", do: [["click", '#rfm-app [data-a="sample"]']] },
      { sel: "#rfm-app .tk-grid", title: "Columns and date", text: "The tool guesses which column is which. The analysis date sets how recency is counted." },
      { sel: "#rfm-app .rfm-seg", title: "Segments with actions", text: "Every guest is scored 1 to 5 on recency, frequency and spend, then grouped. Champions are a quarter of guests and over half the revenue." },
      { sel: "#rfm-app .rfm-grid", title: "Recency against frequency", text: "Each cell counts guests with that pair of scores. The colour shows the segment it belongs to." },
      { sel: "#rfm-app .rfm-bars", title: "Who brings the money", text: "The light bar is share of guests, the solid bar share of revenue. Big gaps between them show where value is concentrated." },
      { sel: X("rfm-app"), title: "Take the list away", text: "Download every guest's scores and segment as CSV, ready for a CRM." }
    ] },

    "vpc-app": { steps: [
      { sel: "#vpc-app .vpc-canvas", title: "Two halves", text: "The circle is the customer: jobs, pains and gains. The square is the offer: products, pain relievers and gain creators.", do: [["click", '#vpc-app [data-a="sample"]']] },
      { sel: "#vpc-app .vpc-add", title: "Add a pain reliever", text: "Pick the area, type a short note and add it.", do: [["select", '#vpc-app [data-k="zone"]', "painRelievers"], ["type", '#vpc-app [data-k="text"]', "Same room type on every stay"], ["click", '#vpc-app [data-a="add"]']] },
      { sel: "#vpc-app .vpc-canvas", title: "Drag and match", text: "Drag notes between areas. Click a pain or gain to tick the relievers or creators that answer it. Matches show as dashed lines." },
      { sel: "#vpc-app .vpc-kpis", title: "Fit", text: "Fit is the share of pains and gains answered by the offer. Here one pain and one gain are still unanswered." }
    ] },

    "ipa-app": { steps: [
      { sel: "#ipa-app .bm-input", title: "Importance and performance", text: "Nine hotel attributes, each with a mean importance and performance rating from a guest survey.", do: [["click", '#ipa-app [data-a="sample"]']] },
      { sel: "#ipa-app .bm-chart", title: "Four quadrants", text: "Top left is where guests care and the hotel falls short: Wi-Fi, check-in speed and price transparency. That is where to act first." },
      { sel: "#ipa-app .bm-settings", title: "Move the cross-hairs", text: "Switch from data means to the scale midpoint and every attribute is judged against a fixed standard.", do: [["select", '#ipa-app [data-s="cross"]', "midpoint"]] },
      { sel: "#ipa-app .bm-chart", title: "A different picture", text: "Against the midpoint almost everything looks fine. Data means are better for choosing priorities.", do: [["wait", 2500], ["select", '#ipa-app [data-s="cross"]', "means"]] },
      { sel: "#ipa-app .bm-out", title: "Actions", text: "Each attribute gets a quadrant and a suggested action." }
    ] },

    // ---------------- Portfolio and growth ----------------
    "bcg-app": { steps: [
      { sel: "#bcg-app .bm-input", title: "The brand portfolio", text: "Five hotel brands with revenue, market growth and share relative to the market leader.", do: [["click", '#bcg-app [data-a="sample"]']] },
      { sel: "#bcg-app .bm-chart", title: "Stars, cows, question marks, dogs", text: "High share sits on the left, as in the original matrix. Bubble area is revenue." },
      { sel: "#bcg-app .bm-input", title: "What if serviced apartments win share?", text: "Raise its relative share from 0.4 to 1.2 and watch it cross into the stars.", do: [["set", '#bcg-app .bm-input tr[data-r="3"] [data-f="rshare"]', 1.2]] },
      { sel: "#bcg-app .bm-settings", title: "Set the growth line", text: "10% is the classic threshold. A mature industry often suits a lower one.", do: [["set", '#bcg-app [data-s="cut"]', 5]] },
      { sel: "#bcg-app .bm-out", title: "Where the cash goes", text: "Each brand gets its quadrant and what to do with it." }
    ] },

    "ge-app": { steps: [
      { sel: "#ge-app .bm-factors", title: "Weighted factors", text: "Each axis is built from four weighted factors. The weights are shared by every business unit.", do: [["click", '#ge-app [data-a="sample"]']] },
      { sel: "#ge-app .bm-input", title: "Score each unit", text: "Every unit is scored 1 to 5 on every factor. Here serviced apartments improve their brand strength.", do: [["set", '#ge-app .bm-input tr[data-r="3"] [data-fx="strength"][data-fi="1"]', 5], ["set", '#ge-app .bm-input tr[data-r="3"] [data-fx="strength"][data-fi="0"]', 4]] },
      { sel: "#ge-app .bm-chart", title: "The nine boxes", text: "Green boxes say invest, amber says be selective, red says harvest or divest." },
      { sel: "#ge-app .bm-out", title: "The verdict per unit", text: "Stronger brand and share move serviced apartments into selective investment." }
    ] },

    "plc-app": { steps: [
      { sel: '#plc-app [data-k="csv"]', title: "Sales history", text: "Quarterly bookings for a serviced apartment brand, oldest first." },
      { sel: "#plc-app .plc-chart", title: "The fitted S-curve", text: "The dashed line is the fitted curve. The shaded bands mark introduction, growth and maturity.", do: [["click", '#plc-app [data-a="run"]']] },
      { sel: '#plc-app [data-k="csv"]', title: "Add two falling quarters", text: "Suppose bookings drop in the next two quarters.", do: [["set", '#plc-app [data-k="csv"]', "quarter,bookings\n2023 Q1,40\n2023 Q2,55\n2023 Q3,80\n2023 Q4,120\n2024 Q1,190\n2024 Q2,280\n2024 Q3,390\n2024 Q4,500\n2025 Q1,610\n2025 Q2,690\n2025 Q3,750\n2025 Q4,790\n2026 Q1,815\n2026 Q2,828\n2026 Q3,832\n2026 Q4,770\n2027 Q1,700"], ["click", '#plc-app [data-a="run"]']] },
      { sel: "#plc-app .tk-kpis", title: "Decline detected", text: "Two falls of more than 5% in a row mark decline, which a logistic curve alone misses." },
      { sel: "#plc-app .plc-mix", title: "What to do at this stage", text: "The mix priorities change with the stage: prune the range, cut or hold price and spend only to keep loyal buyers." }
    ] },

    "dif-app": { steps: [
      { sel: "#dif-app .dif-bell", title: "Rogers' adopter groups", text: "Mobile check-in has reached 71% of its potential users, so the late majority is adopting now." },
      { sel: '#dif-app [data-k="adopters"]', title: "Earlier in the life of a product", text: "At 60 users out of 540, the product is still reaching early adopters.", do: [["set", '#dif-app [data-k="adopters"]', 60]] },
      { sel: "#dif-app .tk-kpis", title: "The next move", text: "Each group needs a different argument. Early adopters want an advantage, the early majority wants proof." },
      { sel: "#dif-app .dif-bass-wrap", title: "The Bass model", text: "Fitted to quarterly new users, it splits adoption into innovation (p) and imitation (q), and forecasts the peak.", do: [["click", '#dif-app [data-a="fit"]']] }
    ] },

    // ---------------- Planning and execution ----------------
    "ps-app": { steps: [
      { sel: '#ps-app [data-k="positioning"]', title: "Start from the positioning", text: "The segment and positioning come from STP Builder when it has been used on this device.", do: [["click", '#ps-app [data-a="sample"]']] },
      { sel: "#ps-app .ps-cards", title: "Seven Ps, three questions each", text: "Product, price, place, promotion, then people, process and physical evidence for services." },
      { sel: '#ps-app [data-p="people"]', title: "Rate the fit", text: "Each P is rated for how well it supports the positioning. Front desk staff now have authority to fix problems, so people rises to 4.", do: [["click", '#ps-app [data-p="people"] [data-v="4"]']] },
      { sel: "#ps-app .ps-chart", title: "The weakest link", text: "The lowest bar is where the plan breaks its own promise. Here that is process." },
      { sel: X("ps-app"), title: "Carry it forward", text: "The plan is saved on this device for the Campaign Brief Generator, and exports as PNG or PDF." }
    ] },

    "brief-app": { steps: [
      { sel: "#brief-app .bf-sources", title: "Pulls from the other tools", text: "Personas, the STP positioning and the 7Ps plan saved on this device fill the brief in.", do: [["click", '#brief-app [data-a="sample"]']] },
      { sel: '#brief-app [data-k="objective"]', title: "A dated, measurable objective", text: "Grow direct business bookings by 15% in one quarter, against the same quarter last year." },
      { sel: "#brief-app .bf-channels", title: "Split the budget", text: "Shares by channel. Adding video takes the total past 100%, and the brief rescales it.", do: [["set", '#brief-app [data-ch="Video"]', 10]] },
      { sel: "#brief-app .bf-doc", title: "The brief", text: "Objective, audience, positioning, key message, budget by channel, timeline, KPIs and mandatories on one page." },
      { sel: X("brief-app"), title: "Send it", text: "Export PNG or PDF, copy it as text or download Markdown to edit anywhere." }
    ] },

    "utm-app": { steps: [
      { sel: "#utm-app .tk-grid", title: "Source, medium, campaign", text: "Three parameters are required. They tell analytics where each visit came from." },
      { sel: '#utm-app [data-k="campaign"]', title: "Name the campaign", text: "Spaces and capitals are cleaned up so one campaign stays one row in reports.", do: [["type", '#utm-app [data-k="campaign"]', "Know Before You Book"]] },
      { sel: '#utm-app [data-k="out"]', title: "The tagged link", text: "Ready to copy. Existing UTM tags in the address are replaced." },
      { sel: '#utm-app [data-k="medium"]', title: "A warning", text: "An unusual medium such as mailshot is filed as unassigned in most analytics tools.", do: [["type", '#utm-app [data-k="medium"]', "mailshot"]] },
      { sel: "#utm-app .tk-details", title: "Bulk mode", text: "Tag a whole list of links at once and download them as CSV.", do: [["type", '#utm-app [data-k="medium"]', "email"], ["open", "#utm-app .tk-details"]] }
    ] },

    "meta-app": { steps: [
      { sel: "#meta-app .tk-grid", title: "Title, URL and image", text: "Everything a search engine or social platform shows for a page." },
      { sel: '#meta-app [data-k="tiles"]', title: "Length by pixels", text: "Search results cut titles at about 600 pixels. A longer title turns red.", do: [["type", '#meta-app [data-k="title"]', "Customer Journey Mapper: free browser tool for service blueprints and personas | FlairMI"]] },
      { sel: '#meta-app [data-k="serp"]', title: "Search preview", text: "The title is cut short, just as Google would show it." },
      { sel: '#meta-app [data-k="og"]', title: "Social card", text: "With the share image missing, Facebook and LinkedIn fall back to an empty preview." },
      { sel: '#meta-app [data-k="code"]', title: "Copy the tags", text: "The title, description, canonical, Open Graph and Twitter card tags, ready for the page head.", do: [["type", '#meta-app [data-k="title"]', "Customer Journey Mapper: free browser tool | FlairMI"]] }
    ] },

    "schema-app": { steps: [
      { sel: "#schema-app .tk-grid", title: "A hotel, in structured data", text: "Name, address, star rating and check-in times in the schema.org vocabulary." },
      { sel: '#schema-app [data-k="out"]', title: "JSON-LD", text: "Empty fields are left out, and the block is ready to paste into the page." },
      { sel: '#schema-app [data-k="fields"]', title: "Switch to FAQ", text: "A question line, then its answer line, repeated.", do: [["select", '#schema-app [data-k="type"]', "FAQPage"], ["type", '#schema-app [data-f="faq"]', "Do you offer late check-out?\nYes, members can check out at 14:00 free of charge."]] },
      { sel: '#schema-app [data-k="out"]', title: "FAQ markup", text: "Search engines and AI answer engines can read the answers directly. Every tool page on this site uses it." }
    ] },

    "canon-app": { steps: [
      { sel: '#canon-app [data-k="in"]', title: "Five addresses, how many pages?", text: "Tracking tags, www, http, index files and trailing slashes make one page look like many." },
      { sel: '#canon-app [data-k="table"]', title: "Every change listed", text: "Each address is cleaned by the rules above, and the table says exactly what changed." },
      { sel: "#canon-app .tk-grid", title: "Choose the rules", text: "Keep www this time. The canonical addresses change to match.", do: [["select", '#canon-app [data-k="www"]', "add"]] },
      { sel: '#canon-app [data-k="tiles"]', title: "Duplicates merged", text: "Five addresses turn out to be four real pages." },
      { sel: '#canon-app [data-k="out"]', title: "Canonical tags", text: "One tag per real page, ready to copy.", do: [["select", '#canon-app [data-k="www"]', "remove"]] }
    ] },

    "read-app": { steps: [
      { sel: '#read-app [data-k="head"]', title: "Check a headline", text: "Pixel width, word count, keyword position, numbers and case." },
      { sel: '#read-app [data-k="hchecks"]', title: "Headline checks", text: "Each check passes or asks you to look again." },
      { sel: '#read-app [data-k="tiles"]', title: "Readability scores", text: "Flesch reading ease of 60 or more reads as plain English." },
      { sel: '#read-app [data-k="chart"]', title: "One long sentence", text: "The red bar is a 49-word sentence, well past the 25-word line." },
      { sel: '#read-app [data-k="view"]', title: "Fix it and watch the score", text: "Splitting that sentence lifts the score at once.",
        do: [["set", '#read-app [data-k="body"]', "Guests who book direct want answers before they pay. They check the price, the cancellation terms and the check-in time. When the website answers those questions, most of them book. When it does not, they leave and compare three other hotels. Many never come back. The booking platforms had already shown every rate side by side. Show the full price on the first page. Put check-in times next to the room photos."]] }
    ] },

    "robots-app": { steps: [
      { sel: '#robots-app [data-k="disallow"]', title: "Keep private paths out", text: "Admin, checkout and internal search pages only clutter search results." },
      { sel: "#robots-app .tk-panel", title: "Decide on AI crawlers", text: "Block training crawlers and keep answer crawlers, so pages stay out of model training but still appear in AI search answers.", do: [["check", '#robots-app [data-bot="GPTBot"]', true], ["check", '#robots-app [data-bot="ClaudeBot"]', true], ["check", '#robots-app [data-bot="CCBot"]', true]] },
      { sel: '#robots-app [data-k="robots"]', title: "robots.txt", text: "One rule for all crawlers, a block for each training crawler and the sitemap address." },
      { sel: '#robots-app [data-k="xml"]', title: "sitemap.xml", text: "Built from the URL list, with last-modified dates where given." }
    ] },

    "contrast-app": { steps: [
      { sel: '#contrast-app [data-k="preview"]', title: "Mid-grey on off-white", text: "This pair passes AA for normal text at 4.97 to 1." },
      { sel: '#contrast-app [data-k="tiles"]', title: "Try a lighter grey", text: "At #9a9a9a the ratio falls below 4.5 to 1 and normal text fails.", do: [["type", '#contrast-app [data-k="fg"]', "#9a9a9a"]] },
      { sel: '#contrast-app [data-k="suggest"]', title: "The nearest pass", text: "The tool finds the closest colour that passes, by changing lightness only.", do: [["wait", 1500], ["click", "#contrast-app [data-use]"]] },
      { sel: '#contrast-app [data-k="grid"]', title: "Check the whole palette", text: "Every pair at once. Green borders pass for normal text, amber for large text only, red fail." }
    ] },

    "count-app": { steps: [
      { sel: '#count-app [data-k="text"]', title: "One post, nine platforms", text: "Characters are counted the way readers see them, so an emoji counts once." },
      { sel: '#count-app [data-k="tiles"]', title: "X counts links as 23", text: "The link here is longer, but X charges 23 characters for it whatever its length." },
      { sel: '#count-app [data-k="chart"]', title: "Add two lines and watch X", text: "Two more sentences push the post over the limits for X and Bluesky.", do: [["type", '#count-app [data-k="text"]', "Know everything before you book. All-in prices, Wi-Fi speeds, and check-in times on the first page. Members save 8% on stays in Lisbon, Porto, and Munich, with late check-out included. Book by Friday for the autumn member rate, and add breakfast for two at no extra cost on stays of 3 nights or more. https://example.com/members #businesstravel #hotels #Lisbon #BookDirect @flairmi"]] },
      { sel: '#count-app [data-k="tags"]', title: "Hashtags", text: "Listed with repeats flagged. Capitalising each word helps screen readers." }
    ] },

    "ab-app": { steps: [
      { sel: '#ab-app [data-k="ss"]', title: "Size the test first", text: "At a 3.2% booking rate, detecting a 15% lift needs about 22,600 visitors per variant." },
      { sel: '#ab-app [data-k="mde"]', title: "Look for a smaller lift", text: "Halving the lift you want to detect roughly quadruples the sample.", do: [["set", '#ab-app [data-k="mde"]', 7.5]] },
      { sel: '#ab-app [data-k="sig"]', title: "Read the result", text: "The variant converts at 3.74% against 3.19%, with a p-value under 0.01.", do: [["set", '#ab-app [data-k="mde"]', 15]] },
      { sel: '#ab-app [data-k="verdict"]', title: "What it means", text: "Significant, but each group is below the planned size, so the size of the lift is uncertain." },
      { sel: R("ab-app"), title: "The intervals", text: "Each rate with its 95% interval. Overlap is a warning sign." }
    ] },

    // ---------------- Performance and analytics ----------------
    "servqual-app": { steps: [
      { sel: "#servqual-app .sq-items", title: "Expectations against perceptions", text: "22 items across five dimensions, each rated 1 to 7 twice: what guests expect and what they experienced.", do: [["click", '#servqual-app [data-a="sample"]']] },
      { sel: "#servqual-app .sq-weights", title: "Weight what matters", text: "Guests share 100 points across the dimensions. Reliability carries the most." },
      { sel: '#servqual-app .sq-items tr[data-i="10"]', title: "Improve one item", text: "Faster service lifts the perception of item 11 from 5.2 to 6.3.", do: [["set", '#servqual-app .sq-items tr[data-i="10"] [data-f="P"]', 6.3]] },
      { sel: "#servqual-app .sq-dumbbell", title: "Gaps by dimension", text: "Hollow dots are expectations, filled dots perceptions. Red lines show shortfalls." },
      { sel: "#servqual-app .sq-bars", title: "The largest item gaps", text: "Empathy items now fill most of the list. That is where to act next." },
      { sel: "#servqual-app .sq-journey", title: "Linked to the journey map", text: "Pain points tagged to gaps 1 to 4 in the Customer Journey Mapper appear here, next to the gap they cause." }
    ] },

    "brand-app": { steps: [
      { sel: "#brand-app .rs-cards", title: "Six building blocks", text: "Keller's model builds from salience at the base to resonance at the top.", do: [["click", '#brand-app [data-a="sample"]']] },
      { sel: "#brand-app .rs-chart", title: "The pyramid", text: "Darker blocks score higher. Imagery is strong, salience is weaker." },
      { sel: "#brand-app .rs-summary", title: "Built out of order", text: "Imagery outscores salience, the block it rests on. That imagery is hard to hold." },
      { sel: '#brand-app [data-d="salience"]', title: "Strengthen the base", text: "Better recall in wider regional search lifts salience.", do: [["click", '#brand-app [data-d="salience"] .rs-q:nth-of-type(1) [data-v="5"]'], ["click", '#brand-app [data-d="salience"] .rs-q:nth-of-type(2) [data-v="5"]']] },
      { sel: "#brand-app .rs-summary", title: "In order now", text: "With salience at 4.7, the pyramid is built in order." }
    ] },

    "clv-app": { steps: [
      { sel: "#clv-app .tk-grid", title: "One average guest", text: "Order value, bookings per year, margin, retention, discount rate and the cost of winning the guest." },
      { sel: '#clv-app [data-k="tiles"]', title: "What a guest is worth", text: "843 over five years, discounted, or 4.7 times the acquisition cost." },
      { sel: '#clv-app [data-k="retain"]', title: "Keep more guests", text: "Raise retention from 62% to 75%.", do: [["set", '#clv-app [data-k="retain"]', 75]] },
      { sel: '#clv-app [data-k="chart"]', title: "Retention compounds", text: "Each later year is worth more, because more guests are still booking." },
      { sel: '#clv-app [data-k="table"]', title: "Year by year", text: "The share still booking, the margin and its value today.", do: [["wait", 2000], ["set", '#clv-app [data-k="retain"]', 62]] }
    ] },

    "pe-app": { steps: [
      { sel: "#pe-app .tk-grid", title: "Two prices, two volumes", text: "The member rate rose from 165 to 179, and bookings fell from 1,200 to 1,050." },
      { sel: '#pe-app [data-k="tiles"]', title: "Elastic", text: "Elasticity of -1.64: bookings fell faster than price rose, so revenue fell." },
      { sel: '#pe-app [data-k="q2"]', title: "What if fewer guests had left?", text: "At 1,160 bookings after the rise, demand is inelastic and revenue grows.", do: [["set", '#pe-app [data-k="q2"]', 1160]] },
      { sel: '#pe-app [data-k="rev"]', title: "Revenue and profit curves", text: "The peaks show the prices that maximise revenue and contribution under a straight demand line.", do: [["wait", 2500], ["set", '#pe-app [data-k="q2"]', 1050]] }
    ] },

    "nps-app": { steps: [
      { sel: "#nps-app .tk-panel", title: "Add a survey wave", text: "Type counts, or paste raw 0 to 10 scores and the tool sorts them.", do: [["click", '#nps-app [data-a="sample"]'], ["type", '#nps-app [data-k="label"]', "2026 Q4"], ["type", '#nps-app [data-k="raw"]', "10 9 9 10 8 7 9 10 6 9 10 8 9 10 4 9 10 9 8 10 9 7 10 9 3 10 9 10 8 9"]] },
      { sel: '#nps-app [data-k="tiles"]', title: "Score and margin of error", text: "Thirty responses give a wide margin, so the change is still within chance.", do: [["click", '#nps-app [data-a="add"]']] },
      { sel: '#nps-app [data-k="trend"]', title: "The trend", text: "The band is the 95% interval. A small sample widens it." },
      { sel: '#nps-app [data-k="stack"]', title: "The mix behind the score", text: "Promoters, passives and detractors by wave." }
    ] },

    "attr-app": { steps: [
      { sel: '#attr-app [data-k="csv"]', title: "Conversion paths", text: "Each row is a sequence of channels that ended in a booking, with the count and value." },
      { sel: '#attr-app [data-k="chart"]', title: "Five models, one dataset", text: "Last click gives Direct over half the credit. First click gives it zero." },
      { sel: '#attr-app [data-k="tiles"]', title: "The top channel depends on the model", text: "Direct is the most model-sensitive channel. Its credit swings by 57 points." },
      { sel: '#attr-app [data-k="measure"]', title: "Switch to value", text: "Credit by booking value in place of booking count.", do: [["select", '#attr-app [data-k="measure"]', "value"]] },
      { sel: '#attr-app [data-k="table"]', title: "Every channel, every model", text: "The top channel in each model is in bold.", do: [["wait", 2000], ["select", '#attr-app [data-k="measure"]', "conv"]] }
    ] },

    "mmm-app": { steps: [
      { sel: '#mmm-app [data-k="csv"]', title: "Two years of weekly data", text: "Sales, spend on four channels and price. The sample was generated from known settings." },
      { sel: '#mmm-app [data-k="chans"]', title: "Choose the channels", text: "Each channel gets a carryover rate and a saturation curve, found by search." },
      { sel: '#mmm-app [data-k="tiles"]', title: "Fit", text: "The model explains 94% of the weekly variation, with a 1.5% average error.", do: [["click", '#mmm-app [data-a="fit"]']] },
      { sel: '#mmm-app [data-k="table"]', title: "Return per channel", text: "Marginal ROI is what the next unit of spend returns. Below 1, spend more elsewhere." },
      { sel: '#mmm-app [data-k="stack"]', title: "What drove sales", text: "Base demand in grey, each channel stacked on top." },
      { sel: '#mmm-app [data-k="curves"]', title: "Diminishing returns", text: "Social flattens early. Search still climbs at twice its current spend." }
    ] },

    // ---------------- Decision and research tools ----------------
    "tree-app": { steps: [
      { sel: "#tree-app .tk-data-loader", title: "The sample file", text: "50 groups, each choosing between a local and an international vendor.", do: [["click", '#tree-app [data-tab="0"]'], ["click", '#tree-app [data-load="served"]'], ["wait", 600]] },
      { sel: '#tree-app [data-k="group"]', title: "Pick a group", text: "Each group in the file is one tree. Here is group 12.", do: [["select", '#tree-app [data-k="group"]', "12"]] },
      { sel: "#tree-app .dt-chart", title: "Fold the tree back", text: "Each chance node's expected value is probability times payoff, summed. The best branch is bold and the other is marked as pruned." },
      { sel: "#tree-app .dt-kpis", title: "The best choice", text: "The option with the higher expected value wins, and the gap shows by how much." },
      { sel: "#tree-app .dt-class", title: "The whole class", text: "Mean expected value per vendor across all 50 groups, and how often each one wins." },
      { sel: "#tree-app .dt-custom", title: "Your own tree", text: "Build a tree with any number of options and outcomes.", do: [["click", '#tree-app [data-tab="1"]'], ["click", '#tree-app [data-a="sample"]']] }
    ] },

    "cpm-app": { steps: [
      { sel: "#cpm-app .cpm-loaders", title: "Tasks and the published Gantt", text: "The CPM file holds 8 conference tasks. The Gantt file is loaded to check it.", do: [["click", '#cpm-app .cpm-loaders [data-load="served"]'], ["wait", 800]] },
      { sel: "#cpm-app .cpm-out", title: "Forward and backward passes", text: "ES and EF from the forward pass, LS and LF from the backward pass. Zero slack marks a critical task." },
      { sel: "#cpm-app .cpm-net", title: "The network", text: "Each box shows early times above and late times below. The critical path is red." },
      { sel: '#cpm-app [data-k="basis"]', title: "Switch to PERT", text: "Use te = (a + 4m + b) / 6 in place of the most likely times.", do: [["select", '#cpm-app [data-k="basis"]', "te"]] },
      { sel: "#cpm-app .cpm-kpis", title: "Chance of meeting a deadline", text: "Variances add along the critical path, so the tool can give the chance of finishing by day 17.", do: [["set", '#cpm-app [data-k="target"]', 17]] },
      { sel: "#cpm-app .cpm-check", title: "The Gantt file agrees", text: "Start day, duration, end day, predecessors and the critical flag match on all 8 tasks.", do: [["select", '#cpm-app [data-k="basis"]', "m"]] }
    ] },

    "vrio-app": { steps: [
      { sel: '#vrio-app [data-k="pick"]', title: "Pick a resource", text: "40 resources from the sample file, 8 for each of 5 companies.", do: [["pick", '#vrio-app [data-k="pick"]', 1], ["click", '#vrio-app [data-a="restart"]']] },
      { sel: "#vrio-app .vr-step", title: "Is it valuable?", text: "Answer each question in turn. Feedback says what the answer means and whether the file agrees.", do: [["click", '#vrio-app [data-a="yes"]']] },
      { sel: "#vrio-app .vr-step", title: "Is it rare?", text: "A customer database most rivals also hold is common.", do: [["click", '#vrio-app [data-a="no"]']] },
      { sel: "#vrio-app .vr-tree", title: "The path", text: "The first No ends the walk. This resource gives competitive parity." },
      { sel: "#vrio-app .vr-all", title: "The whole file", text: "The VRIO rule gives the file's Competitive_Implication on all 40 rows." },
      { sel: "#vrio-app .vr-xtab", title: "A chi-square preview", text: "Company by outcome, with expected counts, ready for a chi-square in PocketStat." }
    ] },

    "stakeholder-app": { steps: [
      { sel: "#stakeholder-app .bm-input", title: "A sample case", text: "6 groups affected by a decision to act on the no-show result, scored for power and interest.", do: [["click", '#stakeholder-app [data-a="sample"]']] },
      { sel: "#stakeholder-app .bm-chart", title: "4 approaches", text: "Manage closely, keep satisfied, keep informed or monitor. Bubble size shows how many people each group speaks for." },
      { sel: "#stakeholder-app .bm-input", title: "Front-of-house staff organise", text: "Their power rises, and they move into the manage closely quadrant.", do: [["set", '#stakeholder-app .bm-input tr[data-r="5"] [data-f="power"]', 6]] },
      { sel: "#stakeholder-app .bm-out", title: "An approach for each group", text: "Carry the map into the Ethical Decision Matrix." }
    ] },

    "edm-app": { steps: [
      { sel: "#edm-app .wm-input", title: "Options against ethical criteria", text: "3 ways to act on the no-show result, scored on evidence, utility, rights, justice and care.", do: [["click", '#edm-app [data-a="sample"]']] },
      { sel: "#edm-app .wm-kpis", title: "Strongest data, weakest overall", text: "Overbooking VIP sessions has the best statistical case and ranks last once every criterion counts." },
      { sel: "#edm-app .wm-input", title: "Evidence only", text: "Set rights to 0 and see the ranking move.", do: [["set", '#edm-app .wm-input tr[data-c="2"] [data-cf="weight"]', 0]] },
      { sel: "#edm-app .wm-chart", title: "What drives each score", text: "Each bar splits the total by criterion.", do: [["wait", 1500], ["set", '#edm-app .wm-input tr[data-c="2"] [data-cf="weight"]', 25]] }
    ] },

    "options-app": { steps: [
      { sel: ".so-porter", title: "Start from Porter", text: "Pick a Porter scenario. The file's attractiveness is checked and its strategy shown as given.", do: [["pick", '.so-porter [data-k="scenario"]', 4]] },
      { sel: "#options-app .bm-chart", title: "Attractiveness against feasibility", text: "5 growth options for a regional event company, sized by investment." },
      { sel: "#options-app .bm-out", title: "An approach per quadrant", text: "Pursue, build capability first, take the quick win or set aside." }
    ] },

    "wdm-app": { steps: [
      { sel: "#wdm-app .wm-input", title: "Weighted criteria", text: "3 venues for a conference, scored 1 to 5 on 5 weighted criteria.", do: [["click", '#wdm-app [data-a="sample"]']] },
      { sel: "#wdm-app .wm-chart", title: "The ranking", text: "Each total is the weighted mean of the scores, split by criterion." },
      { sel: "#wdm-app .wm-input", title: "Test a weight", text: "Raise the weight on location and the winner changes. The choice rests on that judgement.", do: [["set", '#wdm-app .wm-input tr[data-c="2"] [data-cf="weight"]', 45]] },
      { sel: X("wdm-app"), title: "Export", text: "Save the matrix as PNG, PDF or CSV.", do: [["click", '#wdm-app [data-a="sample"]']] }
    ] },

    "ci-app": { steps: [
      { sel: "#ci-app .ci-pane[data-pane=\"0\"]", title: "A mean from the sample survey file", text: "Satisfaction for 200 respondents. The interval uses t with 199 degrees of freedom.", do: [["click", '#ci-app [data-tab="0"]']] },
      { sel: "#ci-app .ci-kpis", title: "Raise the confidence level", text: "99% confidence gives a wider interval.", do: [["select", '#ci-app [data-k="mc"]', "0.99"]] },
      { sel: "#ci-app .ci-chart", title: "Proportion who attended", text: "Wilson and Wald intervals side by side.", do: [["select", '#ci-app [data-k="mc"]', "0.95"], ["click", '#ci-app [data-tab="1"]']] },
      { sel: "#ci-app .ci-kpis", title: "Sample size", text: "385 respondents estimate a proportion within 5 points.", do: [["click", '#ci-app [data-tab="2"]']] },
      { sel: "#ci-app .ci-chart2", title: "The Central Limit Theorem", text: "1,000 samples of 30 from Spending. The sample means pile up around the population mean.", do: [["click", '#ci-app [data-tab="3"]'], ["select", '#ci-app [data-k="cvar"]', "Spending"], ["set", '#ci-app [data-k="cn"]', 30]] }
    ] },

    "mm-app": { steps: [
      { sel: '#mm-app [data-k="loadings"]', title: "Paste the loadings", text: "Standardised loadings from a CFA of Content, Value and Network in the sample survey file.", do: [["click", '#mm-app [data-a="sample"]']] },
      { sel: "#mm-app .mm-con", title: "AVE and composite reliability", text: "AVE should reach 0.50 and CR 0.70. All 3 constructs pass." },
      { sel: "#mm-app .mm-htmt", title: "HTMT", text: "Computed from the item correlations in the data file. Values below 0.85 support discriminant validity." },
      { sel: "#mm-app .mm-fit", title: "Model fit", text: "CFI, TLI, RMSEA and SRMR against Hu and Bentler's guidelines." }
    ] },

    "prob-app": { steps: [
      { sel: "#prob-app .pe-coin-wrap", title: "One toss", text: "A single toss is heads or tails. It says little about the chance.", do: [["click", '#prob-app [data-tab="0"]'], ["click", '#prob-app [data-a="reset"]'], ["click", '#prob-app [data-a="t1"]'], ["wait", 1100]] },
      { sel: "#prob-app .pe-chart", title: "10 tosses wander", text: "The share of heads can sit well away from 0.5 in a short run.", do: [["click", '#prob-app [data-a="t10"]'], ["wait", 1100]] },
      { sel: "#prob-app .pe-chart", title: "1,000 tosses settle", text: "The share closes in on the chance of heads. This is probability as a long-run relative frequency.", do: [["click", '#prob-app [data-a="t1000"]'], ["wait", 1100]] },
      { sel: "#prob-app .pe-table", title: "From a table of counts", text: "100 registrations from the sample file, ticket type by attendance.", do: [["click", '#prob-app [data-tab="1"]']] },
      { sel: "#prob-app .pe-kpis", title: "Marginal, joint and conditional", text: "Pick VIP and Attended to read all 6 probabilities for that pair.", do: [["pick", '#prob-app [data-k="ei"]', 1], ["pick", '#prob-app [data-k="ej"]', 0]] },
      { sel: "#prob-app .pe-formula", title: "Independent or related?", text: "The working shows each rule and compares the joint probability with the product of the marginals." }
    ] }
  };
})();
