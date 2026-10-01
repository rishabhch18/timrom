# Soft sculpted — believable movement and activity requirements

Status: art direction and general motion style approved by the user. The user additionally requires animations to follow real-life activities and physics. The requirements below translate that request into review criteria; they do not certify the present study or application as physically complete.

## Approved direction

Use **A · Soft sculpted** for avatars and rooms. Preserve both miniature and mature avatar options. Keep the approachable motion style already shown, with believable posture, contact and transitions. The rendered motion-lab character remains a separate simplified study; approval of the direction does not make it the final production model.

## Acceptance criteria

| Area | Required behavior | Review evidence |
|---|---|---|
| Ground contact | Feet meet the supporting surface. A planted foot remains stable while the body moves over it. No sustained foot sliding, hovering, sinking or unexpected vertical jumps. | Inspect walk, turn, stop and idle at normal and slow speed for both body types. |
| Movement | Walking starts and stops smoothly. Stride speed follows actual distance travelled. Turns include body orientation and appropriate steps rather than snapping the entire character. | Change destinations during movement; approach a nearby target, reverse direction and stop at a doorway. |
| Obstacles | Characters take reachable routes around solid walls, furniture and closed/restricted boundaries. Visible openings have sufficient clearance. | Test narrow passages, newly placed obstacles, unreachable targets and doorway admission failure. |
| Room transitions | Cross a real doorway while keeping one continuous avatar and camera. Full or restricted rooms cause a controlled stop outside the boundary. | Test a target room becoming full while the character approaches, plus reconnects and permission changes. |
| Furniture contact | Hands, feet, pelvis and back align with the usable object and its dimensions. Miniature and mature rigs adjust naturally without limbs being stretched unrealistically. | Review each supported seat/bed/desk size and orientation with each avatar size. |
| Sitting | Approach a valid seat, orient, bend, transfer weight and settle. Standing reverses this with clearance to move away. No standing inside the sofa or instantaneous pose replacement. | Empty/occupied seat, blocked approach, interruption before seating and stand-up clearance. |
| Lying/resting | Approach the bed/sofa, get into position, settle with body support, then rise naturally. Subtle breathing is allowed; the body must not pass through cushions or change scale to fit. | Both body types, different supported furniture sizes and interrupted transitions. |
| Gestures | Waving and conversational gestures use plausible shoulder/elbow/wrist movement, balance and head attention. Gestures blend with idle and seated states. | Compare standing and seated waves; ensure arms do not routinely intersect the torso or nearby furniture. |
| Real-life activities | A study/work/game/eating action is contextual: use the relevant desk/device/table/prop and a plausible hand/body pose. Being in a kitchen or performing an avatar action does not prove real-life behavior. | Review each activity individually after its object interaction and tracking policy are agreed. |
| State changes | Start, loop, interrupt, finish and return-to-idle are explicit states. Changing an action must not leave limbs in a prior pose or cause sudden position jumps. | Interrupt each action with movement, room departure, object loss and connection recovery. |
| Shared objects | Seat occupancy and usable-object ownership are authoritative. Two clients cannot occupy the same single seat or independently claim the same exclusive interaction. | Concurrent seat requests and conflicting edit/reclaim requests. |
| Camera | Angled overhead follow with a stable target, smooth following and whole-home zoom-out. Character and doorway interactions remain readable; no forced camera shaking. | Door crossings, close furniture interactions, zoom changes and narrow displays. |

## Confirmed interaction scope

- **Object physics:** furniture remains fixed during normal use. Realistic avatar movement and interactions are required; push/throw/knock-over mechanics are not included in the first version. Builder edits remain a separate permission-controlled operation.
- **Object input:** clicking usable furniture opens a small visual action menu, such as sit, lie down or use. Selecting an action begins the approach and physical transition.

## Confirmed tracking scope

- Furniture actions may update real-life activity tracking **only after a separate furniture-based tracking opt-in**. This is independent of room-based tracking and voice-follow consent. Without it, the interaction is visual only. Existing manual and room-based tracking remain available under their own rules.
- Activity records retain the existing private-by-default visibility policy. An avatar pose is not proof of real-life behavior and does not itself create a coin reward.
- Exact action-to-activity mappings must be explicit in the interaction catalog. A lying pose can mean rest or sleep; do not infer that a person is sleeping merely because their avatar lies down. Resolve ambiguous choices through the named action the user selects.
- Furniture tracking priority and stop/exit behavior need to be specified when implementing the activity state machine; the opt-in does not silently authorize retroactive tracking.

These are independent decisions. No extra XP/coin reward rule is implied by adding an animation.

## Engineering work to validate

- Use articulated character rigs, reusable animation states and contact-aware pose adjustment. Select tools and exact implementation after the final character/furniture assets are available; no physics engine is committed by this document.
- Couple locomotion to the authoritative movement path and speed. The present motion lab uses a preset route and time-driven poses, so it is not evidence that multiplayer pathing and planted-foot contact are solved.
- Define interaction anchors, supported dimensions, approach points and exit clearance on usable furniture. Reject unreachable or incompatible actions rather than forcing a clipped pose.
- Reconcile client presentation with server position, permissions, occupancy and action state. Avoid abrupt corrections during normal operation; network-failure fallbacks need separate validation.
- Furniture reclaim/edit while occupied needs a graceful stand-up/clearance transition where possible. The existing local app's immediate safe relocation is a fallback prototype behavior, not an approved final realistic animation.
- Keep muted microphones/camera choices through the already-approved consented voice-follow flow. Movement realism changes neither media consent nor activity privacy.
- Validate normal and reduced-motion presentation across avatar proportions, furniture variants and supported devices. Measure frame rate and performance after representative final assets are integrated; the current samples do not establish a production performance guarantee.

## Review sequence

First validate walking/turning/stopping and a connected doorway. Then validate one chair and one bed/sofa interaction for both proportions. After those pass, expand to study/work/gaming/eating actions and the furniture catalog. Do not mark the motion system complete solely because a single demonstration loop looks smooth.
