from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Image,
                                PageBreak, Table, TableStyle, KeepTogether, NextPageTemplate)

ACC = colors.HexColor('#7B78D0'); INK = colors.HexColor('#2E2945'); INK2 = colors.HexColor('#645D80')
SOFT = colors.HexColor('#EEEDFB'); PEACH = colors.HexColor('#FCE9DC'); LINE = colors.HexColor('#E3DCEB')
W, H = A4; M = 18 * mm; CW = W - 2 * M

st = {
    'h1': ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=20, leading=24, textColor=INK, spaceBefore=4, spaceAfter=6),
    'h2': ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=13, leading=16, textColor=ACC, spaceBefore=10, spaceAfter=4),
    'eyebrow': ParagraphStyle('eb', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=INK2, spaceAfter=2),
    'body': ParagraphStyle('b', fontName='Helvetica', fontSize=9.6, leading=13.6, textColor=INK, spaceAfter=4),
    'bul': ParagraphStyle('bl', fontName='Helvetica', fontSize=9.4, leading=13, textColor=INK, leftIndent=11, bulletIndent=2, spaceAfter=1.5),
    'cap': ParagraphStyle('c', fontName='Helvetica-Oblique', fontSize=8, leading=10, textColor=INK2, alignment=TA_CENTER, spaceBefore=3, spaceAfter=8),
    'cell': ParagraphStyle('ce', fontName='Helvetica', fontSize=8.6, leading=11, textColor=INK),
    'cellb': ParagraphStyle('cb', fontName='Helvetica-Bold', fontSize=8.6, leading=11, textColor=INK),
}
SHOT = 'shots/'

def P(t, s='body'): return Paragraph(t, st[s])
def B(items): return [Paragraph(i, st['bul'], bulletText='•') for i in items]
def img(name, cap, w=CW, keep=True):
    im = Image(SHOT + name + '.jpg', width=w, height=w * 500 / 800)
    im.hAlign = 'CENTER'
    t = Table([[im]], colWidths=[w]); t.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 0.6, LINE), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0)]))
    return KeepTogether([t, P(cap, 'cap')]) if keep else [t, P(cap, 'cap')]
def pair(a, ca, b, cb):
    w = (CW - 6 * mm) / 2
    t = Table([[img(a, ca, w, False), img(b, cb, w, False)]], colWidths=[w + 3 * mm, w + 3 * mm])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0)]))
    return t
def table(rows, widths):
    data = [[Paragraph(c, st['cellb' if i == 0 else 'cell']) for c in r] for i, r in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), SOFT), ('GRID', (0, 0), (-1, -1), 0.5, LINE), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                           ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    return t
def section(n, title, sub=None):
    out = [P(f'SECTION {n}', 'eyebrow'), P(title, 'h1')]
    if sub: out.append(P(sub))
    return out

def cover(c, d):
    c.saveState()
    c.setFillColor(PEACH); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(ACC); c.circle(M + 9 * mm, H - 40 * mm, 9 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white); c.setFont('Helvetica-Bold', 14); c.drawCentredString(M + 9 * mm, H - 42.5 * mm, 'T')
    c.setFillColor(INK); c.setFont('Helvetica-Bold', 40); c.drawString(M, H - 70 * mm, 'Timrom')
    c.setFont('Helvetica', 15); c.setFillColor(INK2); c.drawString(M, H - 80 * mm, 'Your time builds a home.')
    c.setFont('Helvetica-Bold', 12); c.setFillColor(ACC); c.drawString(M, H - 94 * mm, 'COMPLETE FEATURE GUIDE  ·  PROTOTYPE, SEPTEMBER 2026')
    c.drawImage(SHOT + '01_home.jpg', M, H - 212 * mm, width=CW, height=CW * 500 / 800)
    c.setStrokeColor(LINE); c.rect(M, H - 212 * mm, CW, CW * 500 / 800, fill=0, stroke=1)
    c.setFont('Helvetica', 10); c.setFillColor(INK)
    y = 62 * mm
    for line in ['A cozy 3D focus-timer world. Every minute you spend studying, working, cooking, resting,',
                 'getting ready, relaxing or going outside earns coins. Coins decorate your home, grow your pet',
                 'and unlock music and themes. Friends live next door, and everyone meets in the park.']:
        c.drawString(M, y, line); y -= 5.2 * mm
    c.setFont('Helvetica', 9); c.setFillColor(INK2)
    c.drawString(M, 24 * mm, 'Live prototype: https://claude.ai/artifact/8BrMsgVY3CFedUqpcXtMm1')
    c.restoreState()

def page(c, d):
    c.saveState()
    c.setFillColor(PEACH); c.rect(0, H - 11 * mm, W, 11 * mm, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont('Helvetica-Bold', 9); c.drawString(M, H - 7 * mm, 'Timrom')
    c.setFont('Helvetica', 8); c.setFillColor(INK2); c.drawRightString(W - M, H - 7 * mm, 'Complete Feature Guide')
    c.drawCentredString(W / 2, 9 * mm, str(d.page))
    c.restoreState()

doc = BaseDocTemplate('Timrom_Feature_Guide.pdf', pagesize=A4, leftMargin=M, rightMargin=M, topMargin=17 * mm, bottomMargin=16 * mm,
                      title='Timrom Complete Feature Guide', author='Timrom')
fr = Frame(M, 16 * mm, CW, H - 33 * mm, id='f')
doc.addPageTemplates([PageTemplate('cover', [Frame(M, M, CW, H - 2 * M)], onPage=cover), PageTemplate('main', [fr], onPage=page)])

s = [NextPageTemplate('main'), PageBreak()]

# ---- contents
s += [P('Contents', 'h1')]
toc = ['1. The big idea', '2. The screen at a glance', '3. Your 3D home', '4. Starting a timer', '5. The six activities',
       '6. Running a session', '7. Coins, streaks and Great Days', '8. Today panel: goals, life balance, week, pets',
       '9. Mailbox (to-do list)', '10. Memory book', '11. Build & buy: furniture', '12. Themes, walls and floors', '13. Pets',
       '14. Music player', '15. Household (your people)', '16. Settings', '17. Time of day', '18. The neighbourhood',
       '19. The park', '20. Chat', '21. Live multiplayer and saving', '22. Motion, design and accessibility',
       '23. What is not built yet']
s += B(toc)
s += [PageBreak()]

# ---- 1
s += section(1, 'The big idea', 'Timrom turns your real day into a home you build. It follows the original concept document and the visual style of the reference site, with our own house design, a TV, and a social layer added on top.')
s += [P('How it works', 'h2')]
s += [table([['Step', 'What happens'],
             ['1. Tap a room', 'Pick an object in your house: desk, stove, bed, bath, TV or front door. Each one is an activity.'],
             ['2. Set a timer', 'Choose what it is for and how long. Your character walks there and does the activity while the clock runs.'],
             ['3. Earn and build', 'Finishing earns coins. Spend them on furniture, themes, music and pets. Your pet grows as you log time.'],
             ['4. Share the world', 'See your neighbours, chat with them, and meet anyone online in the park with your pets.']],
            [32 * mm, CW - 32 * mm])]
s += [P('The four views', 'h2')]
s += [table([['View', 'What it is for'],
             ['Home', 'Your 3D house. Start timers, see your stats, mailbox and memory book.'],
             ['Build & buy', 'The shop. Furniture, walls, floors, themes, music and pets.'],
             ['Neighbourhood', 'Floating islands with your friends\' houses and what they are doing right now.'],
             ['Park', 'A shared outdoor space. Walk around with your pets, meet neighbours and real people, chat.']],
            [32 * mm, CW - 32 * mm])]

# ---- 2
s += [PageBreak()] + section(2, 'The screen at a glance')
s += [img('01_home', 'The Home view in daytime: top bar, 3D stage, side panel and bottom dock.')]
s += [P('Top bar', 'h2')] + B([
    '<b>Timrom logo</b> with the tagline "Your time builds a home".',
    '<b>View tabs:</b> Home, Build & buy, Neighbourhood, Park. A small pulsing dot on Home means a timer is running.',
    '<b>Streak chip</b> (flame): how many Great Days in a row you have had.',
    '<b>Coin chip:</b> your coins. It bumps and counts up when coins fly in.',
    '<b>Messages button</b> with a red unread badge, and the <b>Settings</b> gear.'])
s += [P('Bottom dock', 'h2')] + B([
    '<b>Household:</b> round avatars for you and the people in your home, plus a "+" to add someone.',
    '<b>Timer bar:</b> pause and stop buttons, the activity label, a big clock, a progress line, the speed toggle and the time-of-day button. When nothing is running it shows the day and current time.',
    '<b>Music:</b> a live visualiser, the track name, track list, previous, play/pause and next.'])
s += [P('On the stage', 'h2')] + B([
    '<b>Home card</b> (top left): your home\'s name and what you are doing, with time left.',
    '<b>Clock and weather</b> (top right): current time and whether it is morning, day, evening or night.',
    '<b>Hint card</b> (bottom left) for first-time users. It can be dismissed and stays gone.',
    '<b>View controls</b> (bottom right): zoom out, zoom in, rotate 90°, recenter.'])

# ---- 3
s += [PageBreak()] + section(3, 'Your 3D home', 'A real-time 3D house rendered in the browser with soft shadows, filmic tone mapping and rounded, toy-like furniture in a pastel palette.')
s += [table([['Room', 'What is in it'],
             ['Study', 'Desk with monitor, desk lamp, books and a mug, an office chair, and a window.'],
             ['Kitchen', 'Counters with a stove, sink, kettle and a pot, upper cabinets, a fridge, a window, and a round dining table with two chairs and a fruit bowl.'],
             ['Bedroom', 'Bed with a coloured duvet and pillows, a nightstand lamp, a dresser, and a window.'],
             ['Bathroom', 'Vanity sink with a round mirror, toilet, bathtub with water and a rubber duck, and a bath mat.'],
             ['Living room', 'TV on a console with a plant, a sofa with cushions, a coffee table, a round rug, a monstera and a pet bed.'],
             ['Front door', 'A hinged door in the theme colour with a round window, a porch step and a doormat.'],
             ['Garden', 'Five swaying trees, bushes, a flower bed, a bench, a lamp post, a stone path, a mailbox with a flag, and a picket fence with a gate.']],
            [28 * mm, CW - 28 * mm])]
s += [P('Small details', 'h2')] + B([
    '<b>Build-in intro:</b> on load the camera swoops in, the island rises, walls grow up and furniture drops in with a bounce. Trees and garden pieces pop in last.',
    '<b>Floating pins</b> over every activity object. Hover to reveal the name; they are keyboard-focusable buttons too.',
    '<b>Hover glow:</b> activity objects light up softly in the accent colour under the mouse.',
    '<b>Camera:</b> drag to orbit, scroll or pinch to zoom, right-drag to pan, with smooth damping and limits so you cannot lose the house.',
    '<b>Ambient motion:</b> clouds drift and cast moving shadows, trees sway, light motes float, and characters blink and breathe.',
    '<b>Who lives here:</b> your character, Jules (a sample partner at the dining table) and Mochi the cat, who wanders and follows you.',
    '<b>Speech bubbles</b> above your character: "Welcome home", "Life is good", "Tea time soon" when idle.',
    '<b>Tap your pet</b> and it hops, with a message saying how grown it is.'])

# ---- 4
s += [PageBreak()] + section(4, 'Starting a timer')
s += [img('02_desk_card', 'Tapping the desk opens its activity card, anchored to the object.')]
s += B([
    '<b>What for:</b> the desk offers Study or Work. Other objects have one category each.',
    '<b>How long:</b> five preset lengths per object (for example 15, 25, 45 min, 1h, 1h 30m at the desk; up to 8h for the bed).',
    '<b>Reward preview:</b> shows the coins you will earn, including your streak bonus or the Great Day 2×.',
    '<b>Start button</b> names the exact length, for example "Start 25-minute timer".',
    'If a session is already running, the card instead shows the time left and coins earned so far, with <b>Keep going</b> or <b>End and collect</b>.',
    'The card pops in with a spring animation, follows the object as you move the camera, and closes with Esc or the X.'])

# ---- 5
s += [PageBreak()] + section(5, 'The six activities', 'Every object maps to a part of your day. Your character walks there along a real path around furniture, then settles into a matching pose.')
s += [table([['Object', 'Category', 'What your character does'],
             ['Study desk', 'Study or Work', 'Sits and types; the monitor brightens.'],
             ['Kitchen stove', 'Food', 'Stands and stirs; burners glow orange and steam rises from the pot.'],
             ['Bed', 'Rest', 'Lies down under the duvet with eyes closed and slow breathing.'],
             ['Bathroom', 'Self-care', 'Stands at the mirror brushing teeth.'],
             ['TV and couch', 'Fun', 'Sits on the sofa; the TV plays an animated scene and casts flickering blue light.'],
             ['Front door', 'Outside', 'Opens the door, walks down the path, out of the gate and disappears. Comes back when the timer ends.']],
            [30 * mm, 26 * mm, CW - 56 * mm])]
s += [Spacer(1, 6), pair('03_study', 'Studying at the desk, with the timer ring above.', '04_cook', 'Cooking at the stove.')]
s += [pair('05_sleep', 'Resting in bed.', '07_bath', 'Self-care at the bathroom mirror.')]
s += [img('06_tv_night', 'Watching TV at night: the screen glows and windows light up.', CW * 0.8)]

# ---- 6
s += [PageBreak()] + section(6, 'Running a session')
s += B([
    '<b>Timer ring bubble</b> above your character shows the time left and category, with a ring that fills up.',
    '<b>Pause / resume</b> from the dock. Your character says "Quick break" or "Back to it".',
    '<b>Stop</b> ends early and pays for every full minute done. Under one minute, nothing is logged, and a message says so.',
    '<b>Finishing</b> logs the minutes to that category, pays coins, adds pet growth and counts a session. Coins burst from your character and fly into the coin counter.',
    '<b>After a session</b> your character stands up, walks back to the living room and waves.',
    '<b>Survives reloads:</b> close the tab mid-session and it resumes with the right time left, your character already in place.',
    '<b>Speed toggle:</b> "60× demo" (one second counts as one minute, for showing the app) or "Real time".',
    '<b>Status everywhere:</b> the home card, dock label, mood line ("Focused · Studying") and the pulsing dot on the Home tab all update.'])

# ---- 7
s += section(7, 'Coins, streaks and Great Days')
s += [table([['Rule', 'How it works'],
             ['Base rate', '1 coin for every minute logged, in any category.'],
             ['Streak bonus', '+5% per Great Day in a row, up to +50%. Shown on the reward preview and the Today panel.'],
             ['Great Day', 'Reach your daily goal (2 hours by default). The coins you already earned that day are doubled right away, and every session after that pays 2×.'],
             ['Celebration', 'Confetti, a big coin burst, a toast message, and an automatic memory-book entry.'],
             ['Streak rules', 'Continues if yesterday or today was a Great Day; resets after a missed day.'],
             ['Other coins', '5 coins for each mailbox letter you check off.']],
            [30 * mm, CW - 30 * mm])]

# ---- 8
s += [PageBreak()] + section(8, 'Today panel: goals, life balance, week, pets')
s += [pair('01_home', 'Great Day ring, coin multiplier and life balance.', '10_week_pets', 'This-week chart and the pets card.')]
s += B([
    '<b>Profile:</b> your avatar, name, total sessions and total time, plus a mood line (Feeling cozy, On track, Having a Great Day, or Focused).',
    '<b>Great Day ring:</b> minutes today out of your goal, how many are left, and a chip with your current multiplier and streak.',
    '<b>Life balance bar</b> in seven colours: Work, Study, Food, Rest, Self-care, Fun and Outside, with minutes for each.',
    '<b>Insight line:</b> tells you what took most of your day and nudges you, for example "Time outside is low. A short walk from the front door would balance it."',
    '<b>This week:</b> a stacked bar per day, a dashed goal line and gold dots on Great Days. Earlier days in the preview are labelled as example data.',
    '<b>Your pets:</b> each pet\'s 3D portrait, stage (Baby, Young, Grown at 0, 60 and 300 minutes), minutes to the next stage and a growth bar. The pet in the house visibly grows with a springy animation.'])

# ---- 9, 10
s += [PageBreak()] + section(9, 'Mailbox (to-do list)')
s += [pair('08_mail', 'The mailbox tab.', '09_memory', 'The memory book tab.')]
s += B([
    'Tasks are "letters". Type one and it drops into the list; the 3D mailbox does a little bounce.',
    'Tap the stamp to check it off: it fills green with a pop, earns 5 coins once, and coins fly from the letter.',
    'Done letters move to a "Delivered" list. Hover to reveal a delete button.',
    'The mailbox in the garden has a red flag that is <b>up</b> when you have open letters and drops when all are done. Tap the mailbox or its pin to open this tab.',
    'The tab shows an unread-style count of open letters.'])
s += section(10, 'Memory book')
s += B([
    'A scrapbook of good moments. Write a note, pick a mood (Proud, Happy, Calm, Grateful) and save.',
    'Entries show the date, the mood tag and a little tape strip, like a real scrapbook.',
    'Great Days add an entry automatically, describing what most of the day went to.'])

# ---- 11
s += [PageBreak()] + section(11, 'Build & buy: furniture')
s += [img('11_build', 'The shop tray with 3D-rendered thumbnails and the item detail panel.')]
s += [table([['Item', 'Room', 'Coins'], ['Round rug', 'Living room', '60 (owned at start)'], ['Monstera', 'Living room', '80 (owned at start)'],
             ['Floor lamp', 'Living room', '120'], ['Bookshelf', 'Study', '180'], ['Reading chair', 'Study', '220'], ['Wall art', 'Bedroom', '90'],
             ['Fairy lights', 'Bedroom', '140'], ['Record player', 'Living room', '160'], ['Bean bag', 'Living room', '110']],
            [50 * mm, 50 * mm, CW - 100 * mm])]
s += B([
    'Thumbnails are rendered live from the same 3D models used in the house.',
    'Buying spends coins with a reverse coin animation, and the piece drops into its spot with a bounce. The camera glides over to it.',
    '<b>Glowing rings</b> on the floor mark empty spots for pieces you do not own; tap one to select that item.',
    'Owned pieces can be <b>put in storage</b> or <b>placed</b> again. Characters walk around new furniture automatically.',
    'The floor lamp and fairy lights add real lights at night; the record player\'s vinyl spins while music plays.',
    'A <b>collection meter</b> shows how many pieces you own and coins earned this week. Buttons say exactly how many coins you are short.'])

# ---- 12
s += [PageBreak()] + section(12, 'Themes, walls and floors')
s += [pair('12_theme', 'Sage theme: garden, trees, rug, door and app accent all change.', '13_floors', 'Walls and floors tab.')]
s += [table([['Type', 'Options', 'Coins'],
             ['Themes', 'Periwinkle (start), Sage, Apricot, Rose, Midnight', '150, Midnight 200'],
             ['Wall colours', 'Oat cream (start), Blush, Pale sage, Lilac haze, Butter', '40 each'],
             ['Floors', 'Honey oak (start), Walnut, Birch, Rosewood', '60 each']],
            [28 * mm, CW - 68 * mm, 40 * mm])]
s += B(['A theme recolours the whole world with a smooth fade: grass, soil, trees, bushes, fence, front door, duvet, rug and every accent in the interface.',
        'Walls repaint every room at once; floors change all the wooden rooms. Both fade in over about a second.'])

# ---- 13
s += section(13, 'Pets')
s += [img('14_pets_shop', 'Pets tab: the bunny is locked until 12 sessions.', CW * 0.8)]
s += B(['Everyone starts with <b>Mochi the cat</b>. The <b>Pup</b> (250 coins) unlocks at 5 sessions and the <b>Bunny</b> (300) at 12.',
        'You name a new pet before adopting. It appears with an elastic pop-in.',
        'Pets wander, follow you, rest in the pet bed when you are out, wag tails and bob when walking. They come with you to the park.'])

# ---- 14
s += [PageBreak()] + section(14, 'Music player')
s += [img('15_music', 'The radio list, also showing the house in the Sage theme.')]
s += B(['Lo-fi music is generated live in the browser: soft chord pads, bass, electric-piano melodies, gentle drums, vinyl crackle and optional rain. No audio files are needed.',
        'Six tracks: Rainy desk and Warm kettle (free), Sunday slow (80), Night bus (100), Lavender fields (120) and Porch light (150).',
        'Locked tracks play a 9-second preview. Previous and next skip through owned tracks. A volume slider and a 5-bar visualiser are included.'])

# ---- 15, 16
s += section(15, 'Household (your people)')
s += [pair('16_household', 'Adding someone to your home.', '17_settings', 'The settings sheet.')]
s += B(['Add a partner, best friend, family member, roommate or friend. Choose their name, skin tone, hair colour, hair style (short, long, bun) and outfit colour, with a live avatar preview.',
        'They move in as a 3D character with a pop animation and sit at the dining table, on the couch or on the garden bench.',
        'Tap an avatar in the dock to edit or remove them (removal asks you to tap twice). Tap your own avatar to change your name and look; your character rebuilds with a springy animation.'])
s += section(16, 'Settings')
s += B(['Your name, your daily goal for a Great Day (1h, 1h 30m, 2h, 3h, 4h) and timer speed (60× demo or real time).',
        'Reset all progress, with a second tap to confirm.'])

# ---- 17
s += [PageBreak()] + section(17, 'Time of day')
s += B(['The sky, sun direction, sun colour, shadows and exposure follow your real clock: morning (6-9), day (9-17), evening (17-20) and night.',
        'The sun button in the timer bar cycles Auto, Morning, Day, Evening and Night, with a smooth 2-second fade.',
        'At night, windows glow warm, lamps in every room and the lamp posts switch on, clouds dim and the motes turn golden (see the TV screenshot in section 5).'])

# ---- 18
s += section(18, 'The neighbourhood')
s += [pair('18_hood', 'Lilac Hill: friends\' floating islands linked by stepping stones.', '19_visit', 'Visiting Maya\'s house.')]
s += B(['Each friend has their own island with a house, roof colour, trees and their character walking around the yard.',
        'Floating labels show what each friend is doing right now ("Studying · 12m", "At the gym · 25m"). Their timers count down live and change activity when done.',
        'The side list shows each friend\'s status, minutes logged today and streak. Tap a house or name to fly over and visit; they wave.',
        '<b>Focus together:</b> from a friend\'s page, jump home to a study session at your desk labelled "with Maya".',
        '<b>Add a friend</b> by name (up to 7 houses): a new island rises into place.',
        'In this prototype the five neighbours are examples; the app says so.'])

# ---- 19
s += [PageBreak()] + section(19, 'The park', 'Lilac Hill Park is a shared outdoor space. Shown here in dark mode.')
s += [img('20_park', 'Entering the park with Mochi, past the arch and flower beds.')]
s += B(['<b>Layout:</b> entrance arch with a "Lilac Hill Park" sign and flowers, a two-tier fountain with falling water and ripples, a duck pond with lily pads and two swimming ducks, four benches, a picnic blanket with a basket, flower beds, lamp posts, trees, bushes and stone paths.',
        '<b>Moving:</b> click the grass to walk there (a ring marks the spot) or use W A S D / arrow keys. The camera follows you smoothly. Press Enter to chat.',
        '<b>Neighbours:</b> Maya with Biscuit the dog, Ines with Pepper the cat and Kai with Clover the bunny wander, sit on benches, wave hello and say things in speech bubbles. Tap one to message them.',
        '<b>Your pets</b> come with you and follow you around, speeding up to catch up.',
        '<b>Name tags</b> under everyone. <b>Wave</b> button makes your character wave for everyone to see.',
        '<b>Walk timer:</b> log the visit as 15-60 minutes outside, right from the park panel.',
        '<b>Here now</b> list: you, real people (tagged Live) and the example neighbours.'])

# ---- 20
s += [PageBreak()] + section(20, 'Chat')
s += [img('21_park_chat', 'General chat open in the park; the message appears as a bubble above your character.')]
s += B(['<b>#General:</b> one shared channel for everyone who opens Timrom. Messages arrive instantly for everyone.',
        '<b>Neighbour messages:</b> private threads with each neighbour. They show a typing indicator and reply based on what you said (study plans, park, feeling tired, thanks). Replies are simulated in this prototype.',
        '<b>Online now:</b> real people who have Timrom open, and whether they are at home or in the park. Tap to wave.',
        'Messages are grouped by sender and day, with avatars, names and times.',
        'Unread counts on each thread and a red badge on the Messages button. New messages pop up as toasts when the chat is closed.',
        'Anything you post in General also shows as a speech bubble over your character, at home or in the park.'])

# ---- 21
s += section(21, 'Live multiplayer and saving')
s += B(['<b>General chat</b> is stored in a shared database, so messages stay for everyone and load when someone opens the page.',
        '<b>Park presence:</b> each person\'s name, look, pets, position, speech bubble and waves are shared live. Other people\'s characters glide smoothly to where they are.',
        '<b>Who can join:</b> the prototype link is private. People need to be given access from the Share menu, and Contributor access to post in chat.',
        '<b>Offline preview:</b> if live features are not available, chat still works on your own device and the app says so.',
        '<b>Your progress</b> (coins, home, pets, letters, memories, stats) saves automatically in your browser.'])

# ---- 22
s += [PageBreak()] + section(22, 'Motion, design and accessibility')
s += B(['<b>Look:</b> pastel lavender and peach palette, Quicksand for headings and Figtree for text, soft rounded cards and a gentle vignette.',
        '<b>Motion:</b> spring pop-ins for cards and modals, bouncing furniture drops, flying coins, confetti, a count-up coin total, smooth camera flights between views, eased walking with a lean into turns.',
        '<b>Dark mode</b> follows your system setting.',
        '<b>Reduced motion:</b> if your system asks for less motion, intros and animations are skipped.',
        '<b>Phones:</b> the layout stacks on small screens, and the chat opens full screen.',
        '<b>Keyboard:</b> pins and controls are buttons with visible focus; Esc closes cards, pop-ups and chat.'])

# ---- 23
s += section(23, 'What is not built yet')
s += [table([['Not yet', 'What it needs'],
             ['Real friends and accounts', 'Sign-up, friend requests and cloud saving across devices. Neighbours are examples today.'],
             ['Private messages between real people', 'A backend with proper privacy. Today, direct messages are with example neighbours only.'],
             ['Voice, calls and streaming', 'A voice/video provider such as LiveKit or Agora, plus moderation tools.'],
             ['Mobile apps', 'Native iOS/Android builds, notifications and background timers.'],
             ['Moderation and safety', 'Reporting, blocking, filters and rules before opening chat to the public.']],
            [52 * mm, CW - 52 * mm])]

doc.build(s)
print('ok')
