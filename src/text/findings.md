# What X's own code says about your replies

X now publishes two things meant to show how it treats posts:
- **Under the Hood**, a monthly report on the labels X puts on your posts and
  your account.
- **The code** that decides what people see on X.

Neither one covers the question that matters for a reply: whether anyone else
sees it.

## Under the Hood has no labels for replies

Under the Hood (x.com/i/under_the_hood) shows an account the labels X put on
its posts and on the account in the past month. It's open to accounts at least
a year old with 10 or more posts in that month.

The labels it can report are a fixed list in X's code: 19 for posts and 12 for
accounts, plus legal takedowns. They cover adult content, graphic violence,
spam, malicious links, "do not amplify" and X's "freedom of speech, not reach"
limits.

None of them is about replies. There's no label for a reply filed under "Show
probable spam", and none for a reply left out of a post's replies. So a clean
report doesn't mean your replies are being shown.

## X scores replies, and the score only goes down

X's code gives replies to other people's posts a score from 0 to 3:
- Grok does the scoring when the account being answered, or the one that started
  the thread, has more than 250,000 followers. A smaller model scores the rest.
- Replies to your own posts, and replies in a thread you started, aren't scored.

What happens to the score:
- **It only goes down.** Each reply's score is stored, and a new score is saved
  only if it's lower than the one already there.
- **A 0 adds a label.** A reply that scores 0 gets the label
  `RiskyHighVizReply`. The exceptions are writers with a high reputation score
  and accounts with a grey checkmark.
- **That label cuts notifications.** X drops a labeled reply from mention, reply
  and media-tag notifications for anyone who doesn't follow its writer. So the
  person you answered may never hear about your reply, unless they follow you.
- **Neither the label nor the score is on Under the Hood's list.**

The published code doesn't show how the score sets a reply's place among a
post's replies. Nothing in it reads the score back.

## What Twisitter adds

Neither the report nor the code tells you what happened to one particular reply.
Twisitter looks. It reads the post as a second account of yours, and tells you
whether your reply is:
- listed for others;
- filed under "Show probable spam";
- left out of the list;
- or hidden by the post's author.

## Check it yourself

X's code is public at
[github.com/xai-org/x-algorithm](https://github.com/xai-org/x-algorithm). These
links point to the version this page describes, commit 30647a8 of November 14,
2026, since the code can change.

**Under the Hood:**
- [Post labels](https://github.com/xai-org/x-algorithm/blob/30647a85a20cbdd114169beb9973680c4dc4f401/under-the-hood/strato/lib/underTheHoodLabels.strato#L3-L111)
  and
  [account labels](https://github.com/xai-org/x-algorithm/blob/30647a85a20cbdd114169beb9973680c4dc4f401/under-the-hood/strato/lib/underTheHoodLabels.strato#L119-L184).
- [Who can get a report](https://github.com/xai-org/x-algorithm/blob/30647a85a20cbdd114169beb9973680c4dc4f401/under-the-hood/strato/columns/underTheHoodReport.User.strato#L18-L19).

**The reply score:**
- [Grok scores replies from 0 to 3](https://github.com/xai-org/x-algorithm/blob/30647a85a20cbdd114169beb9973680c4dc4f401/grox/flows/reply_spam/classifier_reply_ranking.py#L30-L45)
  ([the 0 to 3 check](https://github.com/xai-org/x-algorithm/blob/30647a85a20cbdd114169beb9973680c4dc4f401/grox/flows/reply_spam/classifier_reply_ranking.py#L164-L165)).
- Which replies are scored:
  [the filter](https://github.com/xai-org/x-algorithm/blob/30647a85a20cbdd114169beb9973680c4dc4f401/grox/flows/reply_spam/task_filter.py#L186-L249)
  and
  [the 250,000-follower split](https://github.com/xai-org/x-algorithm/blob/30647a85a20cbdd114169beb9973680c4dc4f401/grox/flows/reply_spam/constants.py#L8-L9).
- [A new score is saved only if it's lower, and a 0 adds the label](https://github.com/xai-org/x-algorithm/blob/30647a85a20cbdd114169beb9973680c4dc4f401/grox/flows/reply_spam/task_write.py#L124-L141).
  The exceptions are
  [here](https://github.com/xai-org/x-algorithm/blob/30647a85a20cbdd114169beb9973680c4dc4f401/grox/flows/reply_spam/task_write.py#L39-L80).
- The smaller model's scores go through
  [the same step](https://github.com/xai-org/x-algorithm/blob/30647a85a20cbdd114169beb9973680c4dc4f401/grox/flows/reply_spam/plan_spam_comment.py#L10-L25).

**Notifications:**
- [The notifications rule](https://github.com/xai-org/x-algorithm/blob/30647a85a20cbdd114169beb9973680c4dc4f401/visibility-filtering/rules/tweet_rules.rs#L1029-L1034),
  and
  [where it applies](https://github.com/xai-org/x-algorithm/blob/30647a85a20cbdd114169beb9973680c4dc4f401/visibility-filtering/rules/levels.rs#L241-L276):
  mention, reply and media-tag notifications.
