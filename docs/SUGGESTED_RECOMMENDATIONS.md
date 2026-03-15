# TuneTribe — Suggested Recommendations

Radical and practical ideas to make TuneTribe the definitive platform for organizing listening sessions.

---

## Core Experience

### 1. In-App Song Preview Player
Every song in the pool should have a 30-second Spotify preview that plays inline — no redirecting to Spotify. A persistent mini-player at the bottom of the screen lets attendees sample tracks before voting. This is the single most important feature: people won't vote on songs they've never heard.

### 2. Live Voting Leaderboard (Realtime)
Use Supabase Realtime to push vote updates live during the event. As attendees vote, the leaderboard reorders in real-time on everyone's screen simultaneously — like watching an election night board. Creates urgency and excitement in the room.

### 3. "Now Playing" Broadcast
The host can mark which song is currently playing. All attendees see a glowing "Now Playing" card at the top of their event page. When the song ends, it moves to a "Played" history section and the #2 song auto-promotes to the top. The crowd can see the setlist evolving live.

### 4. Vibe Match Score
When a user RSVPs to an event, show them a "% vibe match" score based on how much their Spotify listening history overlaps with the event's song pool genres. "87% match — this event is for you." Drives RSVPs from the right audience.

### 5. Song Discovery Mode ("Blind Listen")
Hide song titles and artist names during the voting swipe phase. Users vote purely on what they hear via the preview. Reveals the song identity after swiping. Removes bias against unfamiliar artists and surfaces hidden gems.

---

## Social & Community

### 6. Listener Profiles with Taste DNA
Each user gets a public "Taste DNA" page — a visual breakdown of their top genres, eras, moods, and listening habits synced from Spotify/Apple Music. Shown on event pages as "Who's coming and what they like." Hosts can see their audience before the event.

### 7. Song Nomination Reactions
Beyond just upvote/downvote swipes, let users react to nominations with contextual emojis: 🔥 (floor filler), 😭 (too sad), 🕺 (perfect vibe), 🙄 (overplayed). Aggregate reactions give hosts richer data than a simple vote count.

### 8. Guest Nomination Caps
Hosts can set a rule: "Each attendee can nominate up to 3 songs." Prevents one person from dominating the pool. Creates fairness and encourages everyone to participate thoughtfully.

### 9. Co-Host Mode
Two people can jointly curate the song pool with shared editing rights. Perfect for events with multiple DJs or organizers. Full edit access, separate identity on nominations.

### 10. Post-Event Recap
After an event ends, auto-generate a shareable recap: the final setlist, top voted songs, who nominated what, and a Spotify playlist link with all played songs. Share to Instagram Stories as a card. Creates lasting memory of the session.

---

## Discovery & Curation

### 11. AI-Assisted Pool Builder
Give the host a prompt box: "I want a cozy Sunday afternoon jazz session with some bossa nova and 70s soul." The AI generates an initial song pool of 20-30 tracks using genre/mood inference, which the host can then edit. Dramatically reduces curation time.

### 12. "Steal This Setlist" Public Templates
Hosts can publish their curated song pools as public templates with a name and vibe description. Other hosts can browse and clone a template as a starting point. A library of crowd-tested setlists for common event types: dinner party, house party, vinyl night, study session.

### 13. Era Explorer
A visual timeline UI in the host curator: a horizontal bar from 1950s to 2020s. Drag a range to filter songs by era. More intuitive than typing year numbers, and encourages hosts to think about decade-mixing intentionally.

### 14. Mood / Energy Filters
Filter songs by energy level and mood (Spotify provides these via their audio features API): Acoustic, Danceable, High Energy, Melancholic, Upbeat. Let hosts build a pool that flows — starting chill and building to peak energy — like a DJ set with structure.

### 15. Similar Artists Auto-Expand
When a host searches "Radiohead," offer a button: "Show similar artists too." Pulls in Thom Yorke, Portishead, Massive Attack. One click to broaden the pool without manual research.

---

## Event Experience

### 16. QR Code Entry & Voting
Each event gets a QR code. Attendees scan it on arrival to instantly join and start voting — no signup friction for casual guests. They vote as an anonymous "Guest" with a fun generated name (e.g., "Vinyl Ghost #4"). Optional upgrade prompt to create a full account.

### 17. The Veto Button (Host Override)
Hosts can veto any song from the leaderboard — remove it from play even if it's #1 — with a brief note visible to attendees ("Too slow for this moment"). Maintains host artistic control while keeping the process transparent. Prevents awkward or inappropriate songs from making it through.

### 18. Intermission Mode
Host can pause voting between "sets." During an intermission, the leaderboard is hidden and a countdown timer shows until voting reopens. Builds anticipation and gives the host a natural break structure.

### 19. "Last Song" Nomination
Near the end of the event, the host can open a special "Last Song" nomination round — everyone gets one final vote on the closing track. Makes the ending feel intentional and communal.

### 20. Event Mood Board
Alongside the song pool, hosts can attach a mood board: 3-5 image URLs that capture the vibe (a film still, an album cover, a photograph). Shown on the event page. Sets expectations beautifully and helps attendees understand the aesthetic before they vote.

---

## Retention & Growth

### 21. Recurring Event Continuity
For recurring events (e.g., "Every Friday Night"), carry over the top 5 songs from last session's leaderboard into the next week's starting pool. Creates ongoing community threads and rewards consistency.

### 22. Host Analytics Dashboard
After each event, show the host: total votes cast, most contested songs (close vote margins), most nominated artists, average session engagement time. Helps hosts learn what works for their audience over time.

### 23. Friend Invite Before Voting Opens
Hosts can set a "voting opens at" time — before that, they can share the event link and attendees can browse the song pool but not vote yet. During the pre-vote window, the app prompts: "Invite 2 friends to unlock an extra nomination slot." Viral loop.

### 24. Spotify Playlist Export
One-click: export the final voted setlist as a Spotify playlist, ordered by vote count. Automatically named after the event. Shared back with all attendees as a permanent memento. Also drives Spotify-connected signups.

### 25. City-Wide Listening Trends
A public "What's hot in [City]" page showing the most nominated and voted songs across all events in a city this week. Surfaces emerging local tastes, gives hosts cultural context, and creates a reason for non-event-goers to visit TuneTribe.

---

## Radical Differentiators (Big Bets)

### 26. Synchronized Listening Room (Online Events)
For remote listening sessions, build a virtual room where all attendees hear the same song at the same second — synchronized playback via Spotify Web Playback SDK. Vote on the next track while the current one plays. The first platform to combine real-time synchronization with democratic song selection.

### 27. "The Floor Decides" Mode
Remove the host entirely from the final setlist decision. Once the event starts, the leaderboard IS the setlist — songs are queued in real-time vote order and played automatically. Pure democracy. The host's only role is to seed the initial pool. Radical, transparent, and unlike any existing platform.

### 28. Listening Session Scoring (Gamification)
Every attendee earns a "session score" based on participation: nominations made, votes cast, songs that made it to the final set. Top scorer gets a "Tastemaker" badge shown on their profile. Leaderboard of top tastemakers in each city. Turns passive attendees into engaged community members.

### 29. Multi-Room Events
For large events (festivals, conferences), multiple simultaneous listening rooms — Room A: Jazz, Room B: Electronic, Room C: Hip-Hop. Attendees pick their room and vote independently. The app routes them to the right stage. Scales TuneTribe beyond small gatherings.

### 30. Collaborative Pre-Event Listening Party
48 hours before the event, open a shared "listening room" where RSVPed attendees can preview the nominated songs together in real-time and discuss via a minimal emoji-reaction chat. Builds anticipation, helps songs get more informed votes, and creates community before people even meet in person.
