# 0010: Spanish review lives in the database; the YAML stays the source of truth

- **Context.** Spec 16.3: every Spanish line ships unreviewed; a bilingual reviewer at the store approves or edits
  each line side by side with the English; lines with numbers, fees or conditions also need the compliance reviewer;
  release 1 cannot go live until every line in the 20 scenarios is reviewed. Spec 7.4 says the in-app editor writes
  the same YAML. A running web server cannot commit to the repository, and published content is immutable
  (decision 0007).
- **Decision.** The app records each review decision in `spanish_reviews`, with the English and Spanish text it was
  made against. A review whose texts no longer match the current content is stale and does not count. An edited line
  must pass the same compliance checks as authored content before it is saved, and any line with a number also needs
  the compliance reviewer. `pnpm content:apply-reviews` writes approved edits into the YAML and sets
  `spanish_reviewed: true` on a file only when every one of its lines is approved; that change goes through the normal
  commit, CI and publish path. Reviewers are users with the `content_editor` role.
- **Consequence.** No content reaches reps without CI, while the reviewer works in the app on a laptop. Audio preview
  of the synthesized Spanish (spec 16.3 item 2) waits on the speech provider.
