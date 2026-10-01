# One World — discovery and requirements v0.21

## Revision 0.21 — full recommendation acceptance and implementation authorization

The founder accepted **all R01–R24 recommendations** in the pre-implementation sheet, including retaining occupants after a capacity reduction, starter-layout/catalog delegation, trial economy, permissions, tracking, privacy and staged feature scope. This closes the requested product clarification gate for local implementation. R24 explicitly defers real-provider, age/guardian, operational and payment decisions to their launch stages; these are not production-ready claims. Actual test devices and moderation availability still need operational validation.

Local integration is underway in the shared Angular repository. [The implementation status](../docs/INTEGRATION-STATUS.md) records connected functionality, verification and unfinished milestone work. Preserve the original HTML and separate visual preview, never importing sample balances/history/friends into real accounts. Track completion with verified behavior, not approval status.

## Revision 0.20 — room defaults, voice defaults and consolidated review

Confirmed: owners/admins create rooms and set capacities. An omitted capacity defaults to **8**; explicit **0** means unlimited. The answer did not explicitly settle what happens to existing occupants when a limit is reduced; retaining occupants remains recommended.

Initial indoor voice mode is open conversation and outdoor voice mode is moderated speakers. Owners/admins may change modes or disable voice for quiet rooms. Remembered auto-join starts a fresh app session muted/camera-off; transitions preserve deliberate device choices. Manual Leave voice pauses automatic joining for that visit until explicitly resumed.

The founder now requests all remaining questions together with recommendations. The existing pre-implementation sheet includes the consolidated **R01–R24** checklist covering product behavior, trial catalog delegation, and explicit deferral of real-service and paid-purchase decisions. These remain proposals, including the new offline manual-history and age-transition proposals. No application-code changes have been made in this clarification phase.

## Revision 0.19 — delegated management and single-floor builder

Confirmed 30 September 2026: owners have full home control and alone may transfer ownership or delete the home. Owners delegate admins to manage rooms, settings and access, and moderators to manage speakers, mute/kick and handle reports. Permissions may cover the home or specified rooms.

Owners and authorized admins can customize room capacity. The previously agreed slider/input and 0 = unlimited remain; the proposed initial value of 8 and retaining occupants when a limit is reduced have not yet been accepted by this answer.

The first builder supports one floor with room creation/resizing/movement, connecting doors, furniture placement/rotation/storage and undo in a draft before saving. Validate walking paths and block saves that trap occupants or invalidate furniture currently in use. Multiple floors and stairs are explicitly deferred.

Next small review group covers the remaining capacity behavior, initial voice modes and voice interruption defaults. These are requirement updates; application-code implementation remains on hold during clarification.

## Revision 0.18 — onboarding, starter templates and forum visibility

Confirmed 30 September 2026 in the first small review group: new users complete profile/avatar setup, then choose **Discover homes**, **Join by invite** or **Create home**. Returning users resume their last accessible home, falling back to discovery when it is unavailable. No personal home is automatically created.

Offer four free **Hangout, Study, Gaming and Work** templates based on the existing Timrom house design and basic furniture, editable with the approved room/door builder. Exact layouts and starter item quantities remain to be reviewed.

A forum follows its home's visibility: public-home forums welcome eligible visitors; private/unlisted-home forums require the appropriate invitation/access. Age separation, bans and interior permissions still apply. Visiting a forum does not grant home membership.

This approval covers the recommendations presented in group 1, not the entire decision sheet. Next review: delegated roles, indoor capacity defaults and builder boundaries. Application-code changes remain on hold for the requested requirements clarification.

## Revision 0.17 — pilot size, target devices and shared Angular fidelity

Confirmed 30 September 2026: target **100 simultaneous online users**, with the web app usable on laptop, Android and iOS browsers. The founder also confirmed an across-app test load of **up to 100 voice participants and 10 simultaneous cameras**. Minimum supported device profiles remain to be finalized. This is a pilot capacity target, not a measured result or a replacement for unlimited logical outdoor entry.

Both collaborators will use **one Angular project**. Faithfully replicate the existing HTML version's graphics, layout, movement and animations, while retaining already-approved changes to economy, home detail/neighbour views, voice behavior and real backend authority. Preserve the HTML/assets as a reference and verify matching views and interactions, including touch layouts. This does not undo the previously requested realistic motion/contact fixes.

The first milestone remains local integration with room/door editing, followed by an invite-only pilot. Native mobile apps and paid coin purchases remain later. The remaining proposed defaults in the decision sheet have not been accepted merely by answering the pilot/team questions; application implementation remains at the requested clarification gate.

## Revision 0.16 — implementation milestone and clarification gate

Confirmed 30 September 2026: build the integrated local web app first, then an invite-only online pilot. Include **templates, room/door editing and furniture placement in the first version**; geometry editing is not deferred. Start with earned coins and enable paid coin purchases afterward.

The founder requested clarification of remaining requirements before application-code work starts. [The pre-implementation decision sheet](../docs/PRE-IMPLEMENTATION-DECISIONS.md) records Q01–Q03 as confirmed, other proposed defaults, missing information and acceptance criteria. Unanswered proposals are not approved. No application code has been changed in this requirements pass.

## Revision 0.15 — owner/admin configurable voice modes

Confirmed 30 September 2026: each room, including a home's outdoor forum, has a voice-mode setting controlled by its owner or authorized admins:

- **Open conversation:** everyone admitted to the conversation can speak simultaneously, subject to moderation and their own microphone controls.
- **Moderated speakers:** moderators manage who can speak; everyone else can listen and participate in text chat, subject to moderation.

This is a per-room setting, not one fixed mode for the whole app. Persist the selected mode and enforce speaking permissions on the server/media layer. Saved one-time auto-join consent still applies, but automatically joining a moderated room does not grant speaking rights. Speaker permission never automatically unmutes a user or enables their camera.

The initial default and the handling of existing speakers during a live mode change remain implementation details to settle; neither has been assumed approved. These are documented requirements, not implemented room settings in the current Angular preview.

## Revision 0.14 — outdoor forum belongs to each home

Confirmed 30 September 2026: **each home has its own outdoor forum, open to eligible visitors**. Entry remains logically unlimited (capacity 0), with the agreed age separation and moderation rules. Forum visitor access is distinct from home membership and private interior-room access; visiting does not automatically join the home.

Revision 0.15 resolves speaking format as an owner/admin configurable room setting with both modes. Real forum implementation is still pending.

## Revision 0.13 — current-home detail, outdoor forum and remembered voice consent

Confirmed 30 September 2026:

- Show the current home fully, including its interior details. Show other joined homes as small exterior previews. Switching homes expands the destination into the full view and reduces the previous home to a small preview. Both walking to a neighbour's gate and direct travel remain supported.
- The garden/outdoor area is a moderated, forum-like gathering space with its own text/voice conversation and unlimited logical entry (capacity 0). The existing teen/adult separation and moderation exclusions remain. Revision 0.14 confirms a forum per home, open to eligible visitors. Revision 0.15 confirms both voice modes, selectable by the room owner or authorized admins.
- Ask once for automatic voice joining and remember consent. If the user agrees, subsequent room/outdoor entries automatically join the destination conversation without repeating the in-app question, even when no prior call is active. Preserve microphone/camera choices and allow disabling the preference. If the user declines, joining remains manual.

This supersedes revision 0.12's restriction that only an already active call could follow. Unlimited forum entry does not settle simultaneous speaker/media capacity, and the existing six-caller local prototype is not the agreed forum design. These are target requirements; the Angular demo has not yet been connected to the real backend.

## Revision 0.12 — neighbour travel and outdoor conversations

Confirmed 30 September 2026: users can visit a joined neighbouring home **either by walking to its gate or by clicking it to travel directly to its entrance**. Both paths use the same home/room admission rules.

The garden/outdoor area acts as another room, with its own text chat and voice conversation. The voice-follow behavior originally recorded here was limited to an existing call. Revision 0.13 supersedes that restriction with remembered one-time auto-join consent and confirms unlimited logical entry for the outdoor forum.

These clarify the pending movement/call details in revision 0.11. They are requirements recorded for backend integration, not a claim that the Angular demo already implements real neighbour travel or outdoor calls.

## Revision 0.11 — Timrom integration and community-home decisions

Confirmed 30 September 2026: use Timrom's graphics in Angular while retaining the agreed economy: online time earns account XP; interactive participation earns coins; XP unlocks eligibility and coins purchase items.

The primary experience is community homes. Do not automatically create a personal home at signup. Users who want their own home use **Create home**, choosing from templates. Existing invite-only home creation, host controls and reviewed public listings remain part of the baseline; starter template contents and onboarding details remain open.

Users can move freely around the current home and its surrounding environment. Other **joined homes appear as neighbours**, providing convenient navigation. Neighbour destinations therefore come from home membership, not automatically from the friends list. Globe/invites remain the discovery/join flow. Revision 0.12 confirms both neighbour travel options and room-based outdoor chat/voice. A continuous global street or separate public park network has not been approved by this clarification.

Backend support for **pets, NPC household characters, tasks, journal and music** follows social homes, text chat and calls. Their existing visual demos can remain, but they are not prerequisites for the first integrated social experience. Daily goals/dashboard priority remains a separate detail.

[The Timrom comparison and decision register](../docs/COMPARISON-AND-DECISIONS.md) records D1–D4 as confirmed and identifies remaining gaps. The Angular preview remains a local visual prototype; these decisions do not claim that real neighbours, template creation or backend integration are implemented.

## Revision 0.10 — local implementation progress

The connected-house implementation now includes overhead following/overview cameras, server doorway admission, furniture action menus, separate tracking consent, voice-follow state, username accounts and local email/mobile verification flows. [Implementation report](implementation-v0.2.md) records verification and remaining gaps. These are implementation updates, not new approvals of prices, providers, floor-plan geometry or final animation quality. Real email/SMS ownership verification, production safety/media infrastructure and final assets are still pending.


## Revision 0.9 — Soft sculpted approved; realistic motion required

The user approved **A · Soft sculpted** and the general motion style, with realistic real-life actions and physics as a requirement. [Motion acceptance criteria](visual-review/motion-requirements.md) cover planted feet, natural starts/stops/turns, collision-free movement, furniture-aligned sitting/resting, action transitions and both avatar proportions. The current motion lab is a simplified study; these production criteria are not claimed complete.

Confirmed: furniture stays fixed during normal use; clicking usable furniture opens a visual icon action menu; furniture interactions may update the real-life tracker only after a separate furniture-based tracking opt-in. Without this opt-in, furniture actions are visual only.


## Revision 0.8 — visual world and real account requirements

See [the confirmed account, camera, connected-room and voice-follow decisions](visual-review/decisions.md). The user chose email+password or mobile OTP with either verified contact required, a unique @username and separate display name, private contact details, connected rooms within each home, automatic movement through allowed doors, overhead following camera with whole-home zoom-out, visible side chat and other panels on demand. Voice switches with rooms only after a one-time opt-in. These supersede the old demo login and text-tab room navigation as the target experience.

[Three new art directions and five live motion studies](visual-review/index.html) are for approval. They do not constitute implementation of the new account/navigation system in the running app. This was the state at revision 0.8; revision 0.9 records Soft sculpted and the general motion direction as approved.


## Current implementation checkpoint — revision 0.7

The founder authorized local implementation. [The working application](one-world/README.md) now implements a first persistent vertical slice. **Socializing and interaction are the main niche; studying, working, gaming and other activities are important complementary contexts.**

Confirmed clarification: all connected activities/time count for XP; only interactive participation earns coins. Sleep/rest/passive tracking alone does not earn coins. Exact rates and participation thresholds remain product-tuning decisions; the application uses explicitly labeled trial values.

Ownership default selected under the founder’s instruction: **donate permanently, lend reclaimably**. Lenders can reclaim anytime; hosts can return anytime. No rental payment or fixed expiry. Banning a member returns their loans; ordinary room departure does not revoke a persistent loan. Home deletion/member-leave workflows remain unimplemented, so their final donated-item handling is not silently decided.

Local scope: React + SVG, Node/WebSocket, SQLite; real persistence and server rules. Fixed-grid room furnishing precedes custom room shapes. Partial Hindi shell labels precede full localization. Geographic discovery currently filters India/state/city with illustrative globe art; worldwide interactive globe remains planned. Local six-party peer media code precedes SFU/TURN deployment. No paid coins, public auth or production moderation. Earlier sections describe the target product or historical static exploration where explicitly noted; this checkpoint and the application README define what actually runs now.


Research date: 29 September 2026. Updated with founder decisions during this discussion. “One World” is a working description, not a cleared product name.

**Status: discussion draft.** Explicit user requests are recorded below; recommendations, numerical limits, audiences and technology choices are unapproved. This document does not claim user research, commercial validation, or a completed production architecture.

## 1. Product understanding

A shared digital world where people belong to community homes, move between rooms through a customizable avatar, communicate through text/voice/video, and optionally record and share everyday activities. The web application comes first; mobile applications follow. The globe provides worldwide discovery by geography and interests.

The primary promise to test: “Find people you want to spend time with, enter a place that feels familiar, and do everyday things together.” The avatar and activity journal should make that experience more expressive and useful.

### Explicitly requested

- Web first, mobile later; a worldwide social experience.
- Homes equivalent to Discord servers; rooms equivalent to text/voice channels, with spatial seating and occupancy limits.
- Study, gaming, work, casual conversation, hangouts and communities.
- Text, voice and video communication; friendship and social interaction.
- Click anywhere reachable to move the avatar there.
- Customizable cartoon avatars with soft, gentle graphics; five samples before choosing a direction; motion exploration.
- Bedrooms, kitchens, washrooms and other activity spaces.
- Activity history for study, sleep, food, gaming, work and more; user-controlled private/public visibility.
- Globe discovery by zone/continent, country, state and city, plus filters.
- Collaborative requirements, architecture and prototype discussion before committing to final graphics and animations.

### Confirmed in founder discussion

- India is the initial launch market; English and Hindi are required.
- Launch age floor is 13+, with separate teen/adult spaces. All community genres remain in scope. Exact contact/verification rules remain open.
- Globe connects separate homes with click-to-walk rooms. This world model is approved.
- Founder is a solo vibe coder with 3.5 years of experience.
- Minimize operating cost and compare cheaper alternatives. Preferred starting ceiling is ₹2,000/month; founder invites recommendations if more is necessary.
- Activities primarily represent real-life routines. Room-based activity tracking starts automatically after explicit user opt-in.
- Both miniature and mature avatar proportions are required, with age-appropriate defaults/customization. The underlying art/material style is still open.
- Users build custom homes/rooms. A useful basic builder is free; additional customization is unlocked through XP earned by spending time in the app. All connected logged-in time earns XP. XP/levels unlock item eligibility; coins buy the items. Coins are earned through voice chat, text chat and interactive activities, or purchased with real money. Online time alone earns XP, not coins. Furniture purchases grant one personally owned placeable copy, with explicit Donate to home and Lend to home options from the first release; themes, colors and textures are reusable unlocks. Numerical rates and prices remain open.
- Gaming initially supports playing external games together; embedded mini-games come later.
- Room entry is denied at full capacity. Host-selected capacity 0 means unlimited; provide a draggable slider and precise input.

### Still unknown

Detailed teen/adult contact and age-assurance model, expected concurrency, commercial versus personal project, detailed moderation responsibilities, media usage limits, coin-pack pricing and purchase policies. Home creation/listing/voice defaults are confirmed below.

## 2. Structure of the experience

```text
World discovery
  Geography + interests + language + availability
    Home: community, membership, rules, roles, discovery listing
      Room: access policy, capacity, layout, optional conversation
        Seat / object / conversation area

User: avatar + friends + privacy preferences + activity journal
```

Geography describes a home's chosen community affiliation, not the current physical location of its visitors. Include “Global / no location.” Geography is one discovery dimension; genre is another. “India / Maharashtra / Pune / Study” should be possible without requiring every user to identify where they live. Countries do not all have the same administrative hierarchy: store optional administrative levels and localized labels rather than requiring a state for every country.

Separate four concepts:

| Concept | Example | Meaning |
|---|---|---|
| Connection presence | Online, reconnecting, offline | Technical connection state |
| Social availability | Available, focusing, away | What the user wants others to know |
| Avatar action | Sitting, walking, lying down | What happens inside the virtual space |
| Activity record | Studied 25 minutes, slept 8 hours | User-declared or explicitly confirmed real-life/roleplay entry |

A browser cannot reliably prove studying, sleeping or eating. An avatar lying down must not silently generate verified sleep data. An inactive browser must not be labeled sleeping.

## 3. Three approaches to compare

| Approach | Experience | Effort / risk | Strength | Main cost |
|---|---|---|---|---|
| A. Social rooms with simple avatar seats | Directory, homes, fixed seating, reliable calls | M / lower | Fastest way to test whether people return | Less exploration; movement is limited |
| B. Connected world with walkable homes | Globe → home → 2.5D room; click-to-walk; interactive furniture | L / medium | Closest practical match to the request | Needs movement, layouts, asset pipeline and spatial permissions |
| C. Continuous 3D world | Walk across neighborhoods into homes, free camera | XL / high | Strongest exploration fantasy | Streaming, navigation, camera, device performance and distributed world simulation |

**Founder-selected direction: B.** Keep worldwide discovery and expressive room movement, while loading only the space the user occupies. A seamless continuous world can be researched later if physical travel between homes becomes central to the product. This is an engineering/product judgment, not a finding established by market research.

## 4. Core journeys

1. **First visit:** choose interests and language → create avatar → set visibility → see welcoming occupied homes → preview rules and people count → join → learn movement → choose whether to join audio.
2. **Study together:** find a study home → enter a room with space → choose a seat → optionally start a focus session → chat or join audio → finish session → save a private activity summary → optionally share it.
3. **Visit a friend:** open friends → view only permitted status → request to join/invite → navigate to an allowed room. Never reveal a hidden home or private room through the friend list.
4. **Take a break:** leave the seat → use kitchen or private break action → explicitly select whether to record a real-life activity → return without losing the conversation history.
5. **Host a home:** choose template, name, genre, languages, region affiliation, rules and join policy → set rooms/capacity/roles → invite members → moderate reports and events.
6. **End the day:** stop an activity or enter a manual sleep record → choose audience → review totals. Disconnecting a browser must not keep a microphone or paid media connection running indefinitely.

## 5. Functional requirements

Priority definitions: P0 = proposed closed-beta necessity; P1 = proposed expansion; P2 = research/later. These priorities require founder review.

| ID | Priority | Requirement | Acceptance example |
|---|---|---|---|
| ID-01 | P0 | Account, profile, avatar and session management | User can sign out all sessions; profile edits do not expose private fields |
| AV-01 | P0 | Miniature/mature proportions plus skin tones, hair, outfit colors and accessories | Appearance persists and works across poses; cosmetic changes never change age-based access |
| HM-01 | P0 | Create/join homes; public, unlisted and private modes | Private home never appears in unauthorized search results |
| HM-02 | P0 | Owner, moderator, member and visitor roles | Room access and moderation permissions are checked on the server |
| RM-01 | P0 | Text rooms, spatial social rooms and quiet rooms | Each room clearly explains chat, audio and occupancy behavior |
| RM-02 | P0 | Host capacity slider/input: 0 = unlimited; positive number = strict maximum | Full room rejects entry; zero admits subject to access rules; last-slot race has one winner |
| RM-03 | P0 | Click/tap movement with obstacle-aware paths | Avatar cannot walk through furniture, walls or locked doors |
| RM-04 | P0 | Keyboard/list alternative to spatial navigation | User can enter rooms and select seats without using the map |
| CH-01 | P0 | Durable room messages, edit/delete own messages, reactions | Reconnect does not duplicate a pending message |
| CH-02 | P0 | Friends and consent-based direct messages | A blocked user cannot send messages or new friend requests |
| VC-01 | P0 | Explicit voice join, mute, deafen, device selection | Entering a room never silently activates microphone/camera |
| VC-02 | P0 | Video with clear camera control and low-bandwidth mode | Losing video still allows text; users can choose audio only |
| VC-03 | P1 | Screen sharing, table audio zones and proximity audio | Only authorized audience receives the stream |
| AC-01 | P0 | Start/stop/manual activity records and journal | Starting a new primary activity resolves the existing one |
| AC-02 | P0 | Per-entry audience and private default | Private activity is absent from other users' APIs, events and search |
| AC-03 | P0 | Edit/delete entries; daily/weekly summaries | Cross-midnight sessions split correctly for the chosen time zone |
| DS-01 | P0 | Geography/genre/language search and live availability | No-results view offers nearby categories or scheduled sessions |
| DS-02 | P1 | Interactive globe, bookmarks and recommendations | Equivalent accessible list works without globe rendering |
| SF-01 | P0 | Block, mute, report, leave, kick, ban, audit trail | A room ban also removes media access and prevents immediate rejoin |
| NT-01 | P0 | In-app notifications, quiet hours and preferences | A private activity never appears in a push preview without permission |
| CM-01 | P1 | Events, announcements, polls, community posts | Publishing audience is visible and enforced |
| CR-01 | P0 | Free basic custom home/room builder: layouts and furniture placement | Save valid layout; undo changes; occupants cannot be trapped or exits blocked |
| XP-01 | P0 | Earn XP from connected logged-in time; unlock catalog eligibility | XP is not spendable; duplicate sessions never multiply rewards |
| CN-01 | P0 | Earn coins through voice chat, text chat and interactive activities; buy eligible items | Online presence alone creates no coin award; purchases deduct coins only |
| CN-02 | Phase to confirm | Buy coin packs with real money | Only verified successful payment credits coins, exactly once |
| IN-01 | P0 | Personal furniture, Donate and Lend from launch, reusable finishes | One copy cannot occupy two places; a loan preserves personal ownership |
| GM-00 | P0 | External-game social rooms and self-declared game status | Users talk while playing externally; no automatic desktop game detection is promised |
| GM-01 | P2 | Mini-games, collaborative boards, watch/listen experiences | Separate design and content/service rights review before delivery |
| EC-01 | P2 | Cosmetics and host subscriptions | Core access and privacy remain clear; no unapproved payment scope |

For a first technical trial, propose default capacity 12, at most 6 simultaneous camera publishers and one active spatial room per account. Hosts can set capacity 0 (no room occupancy limit) or a positive limit. Video limits and operating capacity remain separate; a bounded load test does not prove unlimited scale. These defaults are test parameters, not vendor limits or proven capacities. Home membership can exceed room occupancy. Large stages need a separate speaker/listener model.

## 6. Activities, privacy and room semantics

### Proposed activity rules

- Primary activity categories: studying, working, gaming, socializing, eating, resting, sleeping, custom.
- Activity source is explicit: manual, confirmed in-app timer or roleplay. Do not label these medically or objectively measured.
- Founder-selected rule: explain room-to-activity mappings and obtain explicit opt-in, then automatically start/switch the mapped activity on room entry. Provide pause, override, and per-room exclusions. Private-break and sleep mapping require separate explicit choices; never silently infer actual sleep or bathroom behavior. Teen eligibility for routine tracking remains subject to the India review.
- One running primary activity per user; automatically switching rooms closes the prior mapped session and begins the next. A manually started session should prompt before room mapping replaces it. Secondary tags can describe context. Concurrent devices do not create duplicate timers.
- Store UTC instants plus relevant time-zone information; let the user correct mistakes, end forgotten timers and enter offline sleep.
- Timers derive elapsed time from timestamps, not counts of browser timer ticks. Background tabs can be throttled. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- Propose an inactivity prompt for active sessions and an explicit “continue offline” option for intentional long records. Presence and history have different lifecycles.
- Propose keeping detailed history for 90 days initially, with export and user deletion; discuss longer retention before implementation. No retention period is approved yet.

### Privacy matrix to approve

| Data | Proposed default | Optional sharing |
|---|---|---|
| Activity history and durations | Only me | Selected friends, chosen home or public |
| Current activity | Only me | Friends/home/public, separately from history |
| Bathroom/private break | Not recorded unless explicitly chosen; generic “Away” | Avoid detailed public routine broadcasts |
| Sleep entry | Only me; no open microphone | User-selected summary |
| Home affiliation | Home controls discovery | Global/country/city affiliation |
| Personal location | Not collected for discovery | Optional broad profile region |
| Voice/video | Off until explicit join | Authorized room audience |

Privacy cannot mean “occupy a public seat invisibly while still being heard.” Invisible browsing should not secretly listen to rooms. Someone physically present in a shared room is visible to its occupants; a private activity can remain hidden independently. Private breaks should use a neutral private space/overlay so a visible bedroom or washroom location does not defeat the privacy choice.

Room-audio recommendation: everyone in the same explicitly joined conversation hears one another. Introduce table-based or proximity conversations after testing. Muting a remote audio track in the interface is not sufficient to enforce a private conversation; the server must restrict delivery. Publishing a previously private activity can reveal information immediately; making it private later cannot erase screenshots or memories.

## 7. Design and motion decisions

Five concept sheets accompany this draft: A Soft sculpted; B Cozy clay; C Gentle illustrated; D Miniature world; E Airy pastel. A is the closest starting point to the requested soft premium aesthetic; D is worth testing at small in-room sizes. Their current adult/childlike perception must be tested before audience selection. These are original exploratory renders, not Apple assets.

The sheets are static key poses, not rigged characters or animation clips. They hold outfit and subject roughly constant to compare rendering styles. A/D and A/E are visually close; the next iteration should exaggerate the chosen distinction rather than pretend all five are equally different.

After style feedback, create a diverse lineup, front/side/back views, clothing/hair compatibility rules and one production-ready test character. Validate movement in an actual room before making a large avatar catalog.

Motion specification for testing: idle breathing and occasional blink; constant-speed walking with smooth start/stop; turn-to-face; approach-seat → sit → seated idle → stand; brief wave; typing; rest pose. Reduced-motion mode suppresses bobbing and decorative transitions while preserving meaningful status changes. Avoid random walking and constant visual noise. Proposed crossfades 120–220 ms and wave duration 0.8–1.2 s; these are taste samples to tune, not approved design tokens.

Rendering choices: 2D layered sprites are cheaper to render but expensive to multiply across outfits/directions/actions; rigged 3D lets apparel and animation share a skeleton but needs modeling and mobile performance work. A fixed isometric camera with simplified 3D is a credible alternative to prerendered 2.5D. Choose after a small device benchmark, not from a concept image alone.

## 8. Prototype and validation plan

An exploratory prototype should cover: Discover → Home preview → Room → click-to-walk → seat → join controls → activity → privacy → journal. Use fictional users and simulated occupancy, clearly marked. Local chat demonstration is not a real network chat. The prototype does not prove capacity, call quality, authentication, persistence or safety.

Before a full application, test with 5–8 intended users, including keyboard and lower-performance-device users. Ask them to find a relevant home, join someone, move, identify who can hear them, start a private activity, leave and find history without coaching. Observe confusion, not just stated enthusiasm.

Pilot hypothesis: existing small groups will return to spend focused or relaxed time together because the room makes companionship easier. Candidate success measures: first useful interaction, return to the same group in seven days, completed self-chosen sessions, and host willingness to schedule another session. Guardrails: unwanted contact reports, accidental mic/camera activation, misunderstood audiences and cost per retained group. Targets require a real pilot baseline.

Validation proposal: recruit 3–5 existing groups across the requested genres, schedule staffed sessions, and test on an owned web domain. The public product targets ages 13+ with separate teen/adult spaces; pilot participants must follow that policy. Add public discovery once moderation and a sufficient supply of occupied spaces exist. A mostly empty globe risks making the product feel abandoned. Coin sales for real money are founder-approved monetization. Basic custom building remains free. XP unlocks eligibility, while earned or purchased coins buy items; purchased coins do not bypass XP requirements. Pack prices, earning rates, refunds and teen purchasing rules remain open. Host subscriptions and other paid products are not approved.

## 9. Decision register and next discussion

| Decision | Recommendation | Status |
|---|---|---|
| First audience | 13+; separate teen/adult spaces; all community genres | Founder confirmed |
| World model | Globe → separate homes → walkable rooms | Founder approved |
| Tracking meaning | Mostly real life; automatic room mapping after opt-in | Founder confirmed |
| Geography | Home affiliation; no GPS requirement | Proposed |
| Communication | One explicitly joined voice conversation per room | Founder confirmed |
| Privacy | Private activity history by default | Proposed |
| Art style | Explore A with D's small-scale readability | Awaiting visual feedback |
| Technology | Modular backend + separate room/media services | Proposed; see architecture |
| Launch scope/cost | India; English/Hindi; solo builder; ₹2,000/month starting target | Founder confirmed; feasibility depends on usage |

Next questions, in priority order:
1. Who are the first 20–50 people and what will they do together repeatedly?
2. Is this a startup, personal project, or learning project? How many users and simultaneous callers should the first trial serve?
3. How should teen/adult separation work for family, educational and mixed community use? (13+ confirmed.)
4. Which rooms should be excluded from automatic tracking, and what should happen on inactivity or manual override? (Opt-in automatic mapping confirmed.)
5. What small-room occupancy and camera limits are acceptable for the initial ₹2,000/month trial?
6. Who reviews public home listings and reports, and what host obligations apply?
7. Which avatar sheet and which proportions feel right? Which surface/material style feels right? Both miniature and mature proportions are confirmed.
8. Does “social media” require public posts/feeds at launch, or primarily friends and communities?
9. What XP/minute, participation-window coin awards, level thresholds and item prices should the first economy trial use?

Do not mark decisions approved until the founder answers. This is a foundation for discussion, not a claim that all requirements have been gathered.

## 10. India, bilingual experience and low-cost build revision

Support study, gaming, work, hangout and custom communities with one configurable home/room system. Genre differences initially change templates, labels and room policies. They do not each require a separate mini-game or specialized productivity suite. This preserves the founder’s breadth while reducing engineering and operations work.

English/Hindi acceptance requirements: language switch; translated navigation, onboarding, room rules, activity names and privacy controls; Unicode/Devanagari display; text expansion; screen-reader labels; user language preferences; English/Hindi/Hinglish moderation handling. User messages remain in their original language unless translation is explicitly added. Full automatic translation is not a required recurring API expense. The current exploration is English-only and is not the finished bilingual UI.

Small-budget proposals: static assets on a CDN, one API/room deployment initially, shared PostgreSQL, no Redis until multiple room workers require coordination, bounded rooms, low video resolution/limited visible tiles, explicit voice join, automatic media disconnect when intentionally leaving, compressed licensed assets, basic database search and no AI APIs in the core loop. Each limit should be communicated plainly to users. Free allowances are useful for testing but are not a durable operating plan.

The initial “all ages” goal has been refined by the founder to 13+, with separate teen/adult spaces. Proposed child protections for discussion: age-separated discovery and homes, no unsolicited adult-to-child DMs/invites, private routine history, no public child location/routine search, vetted host controls and an accountable report-handling process. Age declarations alone do not establish an effective verification system. A solo builder must plan the ongoing human moderation workload as well as software.

India-specific review: the DPDP Act defines children as under 18 and contains parental-consent and restrictions concerning tracking/behavioural monitoring of children, subject to applicable provisions/exemptions. A 13+ product therefore does not automatically remove child-data obligations. Because routine tracking is central here, obtain qualified advice on whether and how the intended child activity feature can be offered; consent alone should not be assumed to solve it. Official materials describe phased implementation of the 2025 Rules, so verify the actual provisions and commencement dates against the intended release date. This is a design issue to resolve, not a claim that every provision is already effective. [Act text](https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf), [official implementation announcement](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014&lang=2&reg=3).

### Latest confirmed home and budget decisions

Anyone may create an invite-only home. Public listings require host review. Each room has one explicitly joined voice conversation. Starting budget target: ₹2,000/month, with willingness to discuss necessary increases. Budget is an operating target, not an already validated hosting quote. The immediate prototype runs locally without paid runtime services; image generation is separate from future app hosting.

Cost strategy: test invite-only groups with bounded concurrency, small rooms, audio-first usage and metered camera use; verify actual provider allowances before deployment. ₹2,000 should be treated as a constrained experiment budget, not a guarantee for a publicly growing all-genre network. Paid moderation, verification, domain, taxes and variable media egress can exceed it. Do not publicly promise unlimited calls or unlimited hosting until unit costs are measured.

The local exploration now includes opt-in automatic room activity mapping, with private entries and pauses in private/rest spaces. This demonstrates interaction semantics only; it does not establish legal eligibility for teen routine tracking or enforce real access controls.

## 11. Founder decisions — avatar proportions, custom building, XP and room capacity

### Avatar proportions

Support miniature and mature appearance within one coherent visual style, preserving outfit identity across variants. Propose an age-appropriate default with user choice among permitted customizations; exact age-based restrictions remain open. Neither miniature appearance nor mature appearance proves age, changes the account’s age band, or grants entry to teen/adult spaces. Do not reveal a precise age through avatar defaults. Validate shared rig/seat alignment and hitboxes for both body types. The prototype selector is schematic scaling, not a completed two-body-type asset pipeline.

### Custom homes and rooms

Custom building is part of the initial product, not only a later decoration feature. The free builder must produce a usable unique home: draw/resize rooms within a modest build allowance, place doors, choose floor/wall colors, and place essential furniture such as desks, chairs and beds. Templates are optional starting points. Essential communication, accessible routes, privacy controls and moderation never require XP.

Proposed earned additions: furniture variants, themes, lighting, decorative items, larger creative layouts and additional customization slots. Exact catalog and free allowance are not approved. Founder-confirmed economy: all logged-in app time earns cumulative XP; levels permanently unlock catalog items, and coins, earned or bought with real money, buy those items. Buying an item never spends XP or lowers a level. Rate of earning currency, thresholds and prices remain undecided. Real-money coin purchases are approved. Cash redemption, user-to-user transfers, trading and paid XP are not part of the current scope; coin purchase is not cash withdrawal.

Builder interaction specification: choose build mode → drag furniture from catalog → snap to grid → rotate → inspect valid/invalid placement → undo/redo → preview walkable routes → save/publish. Also offer keyboard/numeric placement. Owners set room capacity separately from chair count; a person may stand in a room even when all chairs are occupied. New layout publishing must validate occupied seats, spawn points, doors and exits and either defer conflicting edits or move occupants to a valid location with clear notice. Unlocked assets must be validated on save, not merely hidden in the catalog.

### XP and coins — founder-confirmed model

**Count all logged-in time**, including idle time, background sessions and sleep/rest while connected. Do not require keyboard/mouse activity, voice participation, camera use, a public activity record or a study/work session. The earlier suggestion to count only intentional activities is superseded. No daily cap, reduced idle rate or sleep exclusion has been approved.

Working interpretation: “logged-in time” means time connected to the application while authenticated, not the lifetime of a saved login cookie after closing the app. Tell the user this clearly. Multiple devices/tabs count once per account using the union of connected intervals. Network reconnection grace and suspended-device behavior need explicit rules; no presence system can prove uninterrupted connection during indefinite offline gaps. A manual sleep journal entry alone must not retroactively create connected time.

Two distinct balances: cumulative XP determines level and catalog eligibility; **coins** pay for eligible items. XP is never spent or deducted by a purchase. Coins are earned through voice chat, text chat and interactive activities and can also be purchased with real money. Simply being online earns XP only. Coin eligibility, rates and limits for each activity type remain open. Buying coins does not grant XP, levels or access to a level-locked item.

Founder-confirmed ownership: each furniture purchase adds one placeable copy. Buying three chairs means owning three chair copies; each can be placed in one location at a time. Moving or storing an owned chair does not require another purchase. Themes, colors and textures are permanent reusable unlocks; an owned finish can be applied repeatedly without per-use coin charges. Free starter items follow their published free entitlement rules. Furniture belongs to its purchaser by default. An explicit Donate to home action changes ownership to the home; personal placement in a shared home is not an implicit donation. Both Donate (permanent home ownership) and Lend (temporary use with personal ownership) are included from launch. Reclaim/acceptance defaults and home-deletion rules remain to be finalized.

Economy flow: connected online minutes → cumulative XP; qualifying voice chat, text chat and activities → earned coins under a versioned policy; optional verified real-money payment → purchased coins. Required XP/level reached → item becomes purchasable → coin debit → one furniture copy or a reusable finish entitlement. XP rate, per-source coin earning rules, overlapping-source rules, level thresholds, item prices and any bonus policies remain open. Avoid streak penalties and deceptive earning prompts. Counting idle time is intentional, not an abuse signal; duplicate sessions and forged timestamps are abuse cases.

Privacy: users can earn from eligible private sessions without publishing activity history. Do not broadcast sleep, bathroom visits or location to justify an XP award. The existing teen routine-tracking review also applies to any behavior-based XP design; the reward system cannot be used to bypass it.

### Room capacity: exact semantics

- Store a nonnegative integer. **0 means unlimited occupancy**, not zero entrants, an empty room or disabled room. Negative, fractional, blank or malformed values are invalid.
- With capacity N > 0, a new entrant can join only when occupied + reserved slots < N. Count the host and moderators too; no hidden full-room bypass. Rejoining an existing valid session does not consume another slot.
- Capacity is enforced atomically on the server, including invite links, friend-join, teleport and room doors. The UI can indicate Full but cannot be the enforcement layer.
- Capacity 0 removes the host-selected occupancy cap; it does not bypass room permissions, bans, teen/adult separation, finite seats or separately disclosed media/service limits.
- Lowering capacity below current occupancy does not forcibly remove people by default. Block new admissions until occupancy is below the new limit. This non-disruptive behavior is proposed for approval.
- Separate admission from seating: an unlimited room can still have four occupied chairs. Render capacity as “Unlimited ∞” and occupancy as “23 here”, not “23/0”.
- UI: draggable slider with the left endpoint “0 · Unlimited ∞”, live value text, preset chips, exact integer entry and Save. Slider spans common small-room sizes; exact entry may expand its range. The prototype’s finite input ceiling is a demo validation limit, not an approved product quota.
- Never suggest unbounded infrastructure. If a service is temporarily at operating capacity, explain that state honestly. Whether very large rooms use additional spatial instances is a future decision; do not silently split a promised shared conversation.

### Gaming scope

First release: genre-specific spaces, external-game names/status chosen by users, friends/invites and room chat/voice/video. No game launching integration, automatic external-app detection, hosting rights or embedded gameplay is implied. Later mini-games need their own interaction, asset, latency and resource budgets.

## 12. Paid coin purchases and inventory — confirmed distinction

See [Economy specification](economy-specification.md) for the consolidated rules, item states, payment lifecycle and unresolved choices. This revision supersedes any earlier suggestion that XP could pay for items or that all purchased items allow unlimited copies. Live payments are not implemented in the prototype.

## 13. Coin earning sources and personal ownership

Confirmed: online time earns XP. Coins are earned through voice chat, text chat and interactive activities, plus optional real-money purchases. Do not couple the XP ticker to a coin ticker. All-time XP accrual, including idle time, does not imply all-time coin accrual. Founder chose participation time windows with spam checks for chat coin rewards. Window length, qualification signals, award rates and limits remain open.

Confirmed: furniture is personally owned by default, with separate Donate to home and Lend to home actions from launch. Show ownership and placement separately in the builder. Purchasing or placing furniture inside a home does not transfer ownership automatically. Donating an item must not mint a second copy or create XP/coin rewards by itself. Donation confirmation lists the item and destination and explains permanent transfer. Lending keeps ownership with the user and has a distinct return/reclaim flow; detailed defaults are described in the economy specification.

Confirmed chat model: participation time windows with spam checks, not per-message payouts. Open reward decisions: window length and qualification signals; exact interactive-activity qualification; quiet listening in voice; solo versus group sessions; overlapping chat and activity rewards; message deletion/repeated messages; manually added history and offline activities; per-account caps; eligibility for private/teen spaces. Record accepted choices before assigning numeric rates.

## 14. Lending is included in the initial scope

Founder selected both Donate and Lend from the start. Donate permanently changes ownership to the home. Lend authorizes use of a specific personal furniture copy while ownership remains with its purchaser. Do not duplicate the instance or let a home donate another user's loaned item.

Proposed defaults to validate: owner reclaim at any time, host return at any time, no rental fee or fixed term, borrower loans returned on leave/ban/home deletion, donated copies retained by the home on member departure. Returning a chair or bed must safely clear its occupant and restore the same owned copy to inventory. Show borrowed/owned labels and return-pending status. Reclaim does not require permission to enter the borrowing home. Home-deletion handling for permanently donated items is still open.

This confirms two sharing modes, not a paid rental marketplace. The earlier static exploration does not implement inventory, donations or loans. The revision 0.7 local application now implements all three.
