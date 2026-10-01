# One World — account and connected-world decisions

29 September 2026. This record supersedes the earlier demo-profile and room-tab interaction design. Local v0.2 implements the connected house, action/consent controls and account flows. Real email/SMS delivery and finished animation contacts remain pending; see ../implementation-v0.2.md.

## Confirmed in this discussion

| Area | User decision |
|---|---|
| Registration | Either a verified email or a verified mobile number is sufficient. The other can be added later. |
| Sign-in | Email + password, or mobile number + SMS OTP. |
| Identity | Unique @username for discovery and adding friends; a separate display name may be non-unique. |
| Contact privacy | Email/mobile stay private. Find users through username, display name or invitations. |
| Product emphasis | Visual world and social interaction; study/work/gaming remain important contexts. |
| Default interface | World is central with text chat visible beside it. Activity, inventory, settings and other controls open on demand. |
| Home topology | A continuous connected floor plan within a home. Different homes are still reached through the globe/invitations. Walkable streets between homes are not part of this choice. |
| Movement | Click a valid destination in another room; automatically find and follow a route through permitted doorways. No text room tabs as the primary navigation. |
| Restrictions | Full/locked/age-restricted rooms still block entry. Visual continuity does not remove permission boundaries. |
| Camera | Angled overhead camera follows the avatar. Zoom out to view the whole home. |
| Voice transitions | Ask once and remember auto-join consent. While enabled, later room/outdoor entry automatically joins that conversation, even without an already active call; preserve microphone/camera choices and allow disabling the preference. Clarified 30 September 2026. |
| Furniture physics | Fixed during normal use; realistic movement and furniture contact. No push/throw/knock-over mechanics in the first version. |
| Furniture activity tracking | May update the tracker only after a separate furniture-based tracking opt-in. Otherwise actions remain visual. |
| Furniture input | Clicking a usable object opens a small icon action menu. The chosen action starts its approach/interaction. |
| Visual approval | **A · Soft sculpted** approved for art direction. General motions accepted, with realistic real-life behavior and physics required. Final production assets and contact/collision behavior still need validation. |

## Existing confirmed rules retained

13+ with separate teen/adult spaces; India, English/Hindi; private activity tracking by default with room-based tracking only after opt-in; 0 capacity means unlimited room occupancy; explicit finite limits still block a new arrival; room and media capacities are separate. All connected online time earns XP; interactive participation earns coins. XP unlocks eligibility, coins purchase items. Furniture copies are personally owned, donation is permanent home ownership, lending is reclaimable. Real-money coins remain a future feature with no local payment connection.

## Proposed implementation requirements to review, not additional user decisions

- Email/mobile linking must verify ownership and must not silently merge separate accounts. Decide the recovery/merge experience and email-verification method before connecting an auth provider.
- Define allowed @username characters, length, reserved names, rename policy and search behavior before data migration. Phone/email must not appear in public APIs, room presence, search results, URLs or shared UI.
- One persistent player identity spans rooms. Camera motion and rendering remain continuous while the server performs admission at a doorway. Doors and room graph become authoritative data, rather than client-only decoration.
- Show a visual boundary/door state for full or locked rooms; offer a short on-demand reason without exposing private room details. Decide waiting/queue behavior separately; no queue is assumed.
- Server revalidates target admission when the avatar reaches a doorway. A room becoming full while the avatar walks should not result in clipping or unauthorized entry. Final reservation/waiting semantics need validation.
- Voice auto-follow is separate from activity-tracking consent. Preserve mic mute/camera choices and provide an obvious pause/disable control. No automatic unmuting or camera activation is authorized by the room-follow decision.
- Decide what to show when the target room's call is full or media reconnect fails. Occupancy permission and media subscription are separate transitions.
- On phones, a permanently side-by-side chat may not fit. Decide whether the chat becomes a bottom drawer, a compact overlay or split view; the desktop choice does not automatically settle mobile layout.
- Preserve accessible labels, keyboard access and essential error/consent text even in a GUI-first design. Minimal text does not mean unlabeled controls.

## Exploration deliverables

- **A · Soft sculpted:** static generated avatar/body-proportion and connected-room concept.
- **B · Living miniature:** static generated closer 3D environment/character concept. Its lower camera is an art reference, not the chosen navigation camera.
- **C · Illustrated neighbourhood:** static generated illustration/material/room reference. This generation shows portrait-sized miniature samples rather than a matched full-body miniature rig.
- **Live motion lab:** a separate Three.js scene with a simplified articulated character, connected openings, follow/overview cameras, miniature/mature comparison, speed/pause controls and five motion studies: breathing/blinking, walking across rooms, sit/stand, greeting wave, rest/wake.

The motion lab does not animate the generated still artwork. It is not multiplayer and does not implement auth, voice, consent, collision validation, capacity, home editing or real activity tracking. Its route and furniture arrangement are illustrative. Shortlisting in the board saves only a local browser preference and does not approve a design automatically.

## Decisions still needed before replacing the application experience

1. Specify explicit action-to-activity mappings, precedence and stop/exit behavior during activity-state implementation; separate furniture-based opt-in is confirmed.
2. Validate grounded contact, posture and transitions against [the motion requirements](motion-requirements.md); the existing study is not the final rig.
3. Mobile chat presentation and email/mobile verification/recovery/provider choices at the implementation stage.

Current implementation continues at http://127.0.0.1:5173/. The separate review board is at http://127.0.0.1:8766/. No app account model, login method or room navigation was silently changed by this design review.

## Latest approval

The user selected **Soft sculpted** and accepted the general motions, requiring realistic animation grounded in real-life scenarios/activities and physics. See [the concrete acceptance criteria](motion-requirements.md). The earlier art-selection question is resolved; fixed furniture, icon action menus and a separate furniture-tracking opt-in are confirmed.
