# Twisitter privacy policy

Last updated 2026-11-16. Twisitter is a browser extension that tells you when X
hides your replies from other people, and, when you ask, whether it hides
another account's. It runs entirely in your browser.

## What it reads, and from where

Twisitter talks to x.com and to nothing else: no analytics, no tracking. The
one thing that ever goes to a server of ours is a problem report, and only when
you send one (see "Problem reports" below).

- **As you**, with your own X login in this browser: your Replies tab, to learn
  about replies you post from X's apps; the replies under a post, to confirm
  that X shows you your own reply; and a reply opened directly, when you add
  one by its link. For a reply your second account wrote, the roles swap: the
  post, its replies, its hidden-replies page and the reply are read as you,
  and as your second account to confirm X shows it to its writer.
- **As your second X account**, if you connect one: a post and its replies
  (including the ones behind "Show probable spam"), the post's hidden-replies
  page, and a reply opened directly. These are the same pages anyone browsing X
  opens.
- **For an account check**, when you ask for one on another account's profile:
  the replies under each post that account answered, the post's hidden-replies
  page, and a reply opened directly. They're read as you, or as your second
  account when you follow, mute or block the account checked. That account's
  Replies tab is read only by X's own page, as you scroll it.
- **On x.com pages:** the replies you post there (from X's own answer to the
  page), the replies on another account's Replies tab that you open, the
  account the page is signed in as, and the request settings the page uses. On
  replies that X hides from others, it adds a note.

## What it keeps, and where

Only in your browser's extension storage:

- your X account's id and handle, and whether X is holding it back until it's
  sure a person runs it (X's "Unlock more on X");
- for each reply it watches: the reply's id and date, the id of the post it
  answers, its first 500 characters, and the results of its last 20 checks,
  such as where the reply sat among the others and X's own label for that
  place;
- for another account's Replies tab that you open: that account's id and
  handle, whether you follow, mute or block it and which of your accounts the
  page was signed in as (as X's page says), and the ids and dates of its
  replies to other accounts and of the posts they answer, for six hours, until
  you close the tab, or until the browser restarts;
- for each account check you ask for: each reply's id and date, the ids of the
  post it answers and of its writer, the result, such as "behind Show probable
  spam", and which of your accounts looked, for 30 days; and the latest check's
  progress, with the account it checked, also for 30 days;
- your second account's handle, id and X login cookies, and whether X was
  holding it back when it signed in, if you connect one;
- while that account signs in, a copy of your own X cookies, deleted once
  they're back in your browser;
- the request settings X's pages use, a count of recent reads, the state of
  each account's session, and which replies it has already told you about;
- a diagnostic log for problem reports, its newest 400 lines: when it checked
  and what the checks came to, how X answered its reads, and when a sign-in,
  an account check or an account's trouble began or ended. It has post ids,
  but no account's name or id, no cookies, and nothing your posts say.

## Your second account's login

You sign in on X's own login page, so Twisitter never sees your password or
two-factor code. While you sign in, your own X cookies are set aside in your
browser, and they're put back right after. The second account's cookies stay in
the extension. They're sent only to x.com, and only with Twisitter's own
requests.

## Problem reports

"Report a problem" in the popup opens a form on twisitter.com with the version,
your browser, a summary of how things stand and the diagnostic log filled in.
They travel in the page's address after the #, which browsers never send to a
server, and nothing leaves your browser until you send the form. You can leave
them out, and see everything they hold first. On Firefox 140 and later they
come along only if you allow Twisitter's "technical and interaction data",
which Firefox asks you about. They never include your X username, either
account's id, your sessions, or what your posts say. They do include post ids,
which lead to whoever wrote each post, and for your own replies that's you,
unless you tick "Hide post ids".

- **Sent privately**, a report goes to twisitter.com, which runs on
  Cloudflare. It's kept there, and filed as an issue in a private GitHub
  repository only the developer can read (GitHub emails the developer a copy),
  until the developer deletes it. Your X username and email go with it only if
  you type them in. So that no one address, or for IPv6 one network, can send
  more than five reports an hour, twisitter.com counts them by a one-way
  scrambled form of the address, never the address itself, and drops the count
  after two hours.
- **Posted publicly**, a report is a GitHub issue you file yourself, with your
  GitHub account, for anyone to read. The form fills it in, always with post
  ids hidden, and sends nothing to twisitter.com.

## What it never does

It never posts, deletes, likes, follows, blocks or changes settings on X.
Apart from a problem report you send, it sends nothing to anyone but x.com. It
doesn't sell or share data, and has none of yours outside your browser but the
reports you send.

## Removing your data

- **Disconnect** deletes the second account's cookies from the extension. X
  keeps that login session open until you end it in X's settings: Security and
  account access, then Apps and sessions, then Sessions.
- **Forget** removes a reply from the list.
- **Account checks** remove themselves: their results and the latest check's
  progress after 30 days, and what a tab scrolled after six hours, when you
  close the tab, or when the browser restarts. Twisitter clears these at
  least hourly while it runs.
- **A private report** you sent: send another one asking for it to be deleted,
  and say when you sent it.
- **Uninstalling** Twisitter deletes everything it kept, the diagnostic log
  included.

## Changes

Changes to this policy will be posted here, with their date.
