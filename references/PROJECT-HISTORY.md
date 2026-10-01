# One World — product and local application

Updated 29 September 2026. Socializing and interaction are the main purpose; studying, working, gaming and other communities remain important parts of the same world.

## Open the working app

**[Local One World app](http://127.0.0.1:5173/)** — running while the development server is active.

[Application setup, implemented features and limitations](one-world/README.md) · [Source directory](one-world/) · [Connected-house preview](connected-home-preview.png)

This build has real local server state and persistent chat, homes, rooms, activities, XP, coins and inventory. Version 0.2 adds a connected 3D house, furniture actions, separate tracking consent and email/password or mobile test-code accounts. Email/SMS delivery is a labelled development stub. Real-money purchases are disabled. Live microphone/camera media still needs end-to-end testing.

## Product documents

- [Requirements and decision record](product-discovery.md)
- [Discord research, architecture and cost alternatives](research-and-architecture.md)
- [XP, coins, inventory and ownership specification](economy-specification.md)
- [Five avatar style concepts and prompts](avatar-samples/prompts.md)
- [Earlier visual exploration](exploration.html) — separate static simulation, retained as design reference

## Current implementation

[Local v0.2 implementation and verification notes](implementation-v0.2.md) distinguish working features from remaining production requirements.

## Latest decisions

- All connected online time, including every activity and sleep, earns XP. XP unlocks item eligibility and is never spent.
- Interactive participation earns coins in time windows; online presence or passive tracking alone does not.
- Coins purchase eligible items. Real-money coin purchases remain an approved future feature; trial coins in this local app cannot be bought, sold or redeemed.
- Furniture ownership is personal. Donation permanently transfers one copy to the home; lending preserves ownership with reclaim/return. Both are implemented locally.
- Social interaction leads the experience; study/work/game activities support it.

Trial rates and catalog prices are clearly labeled engineering defaults, not approved commercial prices. Teen and adult demo profiles use separate spaces; this is not age assurance or a public launch authorization.

## Visual work

The five generated avatar images remain **static concept/pose sheets**. **Soft sculpted is now the approved art direction.** Final production rigs/assets and physically believable interactions still need implementation and validation. The working app uses original schematic SVG avatars/furniture and movement transitions, not rigged versions of the concept art. The earlier exploration includes schematic movement/wave/rest demonstrations.

## Validation

19 domain and real WebSocket/HTTP tests pass. Production build passes. Browser checks cover home creation, chat, movement, capacity, activity and inventory flows plus the 390px mobile layout. Read the application README for the precise verification boundary and remaining work.

## New visual-world direction — revision 0.8

[Art and motion review board](http://127.0.0.1:8766/) · [Confirmed account and movement decisions](visual-review/decisions.md) · [Review setup](visual-review/README.md)

Three new avatar/room concepts and five live Three.js motion studies are available for review. The next product direction is private email/mobile login, unique usernames, connected rooms with automatic walking through doorways, an overhead following camera, visible side chat and opted-in voice following. These requirements supersede the earlier demo login/room-tab design, but have not been applied to the running multiplayer app yet. The user has now selected Soft sculpted and accepted the general motion style, with realistic physical behavior required. See [motion requirements](visual-review/motion-requirements.md).

## Motion scope — revision 0.9

Soft sculpted and the general motion direction are approved. Require grounded, collision-free, natural avatar movement and furniture-aligned activity transitions. Furniture stays fixed during ordinary use. Clicking furniture opens an icon action menu. Furniture-triggered activity tracking has a separate opt-in; without it actions remain visual. These are requirements for the next implementation, not claims that the present motion study solves contact, collision or all activity transitions.
