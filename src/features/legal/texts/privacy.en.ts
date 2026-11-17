// Текст документа — ADR-091. Перевод: при расхождении действует русский текст.
const text = `<!-- version: 2026-11-17 -->
# Privacy Policy

This policy explains what personal data KTTF (the kttf.kz website and the KTTF mobile app) collects, why, who can see it, where it is stored and how to delete it. It follows the Law of the Republic of Kazakhstan No. 94-V of 21 May 2013 "On Personal Data and Their Protection" (the "Law").

## 1. Who processes the data {#operator}

{{OPERATOR}}

KTTF is the table tennis platform of Kazakhstan: tournaments, rating, profiles of players, coaches and clubs, a forum and duels. It is free to use.

## 2. Consent {#consent}

When you sign up, you tick a box and thereby consent to the processing of your personal data under this policy. We store the date of your consent and the version of the policy you agreed to.

You can withdraw consent at any time: delete your account in the settings (section 9) or write to {{EMAIL}}.

## 3. What data we collect {#data}

**Account:**

- phone number, login and password — the password is stored only as an irreversible hash, we never know the password itself;
- optionally — email and Telegram ID;
- interface language, sign-up date, time of last visit;
- the date and version of your consent to this policy.

**Player profile:**

- last name, first name, optionally — patronymic;
- year of birth, optionally — full date of birth;
- gender, city, club, photo;
- coach, playing hand, grip, equipment, an "about me" text;
- rating, tournament and duel results, match history.

**Coach page:** photo, description, education, achievements, contact details (phone, WhatsApp, Telegram, Instagram), trainings and prices, scans of education and qualification documents.

**What you publish yourself:** forum posts and photos, likes, follows, reports, duel offers and responses, trial training requests (who will train, child's age, preferred time, comment), club connection requests.

**Tournaments:** registration, place in the group and bracket, match scores, a mark that the entry fee has been paid.

**Technical data:**

- browser or device type — to list your active sessions;
- IP address — to protect against password guessing and spam; the database stores only its irreversible hash;
- web server logs (IP address, time, page address) — for security and troubleshooting, kept for a limited time.

Page view statistics for clubs and coaches are daily counters without IP addresses or cookies.

## 4. Why we do it {#purposes}

- To run your account, sign you in and protect it from hacking.
- To run tournaments: registration, draw, scores, results.
- To calculate the rating and show match history.
- To show profiles of players, coaches and clubs, and to run the forum and duels.
- To pass a trial training request to the club or coach you chose.
- To answer requests and comply with the law.

There are no ads, no analytics or advertising cookies, no third-party trackers, and we do not sell data.

## 5. What other people can see {#public}

Tournament results, rating and sports statistics are public: that is what a rating is.

**Visible to everyone:** last and first name, city, club, photo, rating, results, equipment, "about me", year of birth.

**Depending on your settings:** full date of birth (by default only the year), coach.

**Visible only to participants:**

- your contact in a duel — to your opponent;
- your name and phone from a training request — to the club or coach you sent it to;
- the entry fee mark — to the tournament organizer.

Coach document scans are not published: only the page owner and KTTF administrators see them.

## 6. Who we share data with {#recipients}

- **Hosting provider PS.kz** — stores the data on servers in Kazakhstan on our behalf.
- **Clubs, coaches and tournament organizers** — to the extent described in section 5.
- **YouTube (Google)** — only if you click a video: the video is then loaded from youtube-nocookie.com and Google receives your IP address under its own rules. Until you click, YouTube learns nothing about you.
- **Government authorities** — only in the cases and manner directly provided for by the laws of the Republic of Kazakhstan.

Emails to {{EMAIL}} go through the Gmail service.

## 7. Where and how data is stored {#storage}

KTTF databases and files are hosted on servers in the Republic of Kazakhstan, as required by the Law.

Data is transmitted over a secure connection (HTTPS). Only the operators have access to it, and only to run the platform.

Your browser or phone stores the sign-in token and the referee console data for offline work. They are removed when you sign out or together with the browser or app data.

## 8. How long we keep data {#retention}

- Account and profile — until you delete the account.
- Sign-in session — up to 90 days without signing in.
- Notifications — 90 days.
- After the account is deleted, tournament results, rating and match history remain as anonymized sports statistics: under the name "Deleted player", with no photo or personal details. Without them the rating could not be recalculated and opponents' results would not stay fair.
- Club connection requests are kept as business correspondence and deleted on request.

## 9. How to delete your account {#account-deletion}

In the account settings, open "Delete account" and confirm with your password. You can do the same in the mobile app. Deletion is immediate and irreversible.

**Deleted:** phone number, login, password, email, Telegram ID, player profile, photo, coach page with scans, training requests, follows, notifications and sessions. Your forum posts are erased, and a "deleted" mark stays in their place.

**What remains** is only the sports statistics under the name "Deleted player" (section 8).

After deletion the phone number is free for a new sign-up, but the old history will not return to the new account.

If you cannot sign in, write to {{EMAIL}} from the phone number or email linked to the account.

## 10. Players added by an organizer {#organizer-profiles}

A tournament organizer can add a player profile without an account: last name, first name, year of birth, gender, city, club. The organizer is responsible for having the consent of the player, or, for a minor, of the player's legal representative.

If you were added without your consent, write to {{EMAIL}}: we will anonymize the profile the same way as when an account is deleted.

## 11. Children {#minors}

If you are under 18, consent to the processing of your data is given by your legal representative — a parent, adoptive parent or guardian. The legal representative may withdraw consent at any time by writing to {{EMAIL}}.

## 12. Your rights {#rights}

Under the Law, you have the right to:

- know whether we hold your data, what data and why we process it;
- receive a copy of it;
- correct and complete it — most of it you can change yourself in the settings;
- demand blocking and deletion of data processed in breach of the law;
- withdraw consent — delete your account;
- appeal our actions to the authorized body for personal data protection or to a court.

Write to {{EMAIL}}. We will reply within the time limits set by the laws of the Republic of Kazakhstan.

## 13. Data breaches {#breach}

We protect data with organizational and technical measures. In the event of unauthorized access to personal data, we will notify the authorized body and the affected users in the manner and within the time limits set by law.

## 14. Changes to the policy {#changes}

The policy has a version date shown at the top of the page. If we change the policy, the new version will appear here. If the purposes of processing change, we will ask for your consent again.

## 15. Contacts {#contacts}

All questions about personal data — {{EMAIL}}.
`;

export default text;
