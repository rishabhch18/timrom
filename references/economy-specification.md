# One World — XP, coins and ownership

Version 0.4 · 29 September 2026 · Product specification, not a live payment system.

## Confirmed rules

| System | Earn/acquire | Purpose | Spent? |
|---|---|---|---|
| XP | All authenticated connected app time, including idle/background time | Progress toward levels and unlock item eligibility | Never |
| Coins | Voice chat, text chat and interactive activities; optional purchase with real money | Buy eligible home/room items | Yes |
| Furniture inventory | Purchase one or more copies with coins | Place owned objects in a home or room | Each copy supports one active placement |
| Themes, colors, textures | One coin purchase after required unlock | Repeatedly apply that finish | No per-use charge |

An unlock means **eligible to purchase**, not already owned. A payment means more coins, not more XP. Paid and earned coins can fund an eligible item; retain their provenance internally for payment support. The basic custom builder and its agreed starter inventory remain free.

Illustration only, not approved pricing: a chair requires Level 3 and costs 100 coins. At Level 2, even 1,000 purchased coins cannot buy it. At Level 3, paying 100 coins adds one chair copy. Buying a second copy costs another 100 coins. Neither purchase changes XP. A bought wall texture can be applied repeatedly without buying another copy.

## Logged-in time

All connected authenticated time counts for XP; no activity-only rule, idle penalty, sleep exclusion or daily cap has been approved. Count overlapping tabs/devices once per account. Current interpretation excludes time after the app is closed even if the login cookie is still valid. Network/suspension grace rules remain to be specified. Online time alone earns XP, not coins. Coin grants need a qualifying voice-chat, text-chat or activity event/window under the still-to-be-agreed policy. Neither numerical rate has been approved.

## Catalog and inventory experience

Item cards show a preview, required level, coin price and ownership type: “1 furniture copy” or “Reusable finish.” Relevant states are level-locked, eligible, insufficient coins, purchasable, purchase pending, owned/inventory count and unavailable.

- Level-locked items show the requirement and progress; buying coins must not imply it removes the lock.
- Insufficient coins shows the shortfall and choices to earn coins or view coin packs.
- A furniture purchase confirms quantity, total coin cost and resulting balance. A unique owned copy may be stored or placed, moved or rotated. Storing/moving does not consume it or require another purchase.
- A reusable finish shows “Owned · Apply”; block redundant purchases. Eligibility and ownership are distinct from placement permission in someone else's home.
- Free starter items are clearly marked and need no real-money purchase. Exact free allowances are open.
- Removing furniture from a room returns it to inventory. Destruction, selling, gifting and trading are not currently specified.

Each furniture instance must have at most one active placement across the world. **Personal ownership is the default.** An item stays with the purchaser even when placed in a shared home unless they explicitly select **Donate to home**. Placement permission does not grant ownership, and a home moderator cannot donate another user's furniture.

Both **Donate** and **Lend** are included from the first release (founder confirmed). They are separate actions, not two names for the same transfer.

| Action | Owner after action | Home can do | Recovery |
|---|---|---|---|
| Donate | Home | Place and manage the donated copy | No routine donor reclaim; permanent transfer with explicit confirmation |
| Lend | Original purchaser | Place/use the specific loaned copy under home build permissions | Lender can request return; home can return it |

The ordinary meaning of these actions is the working design: donation is permanent; lending is temporary and preserves ownership. Proposed defaults, not separately approved: lender may reclaim at any time; no fixed term or fee; home can return early; receiving-home authorization is checked. A borrower cannot sell, donate, destroy, re-lend or copy a loaned item. One furniture instance can have at most one active home loan and one placement. It is unavailable for placement elsewhere until returned.

The inventory shows separate sections for Mine, Lent to homes, Home-owned and Borrowed, with owner/destination labels. Before donation, confirmation names the item/home and says ownership transfers permanently. Before lending, show that ownership stays personal and the item can be recalled. Simply placing an item is neither donation nor an implicit loan: the user chooses the sharing mode.

Proposed return flow: owner selects Reclaim or host selects Return → prevent new interactions with that copy → safely stand/move any occupant to a valid floor tile → remove active placement → close the loan → return the same instance to the personal inventory → notify both parties. If safe repositioning is temporarily unavailable, keep the item in a visible return-pending state; do not erase it, duplicate it or trap a seated avatar. Exact animation/timing is not settled.

Proposed leave/ban behavior: end the member's loans and return their personally owned copies; donated furniture remains home-owned. Reclaim should be available from personal inventory without requiring entry to a home that banned the lender. Home deletion returns borrowed copies; handling permanently donated assets on deletion and ownership succession still needs a policy. No user-to-user coin transfers, rental fees or cash payouts are implied.

## Coin-pack purchase experience

Wallet shows balance, earned/purchased transaction history and coin packs. Pack cards show exact coins received, full payable INR amount and any bonus separately. No pack values, exchange rate, discounts, expiration or purchase limits are approved.

Flow: choose pack → review total and applicable terms → provider checkout → payment processing → confirmed coin credit → receipt/history. No payment credentials are collected directly by our own UI when using hosted checkout. Clearly distinguish payment confirmed from coins still being credited. A pending result should lead to status/reconciliation, not pressure to pay again.

A server-verified successful payment credits coins exactly once. A browser callback alone does not grant currency. All item debits and inventory grants are atomic and idempotent. Prices and eligibility are read from the server, never accepted from the client.

Refund eligibility, partial refunds, already-spent purchased coins and payment disputes require explicit policies. Preserve links between payments, coin credits and spends. No promise of cash redemption, coin transfers or real-money trading is made. Provider eligibility and the treatment of purchased virtual currency need review before selling; no legal exemption is assumed.

## Teen accounts and later mobile clients

The product is 13+ with separate teen/adult spaces. Spending permissions, guardian involvement, limits, receipts and refund handling for teen accounts are still open product decisions, to be reviewed against applicable requirements before release. Avoid misleading coin-pack messaging or mechanisms that pressure users to buy for social access. Core privacy and safety features remain free.

Web checkout comes first. Mobile billing and entitlement synchronization need their own design once iOS/Android distribution is selected; do not assume the web payment method is allowed in every store/channel.

## Decisions still needed

1. Receiving-home acceptance, confirmation of reclaim/leave defaults, and donated-asset handling on home deletion/succession. Both Donate and Lend are confirmed for the first release.
2. XP rate, level thresholds and how all-time accrual interacts with connection loss.
3. Voice/text/activity earning qualification, rates, overlap/caps; coin pack quantities/INR prices; catalog prices.
4. Free starter catalog and furniture quantities.
5. Teen purchase permissions and spending limits.
6. Refund/dispute rules; purchased/earned spending order; any expiration policy.
7. Whether paid top-ups are included in the first beta or introduced after the free economy is tested.

The architecture document contains the planned payment verification, ledger and inventory consistency design. No provider account, paid service, live checkout or financial transaction has been created.

## Coin-earning policy under discussion

The source separation and participation-window chat rewards with spam checks are approved. Exact qualification, window length, rates and limits remain open.

| Source | Candidate rule | Question still open |
|---|---|---|
| Online presence | XP only, never a standalone coin award | Reconnection/suspension grace for online time |
| Text chat | Confirmed: participation time windows with spam checks, not per-message awards | Which spaces qualify; repeated/deleted messages and daily limits |
| Voice chat | Eligible participation windows using minimal session metadata | Does quiet listening count? Is another person required? |
| Activities | Reward selected qualifying activity sessions | Which categories qualify; offline/manual entries and completion criteria |
| Simultaneous sources | Proposed one combined participation window to limit multiplying rewards | Stack sources or award once? |

A reward system should not require recording/transcribing conversations to prove participation. Avoid paying more for speaking loudly or constantly; quiet users should understand what qualifies. Do not disclose private activity contents in reward logs or to home owners. Spam checks may use rate/duplication signals, but must be specified and tested rather than claimed as solved. Activity duration is self-reported/room-mapped and is not evidence of real-world productivity.

Policy comparison retained as rationale; participation windows are now selected for chat:

- **Per-event awards:** simple to explain, but per-message rewards encourage extra messages and demand more abuse controls.
- **Participation windows:** slower, clearer economy control; requires visible qualification and progress so users are not confused about missed awards.
- **Session completion rewards:** suitable for activities; must account for interrupted sessions and accessibility without encouraging fake completions.

Do not apply an unapproved idle exclusion or coin cap to XP. XP continues to follow the founder's all-online-time rule.

## Revision 0.4 — interactive activities and local implementation

Founder clarified that **all activities/time count for XP, while interactive activities can earn coins**. Passive sleep, rest, eating and bathroom/private-break tracking alone do not qualify for coins. An actual chat or shared call during such an activity can qualify through its own participation rule. No user must make their activity public to earn.

Default selected for the local build: donation is permanent and requires a review confirmation; lending keeps personal ownership and supports lender reclaim/host return without a fee or expiry. Ordinary room departure leaves the loan active. A ban returns the banned member’s loans. Home deletion is not implemented.

[The application README](one-world/README.md) specifies the exact trial rules: 1 XP/minute, a level every 10 XP, 120 welcome trial coins, and at most 2 coins per 60-second participation window. These are implementation defaults for testing, not founder-approved final economics. Shared-call membership and matching declared group activities are weak proxies; farming prevention remains incomplete.

Server tests cover atomic/idempotent item purchases, level gates, duplicate themes, one-copy placement, private activity visibility, reward windows, donation permanence and reclaim of occupied furniture. No real-money payment credit, refund, chargeback, earned/purchased coin provenance or financial transaction exists in this app.
